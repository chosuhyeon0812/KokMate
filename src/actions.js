/* 상태를 바꾸는 동작들. 입력 검증과 안내 메시지(toast)는 화면 쪽에서 처리한다. */
import { update } from './store';
import { uid, todayStr } from './lib/utils';
import { playerById, deriveGameType } from './lib/selectors';
import { generateRecommendations, scoreSplit } from './lib/matching';

function startGameIn(d, court, teamA, teamB, gameType) {
  d.games.push({
    id: uid('g'), round: d.games.length + 1, court, gameType: gameType || deriveGameType(d, teamA, teamB),
    teamA, teamB, scoreA: null, scoreB: null, winner: null,
    startTime: Date.now(), endTime: null, memo: '', date: todayStr(), status: 'progress',
  });
  d.pendingRecs = d.pendingRecs.filter(r => r.court !== court);
}

function clearSessionData(d) {
  d.players.forEach(p => { p.totalGames = 0; p.wins = 0; p.losses = 0; p.resting = false; p.shuttleDone = false; p.shuttleNote = ''; p.restSince = p.active ? Date.now() : null; });
  d.games = [];
  d.pendingRecs = [];
  d.waitingMatches = [];
  d.lastShortfall = '';
}

/* ---------- 설정 / 추천 ---------- */

export function saveSettings(courtCount) {
  update(d => { d.settings.courtCount = Math.max(1, Number(courtCount) || 1); });
}

export function recommend() {
  update(d => {
    const { assignments, shortfall } = generateRecommendations(d);
    d.pendingRecs = assignments;
    d.lastShortfall = shortfall;
  });
}

export function updateRec(idx, selection) {
  update(d => {
    const r = d.pendingRecs[idx];
    r.teamA = selection.slice(0, 2);
    r.teamB = selection.slice(2, 4);
    r.score = scoreSplit(d, r.teamA, r.teamB);
    r.gameType = deriveGameType(d, r.teamA, r.teamB);
  });
}

export function startRecommendation(idx) {
  update(d => {
    const r = d.pendingRecs[idx];
    startGameIn(d, r.court, r.teamA, r.teamB, r.gameType);
  });
}

/* ---------- 경기 ---------- */

export function startGame(court, selection) {
  update(d => startGameIn(d, court, selection.slice(0, 2), selection.slice(2, 4)));
}

// 끝난 경기 결과를 참가자 경기 수/승패에 반영(sign=1)하거나 취소(sign=-1)한다.
function applyResult(d, g, sign) {
  const bump = (ids, key) => ids.forEach(id => { const p = playerById(d, id); if (p) p[key] = Math.max(0, p[key] + sign); });
  bump(g.teamA.concat(g.teamB), 'totalGames');
  if (g.winner) {
    bump(g.winner === 'A' ? g.teamA : g.teamB, 'wins');
    bump(g.winner === 'A' ? g.teamB : g.teamA, 'losses');
  }
}

export function endGame(gameId, { scoreA, scoreB, winner, memo }) {
  update(d => {
    const g = d.games.find(x => x.id === gameId);
    Object.assign(g, { scoreA, scoreB, winner, memo, endTime: Date.now(), status: 'done' });
    applyResult(d, g, 1);
    g.teamA.concat(g.teamB).forEach(id => { const p = playerById(d, id); if (p) p.restSince = g.endTime; });
  });
}

// 경기 종료 되돌리기: 결과를 취소하고 다시 진행 중 상태로
export function undoEndGame(gameId) {
  update(d => {
    const g = d.games.find(x => x.id === gameId);
    applyResult(d, g, -1);
    Object.assign(g, { scoreA: null, scoreB: null, winner: null, memo: '', endTime: null, status: 'progress' });
  });
}

export function editGameResult(gameId, { scoreA, scoreB, winner, memo }) {
  update(d => {
    const g = d.games.find(x => x.id === gameId);
    applyResult(d, g, -1);
    Object.assign(g, { scoreA, scoreB, winner, memo });
    applyResult(d, g, 1);
  });
}

export function deleteGame(gameId) {
  update(d => {
    const g = d.games.find(x => x.id === gameId);
    if (g.status === 'done') applyResult(d, g, -1);
    d.games = d.games.filter(x => x.id !== gameId);
  });
}

export function addWaitingMatch(selection) {
  update(d => {
    const teamA = selection.slice(0, 2), teamB = selection.slice(2, 4);
    d.waitingMatches.push({ id: uid('w'), teamA, teamB, gameType: deriveGameType(d, teamA, teamB) });
  });
}

export function updateWaitingMatch(id, selection) {
  update(d => {
    const w = d.waitingMatches.find(x => x.id === id);
    w.teamA = selection.slice(0, 2);
    w.teamB = selection.slice(2, 4);
    w.gameType = deriveGameType(d, w.teamA, w.teamB);
  });
}

export function startWaitingMatch(id, court) {
  update(d => {
    const w = d.waitingMatches.find(x => x.id === id);
    startGameIn(d, court, w.teamA, w.teamB, w.gameType);
    d.waitingMatches = d.waitingMatches.filter(x => x.id !== id);
  });
}

export function deleteWaitingMatch(id) {
  update(d => { d.waitingMatches = d.waitingMatches.filter(x => x.id !== id); });
}

/* ---------- 참가자 ---------- */

export function savePlayer(id, fields) {
  update(d => {
    if (id) Object.assign(playerById(d, id), fields);
    else d.players.push({ id: uid('p'), ...fields, active: true, resting: false, totalGames: 0, wins: 0, losses: 0, shuttleDone: false, restSince: Date.now() });
  });
}

export function deletePlayer(id) {
  update(d => {
    d.players = d.players.filter(p => p.id !== id);
    d.pendingRecs = d.pendingRecs.filter(r => !r.teamA.concat(r.teamB).includes(id));
  });
}

export function toggleRest(id) {
  update(d => { const p = playerById(d, id); p.resting = !p.resting; p.restSince = Date.now(); });
}

export function toggleActive(id) {
  update(d => {
    const p = playerById(d, id);
    p.active = !p.active;
    if (!p.active) p.resting = false;
    else p.restSince = Date.now();
  });
}

export function saveAttendance(checkedIds) {
  update(d => {
    d.players.forEach(p => {
      const wasActive = p.active;
      p.active = checkedIds.has(p.id);
      if (p.active && !wasActive) p.restSince = Date.now(); // 오늘 새로 합류 -> 지금부터 대기 시간 카운트
      if (!p.active) p.resting = false;
    });
  });
}

/* ---------- 콕 ---------- */

export function toggleShuttle(id) {
  update(d => { const p = playerById(d, id); p.shuttleDone = !p.shuttleDone; });
}

// 콕 비고 (예: 게스트라 현금으로 냄, 콕이 없어 계좌 입금)
export function setShuttleNote(id, note) {
  update(d => { playerById(d, id).shuttleNote = note; });
}

export function resetShuttles() {
  update(d => { d.players.forEach(p => { p.shuttleDone = false; p.shuttleNote = ''; }); });
}

/* ---------- 모임 / 기록 ---------- */

export function resetToday() {
  update(clearSessionData);
}

export function todaysDoneGames(state) {
  const today = todayStr();
  return state.games.filter(g => g.date === today && g.status === 'done');
}

export function endSession() {
  update(d => {
    const todaysGames = todaysDoneGames(d);
    d.sessionHistory.unshift({
      id: uid('s'), date: todayStr(), endedAt: Date.now(),
      totalGames: todaysGames.length,
      usedCourts: new Set(todaysGames.map(g => g.court)).size,
      participants: d.players
        .filter(p => p.totalGames > 0)
        .map(p => ({ name: p.name, gender: p.gender, level: p.level, totalGames: p.totalGames, wins: p.wins, losses: p.losses })),
      memos: todaysGames.filter(g => g.memo).map(g => `${g.court}번 코트 · ${g.memo}`),
    });
    clearSessionData(d);
  });
}

export function deleteSessionRecord(id) {
  update(d => { d.sessionHistory = d.sessionHistory.filter(s => s.id !== id); });
}
