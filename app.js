/* ==========================================================
   배드민턴 경기 매칭 및 경기 관리 앱
   - 순수 클라이언트(로컬스토리지) 기반, 빌드 도구 불필요
   ========================================================== */

const STORAGE_KEY = 'bm-matcher-state-v1';
const LEVEL_ORDER = { 'A': 5, 'B': 4, 'C': 3, 'D': 2, 'E': 1, 'F': 0 };
const LEVEL_OPTIONS = ['A', 'B', 'C', 'D', 'E', 'F'];

let state = loadState();

function defaultState() {
  return {
    players: [],
    settings: { courtCount: 4 },
    games: [],
    pendingRecs: [], // [{court, teamA:[ids], teamB:[ids], score:{levelDiff,partnerRepeat,opponentRepeat}}]
    waitingMatches: [], // [{id, teamA:[ids], teamB:[ids], gameType}] - 코트 미배정, 다음 경기 대기용
    sessionHistory: [], // [{id, date, endedAt, totalGames, usedCourts, participants:[{name,gender,level,totalGames,wins,losses}], memos:[...]}]
    lastShortfall: '',
  };
}

function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return defaultState();
    const parsed = JSON.parse(raw);
    const merged = Object.assign(defaultState(), parsed);
    // 기존 저장 데이터에는 restSince가 없을 수 있으므로, 대기 중인데 기록이 없으면 지금부터 카운트 시작
    merged.players.forEach(p => { if (p.active && !p.resting && !p.restSince) p.restSince = Date.now(); });
    return merged;
  } catch (e) {
    return defaultState();
  }
}

function saveState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function uid(prefix) {
  return prefix + '_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

function todayStr(ts) {
  const d = ts ? new Date(ts) : new Date();
  const pad = n => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function timeStr(ts) {
  const d = new Date(ts);
  const pad = n => String(n).padStart(2, '0');
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function durationStr(startTs, endTs) {
  const mins = Math.max(0, Math.round((endTs - startTs) / 60000));
  if (mins < 60) return `${mins}분`;
  return `${Math.floor(mins / 60)}시간 ${mins % 60}분`;
}

function playerById(id) {
  return state.players.find(p => p.id === id);
}

function playerName(id) {
  const p = playerById(id);
  return p ? p.name : '(삭제됨)';
}

function sortByName(players) {
  return players.slice().sort((a, b) => a.name.localeCompare(b.name, 'ko'));
}

function deriveGameType(teamA, teamB) {
  const genders = teamA.concat(teamB).map(id => playerById(id).gender);
  const mCount = genders.filter(g => g === 'M').length;
  const fCount = genders.filter(g => g === 'F').length;
  if (mCount === 4) return '남자복식';
  if (fCount === 4) return '여자복식';
  if (mCount === 2 && fCount === 2) return '혼합복식';
  return '자유복식';
}

function shuttleQuota(p) {
  return p.gender === 'M' ? 3 : 2;
}

function toast(msg) {
  const el = document.getElementById('toast');
  el.textContent = msg;
  el.classList.remove('hidden');
  clearTimeout(toast._t);
  toast._t = setTimeout(() => el.classList.add('hidden'), 2200);
}

/* ================= 매칭 알고리즘 ================= */

function combinations(arr, k) {
  const results = [];
  function helper(start, combo) {
    if (combo.length === k) { results.push(combo.slice()); return; }
    for (let i = start; i < arr.length; i++) {
      combo.push(arr[i]);
      helper(i + 1, combo);
      combo.pop();
    }
  }
  helper(0, []);
  return results;
}

function teamSplits(fourGeneric) {
  // 4명을 2대2로 나누는 3가지 방법
  const [a, b, c, d] = fourGeneric;
  return [
    { teamA: [a, b], teamB: [c, d] },
    { teamA: [a, c], teamB: [b, d] },
    { teamA: [a, d], teamB: [b, c] },
  ];
}

function mixedSplits(males, females) {
  // 혼합복식: 팀은 반드시 남1+여1
  const [m1, m2] = males;
  const [f1, f2] = females;
  return [
    { teamA: [m1, f1], teamB: [m2, f2] },
    { teamA: [m1, f2], teamB: [m2, f1] },
  ];
}

function avgLevel(ids) {
  const sum = ids.reduce((s, id) => s + LEVEL_ORDER[playerById(id).level], 0);
  return sum / ids.length;
}

function pastPartnerCount(id1, id2) {
  let c = 0;
  for (const g of state.games) {
    if (g.status !== 'done') continue;
    if ((g.teamA.includes(id1) && g.teamA.includes(id2)) ||
        (g.teamB.includes(id1) && g.teamB.includes(id2))) c++;
  }
  return c;
}

function pastOpponentCount(id1, id2) {
  let c = 0;
  for (const g of state.games) {
    if (g.status !== 'done') continue;
    const aHas1 = g.teamA.includes(id1), bHas1 = g.teamB.includes(id1);
    const aHas2 = g.teamA.includes(id2), bHas2 = g.teamB.includes(id2);
    if ((aHas1 && bHas2) || (bHas1 && aHas2)) c++;
  }
  return c;
}

function scoreSplit(teamA, teamB) {
  const levelDiff = Math.abs(avgLevel(teamA) - avgLevel(teamB));
  let partnerRepeat = pastPartnerCount(teamA[0], teamA[1]) + pastPartnerCount(teamB[0], teamB[1]);
  let opponentRepeat = 0;
  for (const x of teamA) for (const y of teamB) opponentRepeat += pastOpponentCount(x, y);
  return { levelDiff, partnerRepeat, opponentRepeat };
}

function betterScore(s1, s2) {
  // 우선순위: 등급차이 > 파트너중복 > 상대중복 (경기횟수균형은 후보풀 선정단계에서 이미 반영)
  if (s1.levelDiff !== s2.levelDiff) return s1.levelDiff < s2.levelDiff;
  if (s1.partnerRepeat !== s2.partnerRepeat) return s1.partnerRepeat < s2.partnerRepeat;
  return s1.opponentRepeat < s2.opponentRepeat;
}

function starsFor(score) {
  // 점수가 낮을수록(반복/차이 적을수록) 좋은 매칭 -> 별점 환산
  const gameBalance = 5; // 후보풀 선정 단계에서 이미 최우선 보장
  const level = score.levelDiff <= 0.5 ? 5 : score.levelDiff <= 1 ? 4 : score.levelDiff <= 1.5 ? 3 : score.levelDiff <= 2 ? 2 : 1;
  const partner = score.partnerRepeat === 0 ? 5 : score.partnerRepeat === 1 ? 3 : 1;
  const opponent = score.opponentRepeat === 0 ? 5 : score.opponentRepeat <= 1 ? 4 : score.opponentRepeat <= 2 ? 3 : 2;
  return { gameBalance, level, partner, opponent };
}

function starStr(n) {
  return '★'.repeat(n) + '☆'.repeat(5 - n);
}

function eligiblePlayers() {
  return state.players.filter(p => p.active && !p.resting);
}

function playingPlayerIds() {
  const ids = new Set();
  state.games.forEach(g => {
    if (g.status !== 'progress') return;
    g.teamA.forEach(id => ids.add(id));
    g.teamB.forEach(id => ids.add(id));
  });
  return ids;
}

function waitingPlayerIds() {
  const ids = new Set();
  state.waitingMatches.forEach(w => {
    w.teamA.forEach(id => ids.add(id));
    w.teamB.forEach(id => ids.add(id));
  });
  return ids;
}

function availablePlayers() {
  const playing = playingPlayerIds();
  const waiting = waitingPlayerIds();
  return eligiblePlayers().filter(p => !playing.has(p.id) && !waiting.has(p.id));
}

function pickTierCandidates(pool, neededCount) {
  // 경기 수가 적은 사람을 우선 후보로. 부족하면 tier(허용폭)를 넓혀감.
  if (pool.length === 0) return [];
  const sorted = pool.slice().sort((a, b) => a.totalGames - b.totalGames || Math.random() - 0.5);
  let slack = 0;
  const minGames = sorted[0].totalGames;
  while (true) {
    const tier = sorted.filter(p => p.totalGames <= minGames + slack);
    if (tier.length >= neededCount || tier.length === sorted.length) {
      return tier.slice(0, Math.max(neededCount + 4, tier.length > 10 ? 10 : tier.length));
    }
    slack++;
  }
}

function chooseCourtGameType(remainingMales, remainingFemales) {
  // 종목(남복/여복/혼복)을 사람이 미리 정하지 않고, 남아있는 인원 상황에 맞춰 자동으로 결정한다.
  // 경기 수가 가장 적은 사람들을 최대한 우선 기용할 수 있는 조합을 고른다.
  const byGames = (a, b) => a.totalGames - b.totalGames || Math.random() - 0.5;
  const sortedM = remainingMales.slice().sort(byGames);
  const sortedF = remainingFemales.slice().sort(byGames);
  const sum = arr => arr.reduce((s, p) => s + p.totalGames, 0);

  const candidates = [];
  if (sortedM.length >= 4) candidates.push({ type: '남자복식', cost: sum(sortedM.slice(0, 4)) });
  if (sortedF.length >= 4) candidates.push({ type: '여자복식', cost: sum(sortedF.slice(0, 4)) });
  if (sortedM.length >= 2 && sortedF.length >= 2) candidates.push({ type: '혼합복식', cost: sum(sortedM.slice(0, 2)) + sum(sortedF.slice(0, 2)) });
  if (candidates.length === 0) return null;

  candidates.sort((a, b) => a.cost - b.cost || Math.random() - 0.5);
  return candidates[0].type;
}

function generateRecommendations() {
  const courtCount = state.settings.courtCount;
  const eligible = availablePlayers();

  let remainingMales = eligible.filter(p => p.gender === 'M');
  let remainingFemales = eligible.filter(p => p.gender === 'F');

  const assignments = [];
  let court = 1;
  let shortfall = '';

  for (let i = 0; i < courtCount; i++) {
    const gameType = chooseCourtGameType(remainingMales, remainingFemales);
    if (!gameType) {
      shortfall = `현재 참여 가능 인원으로는 ${assignments.length}개 코트만 구성할 수 있습니다. (요청: ${courtCount}개)`;
      break;
    }

    let best = null;

    if (gameType === '남자복식' || gameType === '여자복식') {
      const pool = gameType === '남자복식' ? remainingMales : remainingFemales;
      const tier = pickTierCandidates(pool, 4);
      const combos = combinations(tier.map(p => p.id), 4);
      for (const combo of combos) {
        for (const split of teamSplits(combo)) {
          const score = scoreSplit(split.teamA, split.teamB);
          if (!best || betterScore(score, best.score)) best = { ...split, score };
        }
      }
      if (best) {
        const used = best.teamA.concat(best.teamB);
        remainingMales = remainingMales.filter(p => !used.includes(p.id));
        remainingFemales = remainingFemales.filter(p => !used.includes(p.id));
      }
    } else {
      const mTier = pickTierCandidates(remainingMales, 2);
      const fTier = pickTierCandidates(remainingFemales, 2);
      const mCombos = combinations(mTier.map(p => p.id), 2);
      const fCombos = combinations(fTier.map(p => p.id), 2);
      for (const mc of mCombos) {
        for (const fc of fCombos) {
          for (const split of mixedSplits(mc, fc)) {
            const score = scoreSplit(split.teamA, split.teamB);
            if (!best || betterScore(score, best.score)) best = { ...split, score };
          }
        }
      }
      if (best) {
        const used = best.teamA.concat(best.teamB);
        remainingMales = remainingMales.filter(p => !used.includes(p.id));
        remainingFemales = remainingFemales.filter(p => !used.includes(p.id));
      }
    }

    if (best) {
      assignments.push({ court: court++, teamA: best.teamA, teamB: best.teamB, score: best.score, gameType });
    } else {
      break;
    }
  }

  state.pendingRecs = assignments;
  state.lastShortfall = shortfall;
  saveState();
}

/* ================= 코트 헬퍼 ================= */

function activeGameOnCourt(court) {
  return state.games.find(g => g.court === court && g.status === 'progress');
}

function occupiedCourts() {
  return new Set(state.games.filter(g => g.status === 'progress').map(g => g.court));
}

/* ================= 렌더링 ================= */

const views = { home: renderHome, players: renderPlayers, courts: renderCourts, shuttles: renderShuttles, history: renderHistory, stats: renderStats, help: renderHelp };
let currentView = 'home';
let playersFilter = { gender: '', level: '', active: '' };

function switchView(name) {
  currentView = name;
  document.querySelectorAll('.tab-btn').forEach(b => b.classList.toggle('active', b.dataset.view === name));
  render();
}

function render() {
  const app = document.getElementById('app');
  app.innerHTML = views[currentView]();
  document.getElementById('todayDate').textContent = new Date().toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric', weekday: 'short' });
}

function renderHome() {
  const busy = occupiedCourts();
  const progressGames = state.games.filter(g => g.status === 'progress');

  let html = `
  <div class="card">
    <div class="section-row"><h2 class="mb0">👋 오늘 모임</h2></div>
    <p class="muted" style="margin:-6px 0 12px;font-size:.82rem">전체 회원 중 오늘 참석하는 사람만 골라두면 매칭이 그 사람들 안에서만 이뤄집니다. 모임이 끝나면 기록을 저장하고 초기화하세요.</p>
    <div class="row-actions">
      <button class="btn btn-primary btn-sm" data-action="openAttendance">오늘 참석자 선택</button>
      <button class="btn btn-outline btn-sm" data-action="endSession">모임 종료 (저장 후 초기화)</button>
    </div>
  </div>

  <div class="card">
    <h2>⚙️ 코트 설정</h2>
    <div class="settings-grid">
      <div class="field">
        <label>코트 수</label>
        <input type="number" id="courtCountInput" min="1" max="20" value="${state.settings.courtCount}">
      </div>
      <button class="btn btn-ghost" data-action="saveSettings">설정 저장</button>
    </div>
    <div class="muted mt8" style="font-size:.76rem">남복 / 여복 / 혼복 종목은 그때그때 참여 인원 상황에 맞춰 앱이 자동으로 정합니다.</div>
  </div>

  <div class="card">
    <div class="section-row">
      <h2 class="mb0">🟢 진행 중인 경기</h2>
    </div>
    ${progressGames.length === 0 ? `<div class="empty-hint">진행 중인 경기가 없습니다.</div>` :
      `<div class="court-grid">${progressGames.map(g => renderLiveCourtCard(g)).join('')}</div>`}
  </div>

  <div class="card">
    <div class="section-row">
      <h2 class="mb0">🛠 경기 만들기</h2>
    </div>
    <p class="muted" style="margin:-6px 0 12px;font-size:.82rem">기본적으로 운영진이 직접 코트별 팀을 구성합니다.</p>
    <button class="btn btn-primary btn-block" data-action="openManualMatch">직접 경기 만들기</button>
    <div class="card-actions">
      <button class="btn btn-outline btn-sm" data-action="openRestManager">휴식 관리</button>
    </div>
  </div>

  <div class="card">
    <div class="section-row">
      <h2 class="mb0">🎯 자동 매칭 추천 <span class="muted" style="font-size:.72rem;font-weight:500">(선택 기능)</span></h2>
      <button class="btn btn-outline btn-sm" data-action="recommend">추천 받기</button>
    </div>
    <p class="muted" style="margin:-6px 0 12px;font-size:.82rem">직접 짜기 번거로울 때, 참고할 조합을 추가로 추천해드립니다.</p>
    ${state.lastShortfall ? `<div class="empty-hint" style="border-color:var(--danger);background:var(--danger-pale);color:var(--danger);margin-bottom:10px">${state.lastShortfall}</div>` : ''}
    ${state.pendingRecs.length === 0 ? `<div class="empty-hint">‘추천 받기’ 버튼을 누르면 추천 조합이 생성됩니다.</div>` :
      state.pendingRecs.map((r, idx) => renderRecCard(r, idx)).join('')}
  </div>
  `;
  return html;
}

function renderLiveCourtCard(g) {
  return `
  <div class="court-card playing">
    <div class="court-title">
      <span>${g.court}번 코트</span>
      <span class="status-dot live"><span class="dot"></span>진행 중</span>
    </div>
    <div class="team-line">
      <span class="team-name">${g.teamA.map(playerName).join(' + ')}</span>
      <span class="vs">VS</span>
      <span class="team-name">${g.teamB.map(playerName).join(' + ')}</span>
    </div>
    <div class="muted center" style="font-size:.75rem">시작 ${timeStr(g.startTime)} · ${g.gameType}</div>
    <div class="card-actions">
      <button class="btn btn-accent btn-sm btn-block" data-action="endGame" data-id="${g.id}">경기 종료 / 점수 입력</button>
    </div>
  </div>`;
}

function renderRecCard(r, idx) {
  const st = starsFor(r.score);
  const court = r.court;
  return `
  <div class="rec-card">
    <div class="section-row" style="margin-bottom:6px">
      <strong style="color:var(--accent-dark)">추천 · ${court}번 코트 · ${r.gameType}</strong>
      <div class="row-actions">
        <button class="btn btn-outline btn-sm" data-action="editRec" data-idx="${idx}">수정</button>
        <button class="btn btn-primary btn-sm" data-action="startRec" data-idx="${idx}">이 조합으로 경기 시작</button>
      </div>
    </div>
    <div class="team-line">
      <span class="team-name">${r.teamA.map(playerNameWithWait).join(' + ')}</span>
      <span class="vs">VS</span>
      <span class="team-name">${r.teamB.map(playerNameWithWait).join(' + ')}</span>
    </div>
    <div class="rec-score">
      추천 기준 · 경기수균형 ${starStr(5)} · 등급균형 ${starStr(st.level)} · 파트너중복방지 ${starStr(st.partner)} · 상대중복방지 ${starStr(st.opponent)}
    </div>
  </div>`;
}

function renderCourts() {
  const busy = occupiedCourts();
  let cards = '';
  for (let c = 1; c <= state.settings.courtCount; c++) {
    const g = activeGameOnCourt(c);
    if (g) {
      cards += renderLiveCourtCard(g);
    } else {
      cards += `<div class="court-card empty">
        <div class="court-title"><span>${c}번 코트</span><span class="status-dot" style="color:var(--muted)">⚪ 대기</span></div>
        <div class="muted center" style="padding:10px 0">비어 있음</div>
        <button class="btn btn-primary btn-sm btn-block" data-action="openManualMatch" data-court="${c}">이 코트에서 경기 만들기</button>
      </div>`;
    }
  }
  return `<div class="card">
    <div class="section-row">
      <h2 class="mb0">🏟 코트 현황</h2>
      <button class="btn btn-outline btn-sm" data-action="openRestManager">😴 휴식 관리</button>
    </div>
    <div class="court-grid">${cards}</div>
  </div>
  <div class="card">
    <div class="section-row">
      <h2 class="mb0">🕒 대기 코트</h2>
      <button class="btn btn-outline btn-sm" data-action="openWaitingMatch">대기 코트 추가</button>
    </div>
    <p class="muted" style="margin:-6px 0 12px;font-size:.82rem">코트가 아직 비지 않았어도 다음 경기 멤버를 미리 정해둘 수 있습니다. 코트가 비면 "코트 배정하고 시작"을 누르세요.</p>
    ${state.waitingMatches.length === 0 ? `<div class="empty-hint">대기 중인 다음 경기가 없습니다.</div>` :
      `<div class="court-grid">${state.waitingMatches.map(renderWaitingCard).join('')}</div>`}
  </div>`;
}

function renderWaitingCard(w) {
  const playing = playingPlayerIds();
  const label = id => playing.has(id) ? playerName(id) + ' 🔴' : playerNameWithWait(id);
  const hasPlaying = w.teamA.concat(w.teamB).some(id => playing.has(id));
  return `
  <div class="court-card">
    <div class="court-title"><span>대기 중 · ${w.gameType}</span><span class="status-dot" style="color:var(--accent-dark)">🕒 대기</span></div>
    <div class="team-line">
      <span class="team-name">${w.teamA.map(label).join(' + ')}</span>
      <span class="vs">VS</span>
      <span class="team-name">${w.teamB.map(label).join(' + ')}</span>
    </div>
    ${hasPlaying ? `<div class="muted center" style="font-size:.72rem;margin-top:2px">🔴 = 아직 경기 중인 선수. 끝난 뒤 배정하세요.</div>` : ''}
    <div class="card-actions">
      <button class="btn btn-primary btn-sm" data-action="startWaitingMatch" data-id="${w.id}">코트 배정하고 시작</button>
      <button class="btn btn-danger btn-sm" data-action="deleteWaitingMatch" data-id="${w.id}">삭제</button>
    </div>
  </div>`;
}

function renderShuttles() {
  const players = sortByName(state.players);
  const doneCount = players.filter(p => p.shuttleDone).length;
  const rows = players.map(p => `
    <tr>
      <td>${p.name}</td>
      <td><span class="badge ${p.gender === 'M' ? 'badge-male' : 'badge-female'}">${p.gender === 'M' ? '남' : '여'}</span></td>
      <td>${shuttleQuota(p)}개</td>
      <td>${p.shuttleDone ? '<span class="badge badge-active">제출 완료</span>' : '<span class="badge badge-rest">미제출</span>'}</td>
      <td class="row-actions">
        <button class="btn ${p.shuttleDone ? 'btn-ghost' : 'btn-primary'} btn-sm" data-action="toggleShuttle" data-id="${p.id}">${p.shuttleDone ? '미제출로 변경' : '제출 완료로 변경'}</button>
      </td>
    </tr>`).join('');

  return `
  <div class="card">
    <div class="section-row">
      <h2 class="mb0">🏸 콕 관리</h2>
      <button class="btn btn-outline btn-sm" data-action="resetShuttles">전체 미제출로 초기화</button>
    </div>
    <p class="muted" style="margin:-6px 0 12px;font-size:.82rem">남자는 3개, 여자는 2개씩 콕(셔틀콕)을 받아야 합니다. 받은 사람은 체크해주세요.</p>
    ${players.length === 0 ? `<div class="empty-hint">참가자를 먼저 등록하세요.</div>` : `
    <div class="summary-grid">
      <div class="summary-box"><div class="num">${doneCount} / ${players.length}</div><div class="lbl">제출 완료</div></div>
    </div>
    <div style="overflow-x:auto"><table>
      <thead><tr><th>이름</th><th>성별</th><th>필요 개수</th><th>상태</th><th>관리</th></tr></thead>
      <tbody>${rows}</tbody>
    </table></div>`}
  </div>`;
}

function renderPlayers() {
  const filtered = sortByName(state.players).filter(p =>
    (!playersFilter.gender || p.gender === playersFilter.gender) &&
    (!playersFilter.level || p.level === playersFilter.level) &&
    (!playersFilter.active || (playersFilter.active === 'active' ? p.active : !p.active))
  );
  const filterActive = playersFilter.gender || playersFilter.level || playersFilter.active;

  const rows = filtered.map(p => `
    <tr>
      <td>${p.name}</td>
      <td><span class="badge ${p.gender === 'M' ? 'badge-male' : 'badge-female'}">${p.gender === 'M' ? '남' : '여'}</span></td>
      <td><span class="badge badge-level">${p.level}</span></td>
      <td>${p.totalGames}</td>
      <td>${statusBadge(p)}</td>
      <td class="row-actions">
        <button class="btn btn-outline btn-sm" data-action="editPlayer" data-id="${p.id}">수정</button>
        <button class="btn ${p.resting ? 'btn-primary' : 'btn-ghost'} btn-sm" data-action="toggleRest" data-id="${p.id}">${p.resting ? '휴식 해제' : '휴식'}</button>
        <button class="btn ${p.active ? 'btn-ghost' : 'btn-primary'} btn-sm" data-action="toggleActive" data-id="${p.id}">${p.active ? '당일 제외' : '당일 포함'}</button>
        <button class="btn btn-danger btn-sm" data-action="deletePlayer" data-id="${p.id}">삭제</button>
      </td>
    </tr>`).join('');

  return `
  <div class="card">
    <div class="section-row">
      <h2 class="mb0">👥 참가자 관리 (${filterActive ? `${filtered.length}/${state.players.length}` : state.players.length}명)</h2>
      <div class="row-actions">
        <button class="btn btn-primary btn-sm" data-action="openAddPlayer">참가자 추가</button>
      </div>
    </div>
    ${state.players.length === 0 ? '' : `
    <div class="settings-grid" style="margin-bottom:14px">
      <div class="field">
        <label>성별</label>
        <select data-filter="gender">
          <option value="">전체</option>
          <option value="M" ${playersFilter.gender === 'M' ? 'selected' : ''}>남성</option>
          <option value="F" ${playersFilter.gender === 'F' ? 'selected' : ''}>여성</option>
        </select>
      </div>
      <div class="field">
        <label>등급</label>
        <select data-filter="level">
          <option value="">전체</option>
          ${LEVEL_OPTIONS.map(l => `<option value="${l}" ${playersFilter.level === l ? 'selected' : ''}>${l}</option>`).join('')}
        </select>
      </div>
      <div class="field">
        <label>당일 참석</label>
        <select data-filter="active">
          <option value="">전체</option>
          <option value="active" ${playersFilter.active === 'active' ? 'selected' : ''}>참석(포함)</option>
          <option value="inactive" ${playersFilter.active === 'inactive' ? 'selected' : ''}>제외</option>
        </select>
      </div>
      ${filterActive ? `<button class="btn btn-ghost btn-sm" data-action="clearPlayerFilter">필터 초기화</button>` : ''}
    </div>`}
    ${state.players.length === 0 ? `<div class="empty-hint">등록된 참가자가 없습니다. ‘참가자 추가’로 시작하세요.</div>` :
      filtered.length === 0 ? `<div class="empty-hint">조건에 맞는 참가자가 없습니다.</div>` :
      `<div style="overflow-x:auto"><table>
        <thead><tr><th>이름</th><th>성별</th><th>등급</th><th>경기수</th><th>상태</th><th>관리</th></tr></thead>
        <tbody>${rows}</tbody>
      </table></div>`}
  </div>`;
}

function waitingDuration(p) {
  // 마지막으로 경기를 마쳤거나(또는 대기/휴식 상태로 바뀐) 시점부터 현재까지 얼마나 쉬고 있는지
  if (!p.restSince) return '';
  return durationStr(p.restSince, Date.now());
}

function playerNameWithWait(id) {
  const p = playerById(id);
  if (!p) return playerName(id);
  const dur = !playingPlayerIds().has(id) ? waitingDuration(p) : '';
  return dur ? `${p.name} (${dur})` : p.name;
}

function statusBadge(p) {
  if (!p.active) return `<span class="badge badge-rest">당일 제외</span>`;
  if (p.resting) {
    const dur = waitingDuration(p);
    return `<span class="badge badge-rest">휴식${dur ? ' · ' + dur : ''}</span>`;
  }
  const playing = state.games.some(g => g.status === 'progress' && (g.teamA.includes(p.id) || g.teamB.includes(p.id)));
  if (playing) return `<span class="badge badge-playing">경기 중</span>`;
  const dur = waitingDuration(p);
  return `<span class="badge badge-active">대기${dur ? ' · ' + dur : ''}</span>`;
}

function renderHistory() {
  const today = todayStr();
  const todays = state.games.filter(g => g.date === today && g.status === 'done').sort((a, b) => b.endTime - a.endTime);
  const totalGames = state.games.filter(g => g.date === today && g.status === 'done').length;
  const usedCourts = new Set(state.games.filter(g => g.date === today).map(g => g.court)).size;
  const players = new Set();
  todays.forEach(g => g.teamA.concat(g.teamB).forEach(id => players.add(id)));
  const memos = todays.filter(g => g.memo).map(g => `코트${g.court} · ${g.memo}`);

  return `
  <div class="card">
    <h2>📅 오늘의 기록</h2>
    <div class="summary-grid">
      <div class="summary-box"><div class="num">${totalGames}</div><div class="lbl">총 경기 수</div></div>
      <div class="summary-box"><div class="num">${usedCourts}</div><div class="lbl">사용 코트</div></div>
      <div class="summary-box"><div class="num">${players.size}</div><div class="lbl">참가 인원</div></div>
    </div>
    ${memos.length ? `<div class="history-memo">${memos.map(m => `• ${m}`).join('<br>')}</div>` : ''}
  </div>
  <div class="card">
    <h2>📋 경기 기록</h2>
    ${todays.length === 0 ? `<div class="empty-hint">오늘 종료된 경기가 없습니다.</div>` :
      todays.map(g => `
      <div class="history-item">
        <div class="history-head"><span>${g.court}번 코트 · ${g.gameType}</span><span>${timeStr(g.startTime)} ~ ${timeStr(g.endTime)} (${durationStr(g.startTime, g.endTime)})</span></div>
        <div class="team-line">
          <span class="team-name ${g.winner === 'A' ? 'badge-win' : ''}">${g.teamA.map(playerName).join(' + ')}</span>
          <span class="history-score">${g.winner ? `${g.scoreA} : ${g.scoreB}` : 'VS'}</span>
          <span class="team-name ${g.winner === 'B' ? 'badge-win' : ''}">${g.teamB.map(playerName).join(' + ')}</span>
        </div>
        ${g.winner ? `<div class="center muted" style="font-size:.75rem;margin-top:4px">승리 · ${(g.winner === 'A' ? g.teamA : g.teamB).map(playerName).join(', ')}</div>` :
          `<div class="center muted" style="font-size:.75rem;margin-top:4px">점수 미입력</div>`}
        ${g.memo ? `<div class="history-memo">${g.memo}</div>` : ''}
      </div>`).join('')}
  </div>
  ${renderSessionHistoryCard()}`;
}

function renderSessionHistoryCard() {
  if (state.sessionHistory.length === 0) {
    return `
    <div class="card">
      <h2>🗓 지난 모임 기록</h2>
      <div class="empty-hint">아직 저장된 모임이 없습니다. 모임이 끝나면 "홈"에서 "모임 종료"를 눌러 저장하세요.</div>
    </div>`;
  }

  const items = state.sessionHistory.map(s => `
    <div class="history-item">
      <div class="history-head"><span>${s.date}</span><span>${timeStr(s.endedAt)} 종료</span></div>
      <div class="summary-grid" style="margin:8px 0">
        <div class="summary-box"><div class="num">${s.totalGames}</div><div class="lbl">총 경기 수</div></div>
        <div class="summary-box"><div class="num">${s.usedCourts}</div><div class="lbl">사용 코트</div></div>
        <div class="summary-box"><div class="num">${s.participants.length}</div><div class="lbl">참가 인원</div></div>
      </div>
      <details>
        <summary style="cursor:pointer;font-size:.82rem;color:var(--primary)">참가자별 경기 수 보기</summary>
        <div style="overflow-x:auto;margin-top:8px"><table>
          <thead><tr><th>이름</th><th>경기수</th><th>승</th><th>패</th></tr></thead>
          <tbody>${s.participants.slice().sort((a, b) => b.totalGames - a.totalGames).map(p => `<tr><td>${p.name}</td><td>${p.totalGames}</td><td>${p.wins}</td><td>${p.losses}</td></tr>`).join('')}</tbody>
        </table></div>
      </details>
      ${s.memos.length ? `<div class="history-memo">${s.memos.map(m => `• ${m}`).join('<br>')}</div>` : ''}
      <div class="card-actions"><button class="btn btn-danger btn-sm" data-action="deleteSessionRecord" data-id="${s.id}">이 기록 삭제</button></div>
    </div>`).join('');

  return `<div class="card"><h2>🗓 지난 모임 기록</h2>${items}</div>`;
}

function renderStats() {
  const sorted = state.players.slice().sort((a, b) => a.totalGames - b.totalGames);
  const minGames = sorted.length ? sorted[0].totalGames : 0;
  const rows = sorted.map((p, i) => `
    <tr style="${p.totalGames === minGames ? 'background:var(--primary-pale)' : ''}">
      <td>${i + 1}</td>
      <td>${p.name}</td>
      <td class="${p.totalGames === minGames ? 'rank-1' : ''}">${p.totalGames}</td>
      <td>${p.wins}</td>
      <td>${p.losses}</td>
      <td>${statusBadge(p)}</td>
    </tr>`).join('');

  return `
  <div class="card">
    <div class="section-row"><h2 class="mb0">📊 참가자 통계</h2>
      <button class="btn btn-outline btn-sm" data-action="resetToday">오늘 기록 초기화</button>
    </div>
    ${state.players.length === 0 ? `<div class="empty-hint">참가자를 먼저 등록하세요.</div>` :
      `<div style="overflow-x:auto"><table>
        <thead><tr><th>순위</th><th>이름</th><th>경기수</th><th>승</th><th>패</th><th>상태</th></tr></thead>
        <tbody>${rows}</tbody>
      </table></div>
      <div class="muted mt8" style="font-size:.78rem">🟩 배경 표시 = 경기 수가 가장 적어 다음 매칭에서 우선 고려되는 참가자</div>`}
  </div>`;
}

function renderHelp() {
  const steps = [
    { icon: '👥', title: '1. 회원 등록 (한 번만)', desc: '"참가자" 탭 → "참가자 추가"로 전체 회원을 이름, 성별, 등급(A~F)과 함께 등록해둡니다. 이 명단은 계속 재사용됩니다.' },
    { icon: '👋', title: '2. 오늘 참석자 선택', desc: '모임 시작 전 "홈"의 "오늘 참석자 선택"을 눌러 오늘 나온 사람만 체크합니다. 회원을 하나씩 "당일 제외/포함"으로 누를 필요 없이 한 번에 정할 수 있어요. 코트 수도 "코트 설정"에서 맞춰둡니다.' },
    { icon: '🛠', title: '3. 경기 만들기 (기본)', desc: '"홈"의 "직접 경기 만들기" 또는 "코트 현황" 탭에서 원하는 코트의 "이 코트에서 경기 만들기" 버튼을 눌러 팀을 구성하고 시작합니다. 이미 다른 코트에서 경기 중이거나 대기 코트에 들어간 선수는 목록에서 자동으로 빠지고, 같은 경기 안에서 같은 선수를 중복 선택할 수도 없습니다. 코트가 다 차 있으면 "코트 현황"의 "대기 코트 추가"로 다음 경기 멤버를 미리 정해두세요. 대기 코트는 지금 경기 중인 선수도 선택할 수 있고, 목록에 "🔴 경기 중"으로 표시되니 지금 안 뛰고 있는 사람이 누구인지 바로 확인할 수 있습니다. 코트가 비면 "코트 배정하고 시작"을 누르면 됩니다(단, 아직 경기가 안 끝난 선수가 있으면 시작이 막힙니다).' },
    { icon: '🎯', title: '4. 자동 매칭 추천 (선택 기능)', desc: '직접 짜기 번거로울 때 "추천 받기"를 누르면 경기 수·등급·파트너/상대 중복을 고려한 조합을 대신 만들어줍니다. 추천은 참고용이라 그대로 시작하거나 "수정"해서 바꿀 수 있습니다.' },
    { icon: '🏁', title: '5. 경기 종료', desc: '진행 중인 코트의 "경기 종료 / 점수 입력"을 누르면 됩니다. 점수는 몰라도 되고, 비워둔 채 저장하면 승패 없이 참가 횟수만 기록됩니다.' },
    { icon: '😴', title: '6. 휴식 관리', desc: '"휴식 관리" 버튼이나 "참가자" 탭의 개별 "휴식" 버튼으로 관리합니다. 휴식 중인 사람은 자동 매칭 대상에서 빠집니다.' },
    { icon: '🏸', title: '7. 콕 관리', desc: '"콕 관리" 탭에서 남자 3개, 여자 2개 콕(셔틀콕) 제출 여부를 체크하고, 다음 모임 때는 "전체 미제출로 초기화"로 리셋합니다.' },
    { icon: '📊', title: '8. 기록·통계 확인', desc: '"경기 기록"에서 오늘 진행한 경기를, "통계"에서 참가자별 경기 수·승패를 확인합니다. 경기 수가 가장 적은 사람이 다음 매칭에서 우선적으로 고려됩니다.' },
    { icon: '🏁', title: '9. 모임 종료', desc: '모임이 다 끝나면 "홈"의 "모임 종료 (저장 후 초기화)"를 누르세요. 오늘 기록(총 경기 수·참가자별 경기 수/승패)이 "경기 기록" 탭의 "지난 모임 기록"에 저장되고, 다음 모임을 위해 경기 기록과 경기 수가 깨끗하게 초기화됩니다. 회원 명단은 그대로 남습니다.' },
  ];

  return `
  <div class="card">
    <h2>❓ 사용법</h2>
    <p class="muted" style="margin:-4px 0 14px;font-size:.85rem">순서대로 따라 하면 바로 사용할 수 있어요.</p>
    ${steps.map(s => `
      <div class="history-item" style="display:flex;gap:12px;align-items:flex-start">
        <div style="font-size:1.4rem;line-height:1">${s.icon}</div>
        <div>
          <div style="font-weight:800;color:var(--primary-dark);margin-bottom:4px">${s.title}</div>
          <div class="muted" style="font-size:.85rem;line-height:1.5">${s.desc}</div>
        </div>
      </div>`).join('')}
  </div>
  <div class="card">
    <h2>💡 핵심 원칙</h2>
    <p style="font-size:.88rem;line-height:1.6;margin:0">자동 매칭은 강제가 아니라 <strong>추천</strong>일 뿐입니다. 운영자가 언제든 팀을 바꾸거나, 특정 인원을 빼거나, 직접 경기를 새로 만들 수 있어요. 앱은 "경기 수가 적은 사람이 누구인지", "누가 지금 쉬고 있는지"를 한눈에 볼 수 있게 도와주는 도구입니다.</p>
  </div>`;
}

/* ================= 모달 ================= */

function openModal(html, opts) {
  const root = document.getElementById('modalRoot');
  root.innerHTML = `<div class="modal-box${opts && opts.wide ? ' wide' : ''}">${html}</div>`;
  root.classList.remove('hidden');
}
function closeModal() {
  picker = null;
  document.getElementById('modalRoot').classList.add('hidden');
  document.getElementById('modalRoot').innerHTML = '';
}

function updateModalBody(html) {
  // 모달 박스 자체를 새로 만들지 않고 내용만 갈아끼워서, 매번 등장 애니메이션이 재생되며
  // "새로고침되는 것처럼" 보이는 깜빡임을 없앤다.
  const box = document.querySelector('#modalRoot .modal-box');
  if (box) box.innerHTML = html;
  else openModal(html);
}

/* ================= 선수 선택 (바둑판 그리드) ================= */

let picker = null; // { mode:'manual'|'waiting'|'edit', selection:[ids...], court, idx }

function fairnessCompare(a, b) {
  // 매칭 알고리즘과 같은 우선순위: 경기 수가 적을수록, 그 다음 오래 쉰 사람일수록 앞에 오도록
  if (a.totalGames !== b.totalGames) return a.totalGames - b.totalGames;
  const aRest = a.restSince || Infinity, bRest = b.restSince || Infinity;
  if (aRest !== bRest) return aRest - bRest;
  return a.name.localeCompare(b.name, 'ko');
}

function pickerPool() {
  if (!picker) return [];
  let pool;
  if (picker.mode === 'waiting') {
    const playing = playingPlayerIds();
    pool = waitingModalPlayers().slice().sort((a, b) => {
      const ap = playing.has(a.id) ? 1 : 0, bp = playing.has(b.id) ? 1 : 0;
      return ap !== bp ? ap - bp : fairnessCompare(a, b);
    });
  } else {
    pool = availablePlayers().slice().sort(fairnessCompare);
  }
  picker.selection.forEach(id => {
    if (id && !pool.find(p => p.id === id)) {
      const p = playerById(id);
      if (p) pool.push(p);
    }
  });
  return pool;
}

function renderPickerSlots() {
  const chip = (i, tag) => {
    const id = picker.selection[i];
    return `<div class="slot-chip ${id ? 'filled' : ''}" data-action="removeSlot" data-idx="${i}"><span class="slot-tag">${tag}</span>${id ? playerName(id) : '선택 안 됨'}</div>`;
  };
  return `<div class="picker-slots">${chip(0, 'A1')}${chip(1, 'A2')}<span class="slot-vs">VS</span>${chip(2, 'B1')}${chip(3, 'B2')}</div>
  ${picker.selection.length ? `<div class="center" style="margin:2px 0 10px"><button type="button" class="btn btn-ghost btn-sm" data-action="clearPicker">선택 초기화</button></div>` : ''}`;
}

function renderPickerGrid() {
  const pool = pickerPool();
  if (pool.length === 0) return `<div class="empty-hint">선택 가능한 참가자가 없습니다.</div>`;
  const playing = playingPlayerIds();
  const full = picker.selection.length >= 4;
  return `<div class="player-grid">${pool.map(p => {
    const idx = picker.selection.indexOf(p.id);
    const team = idx === -1 ? '' : (idx < 2 ? 'a' : 'b');
    const isPlaying = playing.has(p.id);
    const waitPart = isPlaying ? '🔴 경기 중' : waitingDuration(p);
    const disabled = full && idx === -1;
    return `<button type="button" class="player-tile ${idx !== -1 ? 'selected team-' + team : ''}${disabled ? ' disabled' : ''}" data-action="pickPlayer" data-id="${p.id}">
      ${idx !== -1 ? `<span class="tile-badge">팀${team.toUpperCase()} · ${idx % 2 + 1}</span>` : ''}
      <span class="tile-name">${p.name}</span>
      <span class="tile-meta">${p.gender === 'M' ? '남' : '여'}/${p.level} · ${p.totalGames}경기${waitPart ? ' · ' + waitPart : ''}</span>
    </button>`;
  }).join('')}</div>`;
}

function reopenPickerModal() {
  if (!picker) return;
  const grid = document.querySelector('.player-grid');
  const scrollTop = grid ? grid.scrollTop : 0;
  const html = picker.mode === 'manual' ? manualMatchModalHtml()
    : picker.mode === 'waiting' ? waitingMatchModalHtml()
    : editRecModalHtml();
  updateModalBody(html);
  const newGrid = document.querySelector('.player-grid');
  if (newGrid) newGrid.scrollTop = scrollTop;
}

function pickPlayer(id) {
  if (!picker) return;
  if (picker.mode === 'manual') {
    const courtEl = document.getElementById('mCourt');
    if (courtEl) picker.court = Number(courtEl.value) || null;
  }
  const i = picker.selection.indexOf(id);
  if (i !== -1) picker.selection.splice(i, 1);
  else if (picker.selection.length < 4) picker.selection.push(id);
  else { toast('이미 4명이 선택되었습니다. 먼저 선택을 해제하세요.'); return; }
  reopenPickerModal();
}

function removePickerSlot(idx) {
  if (!picker || picker.selection[idx] === undefined) return;
  picker.selection.splice(idx, 1);
  reopenPickerModal();
}

function clearPicker() {
  if (!picker) return;
  picker.selection = [];
  reopenPickerModal();
}

function openAddPlayer(existing) {
  const isEdit = !!existing;
  openModal(`
    <h3>${isEdit ? '참가자 수정' : '참가자 추가'}</h3>
    <div class="form-grid">
      <label>이름 <input type="text" id="pName" value="${existing ? existing.name : ''}" placeholder="이름 입력"></label>
      <label>성별
        <select id="pGender">
          <option value="M" ${existing && existing.gender === 'M' ? 'selected' : ''}>남성</option>
          <option value="F" ${existing && existing.gender === 'F' ? 'selected' : ''}>여성</option>
        </select>
      </label>
      <label>등급
        <select id="pLevel">
          ${LEVEL_OPTIONS.map(l => `<option value="${l}" ${existing && existing.level === l ? 'selected' : ''}>${l}</option>`).join('')}
        </select>
      </label>
      <label>특이사항 <input type="text" id="pMemo" value="${existing && existing.memo ? existing.memo : ''}" placeholder="예: 발목 부상 (선택)"></label>
    </div>
    <div class="modal-actions">
      <button class="btn btn-ghost" data-action="closeModal">취소</button>
      <button class="btn btn-primary" data-action="savePlayer" data-id="${existing ? existing.id : ''}">${isEdit ? '저장' : '추가'}</button>
    </div>
  `);
  document.getElementById('pName').focus();
}

function savePlayerFromModal(id) {
  const name = document.getElementById('pName').value.trim();
  const gender = document.getElementById('pGender').value;
  const level = document.getElementById('pLevel').value;
  const memo = document.getElementById('pMemo').value.trim();
  if (!name) { toast('이름을 입력하세요.'); return; }

  if (id) {
    const p = playerById(id);
    Object.assign(p, { name, gender, level, memo });
  } else {
    state.players.push({ id: uid('p'), name, gender, level, memo, active: true, resting: false, totalGames: 0, wins: 0, losses: 0, shuttleDone: false, restSince: Date.now() });
  }
  saveState();
  closeModal();
  render();
  toast('저장되었습니다.');
}

function openRestManager() {
  const rows = sortByName(eligiblePlayers().concat(state.players.filter(p => p.active && p.resting)).filter((p, i, arr) => arr.indexOf(p) === i));
  openModal(`
    <h3>😴 휴식 관리</h3>
    <div class="checklist">
      ${rows.length === 0 ? '<div class="empty-hint">당일 참여 중인 참가자가 없습니다.</div>' : rows.map(p => {
        const dur = waitingDuration(p);
        const durLabel = dur ? ` · ${p.resting ? '휴식' : '대기'} ${dur}` : '';
        return `
      <div class="crow">
        <span>${p.name} <span class="muted">(${p.totalGames}경기${durLabel})</span></span>
        <button class="btn btn-sm ${p.resting ? 'btn-primary' : 'btn-ghost'}" data-action="toggleRestInModal" data-id="${p.id}">${p.resting ? '휴식 중' : '휴식 지정'}</button>
      </div>`;
      }).join('')}
    </div>
    <div class="modal-actions"><button class="btn btn-ghost" data-action="closeModal">닫기</button></div>
  `);
}

function openAttendanceModal() {
  const rows = sortByName(state.players);
  openModal(`
    <h3>👋 오늘 참석자 선택</h3>
    <p class="muted" style="margin-top:-6px;font-size:.82rem">체크한 사람만 오늘 매칭 대상(당일 참여)이 됩니다. 하나씩 누를 필요 없이 여기서 한 번에 정하세요.</p>
    <div class="row-actions" style="margin-bottom:10px">
      <button class="btn btn-outline btn-sm" data-action="attendanceSelectAll">전체 선택</button>
      <button class="btn btn-outline btn-sm" data-action="attendanceSelectNone">전체 해제</button>
    </div>
    <div class="checklist">
      ${rows.length === 0 ? '<div class="empty-hint">등록된 참가자가 없습니다. 먼저 "참가자" 탭에서 회원을 등록하세요.</div>' : rows.map(p => `
      <label class="crow" style="cursor:pointer">
        <span><input type="checkbox" class="attendChk" value="${p.id}" ${p.active ? 'checked' : ''}> ${p.name} <span class="muted">(${p.gender === 'M' ? '남' : '여'}/${p.level})</span></span>
      </label>`).join('')}
    </div>
    <div class="modal-actions">
      <button class="btn btn-ghost" data-action="closeModal">취소</button>
      <button class="btn btn-primary" data-action="saveAttendance">참석자 저장</button>
    </div>
  `);
}

function saveAttendanceFromModal() {
  const checked = new Set(Array.from(document.querySelectorAll('.attendChk:checked')).map(el => el.value));
  state.players.forEach(p => {
    const wasActive = p.active;
    p.active = checked.has(p.id);
    if (p.active && !wasActive) p.restSince = Date.now(); // 오늘 새로 합류 -> 지금부터 대기 시간 카운트
    if (!p.active) p.resting = false;
  });
  saveState();
  closeModal();
  render();
  toast(`오늘 참석자 ${checked.size}명으로 설정했습니다.`);
}

function openManualMatch(presetCourt) {
  picker = { mode: 'manual', selection: [], court: presetCourt || null };
  openModal(manualMatchModalHtml(), { wide: true });
}

function manualMatchModalHtml() {
  const courtOptions = Array.from({ length: state.settings.courtCount }, (_, i) => i + 1)
    .filter(c => !activeGameOnCourt(c))
    .map(c => `<option value="${c}" ${c === picker.court ? 'selected' : ''}>${c}번 코트</option>`).join('');

  return `
    <h3>🛠 직접 경기 만들기</h3>
    <div class="field" style="margin-bottom:12px">
      <label>코트</label>
      <select id="mCourt">${courtOptions || '<option value="">사용 가능한 코트 없음</option>'}</select>
    </div>
    ${renderPickerSlots()}
    <p class="muted" style="font-size:.78rem;margin:8px 0">선수를 누른 순서대로 팀 A 2명 → 팀 B 2명에 배정됩니다. 다시 누르면 선택이 취소돼요.</p>
    ${renderPickerGrid()}
    <div class="modal-actions">
      <button class="btn btn-ghost" data-action="closeModal">취소</button>
      <button class="btn btn-primary" data-action="startManualMatch">경기 시작</button>
    </div>
  `;
}

function startManualMatchFromModal() {
  const court = Number(document.getElementById('mCourt').value);
  if (!court) { toast('코트를 선택하세요.'); return; }
  if (picker.selection.length !== 4) { toast('4명 모두 선택하세요.'); return; }

  const teamA = picker.selection.slice(0, 2), teamB = picker.selection.slice(2, 4);
  startGame(court, teamA, teamB, deriveGameType(teamA, teamB));
  closeModal();
  toast('경기를 시작했습니다.');
  switchView('home');
}

function waitingModalPlayers() {
  // 대기 코트는 다음 경기를 미리 준비하는 용도라, 지금 경기 중인 선수도 선택할 수 있게 한다.
  // 단, 이미 다른 대기 코트에 들어간 선수는 중복 배정을 막기 위해 제외한다.
  const waiting = waitingPlayerIds();
  const playing = playingPlayerIds();
  return eligiblePlayers()
    .filter(p => !waiting.has(p.id))
    .sort((a, b) => (playing.has(a.id) ? 1 : 0) - (playing.has(b.id) ? 1 : 0) || a.name.localeCompare(b.name, 'ko'));
}

function openWaitingMatch() {
  picker = { mode: 'waiting', selection: [] };
  openModal(waitingMatchModalHtml(), { wide: true });
}

function waitingMatchModalHtml() {
  return `
    <h3>🕒 대기 코트 추가</h3>
    <p class="muted" style="margin-top:-6px;font-size:.82rem">코트를 아직 정하지 않고 다음 경기 멤버만 먼저 정해둡니다. 코트가 비면 나중에 배정해서 바로 시작할 수 있어요. 지금 경기 중인 선수도 다음 경기 멤버로 미리 넣어둘 수 있습니다 (🔴 표시).</p>
    ${renderPickerSlots()}
    ${renderPickerGrid()}
    <div class="modal-actions">
      <button class="btn btn-ghost" data-action="closeModal">취소</button>
      <button class="btn btn-primary" data-action="submitWaitingMatch">대기 코트에 추가</button>
    </div>
  `;
}

function submitWaitingMatchFromModal() {
  if (picker.selection.length !== 4) { toast('4명 모두 선택하세요.'); return; }

  const teamA = picker.selection.slice(0, 2), teamB = picker.selection.slice(2, 4);
  state.waitingMatches.push({ id: uid('w'), teamA, teamB, gameType: deriveGameType(teamA, teamB) });
  saveState();
  closeModal();
  render();
  toast('대기 코트에 추가되었습니다.');
}

function startWaitingMatch(id) {
  const w = state.waitingMatches.find(x => x.id === id);
  if (!w) return;
  const playing = playingPlayerIds();
  const stillPlaying = w.teamA.concat(w.teamB).filter(pid => playing.has(pid));
  if (stillPlaying.length) { toast(`아직 경기 중인 선수가 있어 시작할 수 없어요: ${stillPlaying.map(playerName).join(', ')}`); return; }
  const busy = occupiedCourts();
  let court = null;
  for (let c = 1; c <= state.settings.courtCount; c++) { if (!busy.has(c)) { court = c; break; } }
  if (!court) { toast('비어있는 코트가 없습니다.'); return; }

  startGame(court, w.teamA, w.teamB, w.gameType);
  state.waitingMatches = state.waitingMatches.filter(x => x.id !== id);
  saveState();
  render();
  toast(`${court}번 코트에서 경기를 시작했습니다.`);
}

function deleteWaitingMatch(id) {
  state.waitingMatches = state.waitingMatches.filter(x => x.id !== id);
  saveState();
  render();
}

function openEndGameModal(gameId) {
  const g = state.games.find(x => x.id === gameId);
  openModal(`
    <h3>🏁 경기 종료 - ${g.court}번 코트</h3>
    <div class="team-line" style="margin-bottom:10px">
      <span class="team-name">${g.teamA.map(playerName).join(' + ')}</span>
      <span class="vs">VS</span>
      <span class="team-name">${g.teamB.map(playerName).join(' + ')}</span>
    </div>
    <div class="form-grid">
      <label>팀 A 점수 (선택) <input type="number" id="scoreA" min="0" placeholder="입력 안 해도 저장 가능"></label>
      <label>팀 B 점수 (선택) <input type="number" id="scoreB" min="0" placeholder="입력 안 해도 저장 가능"></label>
      <label>특이사항(선택) <input type="text" id="gameMemo" placeholder="예: 민수 발목 통증"></label>
    </div>
    <div class="modal-actions">
      <button class="btn btn-ghost" data-action="closeModal">취소</button>
      <button class="btn btn-primary" data-action="submitEndGame" data-id="${g.id}">경기 종료 저장</button>
    </div>
  `);
}

function submitEndGameFromModal(gameId) {
  const rawA = document.getElementById('scoreA').value.trim();
  const rawB = document.getElementById('scoreB').value.trim();
  const memo = document.getElementById('gameMemo').value.trim();

  if ((rawA === '') !== (rawB === '')) { toast('점수는 두 팀 모두 입력하거나, 둘 다 비워두세요.'); return; }

  const hasScore = rawA !== '' && rawB !== '';
  let scoreA = null, scoreB = null, winner = null;
  if (hasScore) {
    scoreA = Number(rawA); scoreB = Number(rawB);
    if (isNaN(scoreA) || isNaN(scoreB)) { toast('점수를 올바르게 입력하세요.'); return; }
    if (scoreA === scoreB) { toast('무승부는 입력할 수 없습니다.'); return; }
    winner = scoreA > scoreB ? 'A' : 'B';
  }

  const g = state.games.find(x => x.id === gameId);
  g.scoreA = scoreA; g.scoreB = scoreB;
  g.winner = winner;
  g.endTime = Date.now();
  g.memo = memo;
  g.status = 'done';

  g.teamA.concat(g.teamB).forEach(id => { const p = playerById(id); if (p) { p.totalGames++; p.restSince = g.endTime; } });
  if (hasScore) {
    const winners = winner === 'A' ? g.teamA : g.teamB;
    const losers = winner === 'A' ? g.teamB : g.teamA;
    winners.forEach(id => { const p = playerById(id); if (p) p.wins++; });
    losers.forEach(id => { const p = playerById(id); if (p) p.losses++; });
  }

  saveState();
  closeModal();
  toast('경기 결과가 저장되었습니다.');
  render();
}

function openEditRecModal(idx) {
  const r = state.pendingRecs[idx];
  picker = { mode: 'edit', idx, selection: r.teamA.concat(r.teamB) };
  openModal(editRecModalHtml(), { wide: true });
}

function editRecModalHtml() {
  const r = state.pendingRecs[picker.idx];
  return `
    <h3>✏️ 추천 조합 수정 - ${r.court}번 코트</h3>
    ${renderPickerSlots()}
    ${renderPickerGrid()}
    <div class="modal-actions">
      <button class="btn btn-ghost" data-action="closeModal">취소</button>
      <button class="btn btn-primary" data-action="saveEditRec">저장</button>
    </div>
  `;
}

function saveEditRecFromModal() {
  if (picker.selection.length !== 4) { toast('4명 모두 선택하세요.'); return; }
  const r = state.pendingRecs[picker.idx];
  r.teamA = picker.selection.slice(0, 2);
  r.teamB = picker.selection.slice(2, 4);
  r.score = scoreSplit(r.teamA, r.teamB);
  r.gameType = deriveGameType(r.teamA, r.teamB);
  saveState();
  closeModal();
  render();
  toast('조합이 수정되었습니다.');
}

/* ================= 게임 시작/기타 액션 ================= */

function startGame(court, teamA, teamB, gameType) {
  state.games.push({
    id: uid('g'), round: state.games.length + 1, court, gameType: gameType || deriveGameType(teamA, teamB),
    teamA, teamB, scoreA: null, scoreB: null, winner: null,
    startTime: Date.now(), endTime: null, memo: '', date: todayStr(), status: 'progress',
  });
  state.pendingRecs = state.pendingRecs.filter(r => r.court !== court);
  saveState();
}

function startRecommendation(idx) {
  const r = state.pendingRecs[idx];
  if (activeGameOnCourt(r.court)) { toast('해당 코트에 이미 진행 중인 경기가 있습니다.'); return; }
  startGame(r.court, r.teamA, r.teamB, r.gameType);
  render();
  toast(`${r.court}번 코트 경기를 시작했습니다.`);
}

function clearSessionData() {
  state.players.forEach(p => { p.totalGames = 0; p.wins = 0; p.losses = 0; p.resting = false; p.restSince = p.active ? Date.now() : null; });
  state.games = [];
  state.pendingRecs = [];
  state.waitingMatches = [];
  state.lastShortfall = '';
}

function resetTodayStats() {
  if (!confirm('오늘 경기 기록과 참가자 경기 수/승패를 초기화할까요? (참가자 명단은 유지됩니다)')) return;
  clearSessionData();
  saveState();
  render();
  toast('오늘 기록이 초기화되었습니다.');
}

function endSession() {
  const today = todayStr();
  const todaysGames = state.games.filter(g => g.date === today && g.status === 'done');
  const totalGames = todaysGames.length;
  const usedCourts = new Set(todaysGames.map(g => g.court)).size;
  const participants = state.players
    .filter(p => p.totalGames > 0)
    .map(p => ({ name: p.name, gender: p.gender, level: p.level, totalGames: p.totalGames, wins: p.wins, losses: p.losses }));

  if (totalGames === 0) { toast('저장할 경기 기록이 없습니다.'); return; }
  if (!confirm('모임을 종료할까요? 오늘 기록이 "경기 기록" 탭의 지난 모임 목록에 저장되고, 경기 기록과 참가자 경기 수는 초기화됩니다.')) return;

  const memos = todaysGames.filter(g => g.memo).map(g => `${g.court}번 코트 · ${g.memo}`);
  state.sessionHistory.unshift({
    id: uid('s'), date: today, endedAt: Date.now(),
    totalGames, usedCourts, participants, memos,
  });

  clearSessionData();
  saveState();
  render();
  toast('모임 기록이 저장되었습니다.');
}

/* ================= 이벤트 처리 ================= */

document.addEventListener('click', (e) => {
  const tabBtn = e.target.closest('.tab-btn');
  if (tabBtn) { switchView(tabBtn.dataset.view); return; }

  const btn = e.target.closest('[data-action]');
  if (!btn) return;
  const action = btn.dataset.action;
  const id = btn.dataset.id;
  const idx = btn.dataset.idx !== undefined ? Number(btn.dataset.idx) : undefined;

  switch (action) {
    case 'saveSettings': {
      state.settings.courtCount = Math.max(1, Number(document.getElementById('courtCountInput').value) || 1);
      saveState();
      toast('설정이 저장되었습니다.');
      render();
      break;
    }
    case 'recommend':
      generateRecommendations();
      render();
      break;
    case 'editRec': openEditRecModal(idx); break;
    case 'saveEditRec': saveEditRecFromModal(); break;
    case 'pickPlayer': pickPlayer(id); break;
    case 'removeSlot': removePickerSlot(idx); break;
    case 'clearPicker': clearPicker(); break;
    case 'startRec': startRecommendation(idx); break;
    case 'endGame': openEndGameModal(id); break;
    case 'submitEndGame': submitEndGameFromModal(id); break;
    case 'openManualMatch': openManualMatch(btn.dataset.court ? Number(btn.dataset.court) : undefined); break;
    case 'startManualMatch': startManualMatchFromModal(); break;
    case 'openWaitingMatch': openWaitingMatch(); break;
    case 'submitWaitingMatch': submitWaitingMatchFromModal(); break;
    case 'startWaitingMatch': startWaitingMatch(id); break;
    case 'deleteWaitingMatch': deleteWaitingMatch(id); break;
    case 'openRestManager': openRestManager(); break;
    case 'openAttendance': openAttendanceModal(); break;
    case 'attendanceSelectAll': document.querySelectorAll('.attendChk').forEach(c => { c.checked = true; }); break;
    case 'attendanceSelectNone': document.querySelectorAll('.attendChk').forEach(c => { c.checked = false; }); break;
    case 'saveAttendance': saveAttendanceFromModal(); break;
    case 'endSession': endSession(); break;
    case 'deleteSessionRecord': {
      if (confirm('저장된 모임 기록을 삭제할까요?')) {
        state.sessionHistory = state.sessionHistory.filter(s => s.id !== id);
        saveState(); render();
      }
      break;
    }
    case 'toggleRestInModal': {
      const p = playerById(id); p.resting = !p.resting; p.restSince = Date.now(); saveState(); openRestManager(); break;
    }
    case 'openAddPlayer': openAddPlayer(null); break;
    case 'editPlayer': openAddPlayer(playerById(id)); break;
    case 'savePlayer': savePlayerFromModal(id || null); break;
    case 'deletePlayer': {
      if (playingPlayerIds().has(id)) { toast('지금 경기 중인 선수는 삭제할 수 없습니다. 경기 종료 후 삭제하세요.'); break; }
      if (waitingPlayerIds().has(id)) { toast('대기 코트에 들어가 있는 선수는 삭제할 수 없습니다. 대기 코트에서 먼저 빼주세요.'); break; }
      if (confirm('참가자를 삭제할까요? 관련 경기 기록의 이름 표시는 유지됩니다.')) {
        state.players = state.players.filter(p => p.id !== id);
        state.pendingRecs = state.pendingRecs.filter(r => !r.teamA.concat(r.teamB).includes(id));
        saveState(); render();
      }
      break;
    }
    case 'toggleRest': { const p = playerById(id); p.resting = !p.resting; p.restSince = Date.now(); saveState(); render(); break; }
    case 'toggleActive': {
      const p = playerById(id);
      p.active = !p.active;
      if (!p.active) p.resting = false;
      else p.restSince = Date.now();
      saveState(); render(); break;
    }
    case 'toggleShuttle': { const p = playerById(id); p.shuttleDone = !p.shuttleDone; saveState(); render(); break; }
    case 'resetShuttles': {
      if (confirm('모든 참가자의 콕 제출 상태를 미제출로 초기화할까요?')) {
        state.players.forEach(p => { p.shuttleDone = false; });
        saveState(); render(); toast('콕 제출 상태가 초기화되었습니다.');
      }
      break;
    }
    case 'resetToday': resetTodayStats(); break;
    case 'clearPlayerFilter': playersFilter = { gender: '', level: '', active: '' }; render(); break;
    case 'closeModal': closeModal(); break;
  }
});

document.addEventListener('change', (e) => {
  const el = e.target.closest('[data-filter]');
  if (!el) return;
  playersFilter[el.dataset.filter] = el.value;
  render();
});

document.getElementById('modalRoot').addEventListener('click', (e) => {
  if (e.target.id === 'modalRoot') closeModal();
});

/* ================= 초기화 ================= */
render();

// 대기/휴식 시간이 화면에 실시간으로 반영되도록 주기적으로 다시 그린다 (입력 중인 모달은 건드리지 않음).
setInterval(() => {
  if (document.getElementById('modalRoot').classList.contains('hidden')) render();
}, 30000);
