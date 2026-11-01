/* 상태(state)에서 필요한 값을 계산하는 함수들. 모두 state를 직접 받아서 순수하게 동작한다. */
import { durationStr, MAX_WAITING_PER_PLAYER } from './utils';

export function playerById(state, id) {
  return state.players.find(p => p.id === id);
}

export function playerName(state, id) {
  const p = playerById(state, id);
  if (p) return p.name;
  return state.formerNames?.[id] || '(삭제됨)';
}

export function deriveGameType(state, teamA, teamB) {
  if (teamA.length + teamB.length < 4) return '외부 인원 포함';
  const genders = teamA.concat(teamB).map(id => playerById(state, id)?.gender);
  const mCount = genders.filter(g => g === 'M').length;
  const fCount = genders.filter(g => g === 'F').length;
  if (mCount === 4) return '남자복식';
  if (fCount === 4) return '여자복식';
  if (mCount === 2 && fCount === 2) return '혼합복식';
  return '자유복식';
}

export function eligiblePlayers(state) {
  return state.players.filter(p => p.active && !p.resting);
}

export function playingPlayerIds(state) {
  const ids = new Set();
  state.games.forEach(g => {
    if (g.status !== 'progress') return;
    g.teamA.forEach(id => ids.add(id));
    g.teamB.forEach(id => ids.add(id));
  });
  return ids;
}

export function waitingPlayerIds(state, exceptId) {
  const ids = new Set();
  state.waitingMatches.forEach(w => {
    if (w.id === exceptId) return;
    w.teamA.forEach(id => ids.add(id));
    w.teamB.forEach(id => ids.add(id));
  });
  return ids;
}

export function availablePlayers(state) {
  const playing = playingPlayerIds(state);
  const waiting = waitingPlayerIds(state);
  return eligiblePlayers(state).filter(p => !playing.has(p.id) && !waiting.has(p.id));
}

export function activeGameOnCourt(state, court) {
  return state.games.find(g => g.court === court && g.status === 'progress');
}

export function freeCourts(state) {
  return state.settings.courts.filter(c => !activeGameOnCourt(state, c));
}

export function waitingDuration(p, now = Date.now()) {
  // 마지막으로 경기를 마쳤거나(또는 대기/휴식 상태로 바뀐) 시점부터 현재까지 얼마나 쉬고 있는지
  if (!p.restSince) return '';
  return durationStr(p.restSince, now);
}

export const LONG_REST_MS = 20 * 60000; // 이만큼 쉬었으면 쉰 시간을 강조색으로

// 좁은 칸에 들어갈 짧은 쉰 시간 (1시간이 넘으면 분은 생략)
export function shortWait(p) {
  if (!p.restSince) return '';
  const mins = Math.max(0, Math.round((Date.now() - p.restSince) / 60000));
  return mins < 60 ? `${mins}분` : `${Math.floor(mins / 60)}시간`;
}

// 카드에 쓰는 쉰 시간: 막 들어왔거나 1분이 안 됐으면 '00분', 아니면 'n분'(1시간이 넘으면 'n시간').
export function waitLabel(p) {
  const w = p.restSince ? shortWait(p) : '';
  return !w || w === '0분' ? '00분' : w;
}

export function fairnessCompare(a, b) {
  // 매칭 알고리즘과 같은 우선순위: 경기 수가 적을수록, 그 다음 오래 쉰 사람일수록 앞에 오도록
  if (a.totalGames !== b.totalGames) return a.totalGames - b.totalGames;
  const aRest = a.restSince || Infinity, bRest = b.restSince || Infinity;
  if (aRest !== bRest) return aRest - bRest;
  return a.name.localeCompare(b.name, 'ko');
}

// 선수별로 몇 개의 대기 코트에 들어가 있는지. (exceptId 대기 코트는 빼고 센다)
export function waitingCounts(state, exceptId) {
  const counts = new Map();
  state.waitingMatches.forEach(w => {
    if (w.id === exceptId) return;
    w.teamA.concat(w.teamB).forEach(id => counts.set(id, (counts.get(id) || 0) + 1));
  });
  return counts;
}

export function waitingModalPlayers(state, exceptId) {
  // 대기 코트는 다음 경기를 미리 준비하는 용도라, 지금 경기 중인 선수도 선택할 수 있게 한다.
  // 한 사람은 대기 코트 MAX_WAITING_PER_PLAYER 곳까지 들어갈 수 있다. (수정 중인 대기 코트 자신은 빼고 계산)
  const counts = waitingCounts(state, exceptId);
  return eligiblePlayers(state).filter(p => (counts.get(p.id) || 0) < MAX_WAITING_PER_PLAYER);
}

