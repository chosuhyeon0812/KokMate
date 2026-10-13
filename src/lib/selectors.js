/* 상태(state)에서 필요한 값을 계산하는 함수들. 모두 state를 직접 받아서 순수하게 동작한다. */
import { durationStr } from './utils';

export function playerById(state, id) {
  return state.players.find(p => p.id === id);
}

export function playerName(state, id) {
  const p = playerById(state, id);
  return p ? p.name : '(삭제됨)';
}

export function deriveGameType(state, teamA, teamB) {
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

export function fairnessCompare(a, b) {
  // 매칭 알고리즘과 같은 우선순위: 경기 수가 적을수록, 그 다음 오래 쉰 사람일수록 앞에 오도록
  if (a.totalGames !== b.totalGames) return a.totalGames - b.totalGames;
  const aRest = a.restSince || Infinity, bRest = b.restSince || Infinity;
  if (aRest !== bRest) return aRest - bRest;
  return a.name.localeCompare(b.name, 'ko');
}

export function waitingModalPlayers(state, exceptId) {
  // 대기 코트는 다음 경기를 미리 준비하는 용도라, 지금 경기 중인 선수도 선택할 수 있게 한다.
  // 단, 이미 다른 대기 코트에 들어간 선수는 중복 배정을 막기 위해 제외한다. (수정 중인 대기 코트 자신은 빼고 계산)
  const waiting = waitingPlayerIds(state, exceptId);
  return eligiblePlayers(state).filter(p => !waiting.has(p.id));
}
