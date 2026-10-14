/* 앱 전체 상태 저장소 (localStorage 에 그대로 저장하므로 예전 버전 데이터도 이어서 사용 가능) */
import { useSyncExternalStore } from 'react';
import { STORAGE_KEY, newMember } from './lib/utils';
import { DEFAULT_ROSTER, ROSTER_VERSION } from './lib/roster';

function defaultState() {
  return {
    players: [],
    settings: { courts: [] }, // 오늘 쓰는 코트 번호들 (예: [3, 5, 6])
    games: [],
    pendingRecs: [], // [{court, teamA:[ids], teamB:[ids], score:{levelDiff,partnerRepeat,opponentRepeat}}]
    waitingMatches: [], // [{id, teamA:[ids], teamB:[ids], gameType}] - 코트 미배정, 다음 경기 대기용
    sessionHistory: [], // [{id, date, endedAt, totalGames, usedCourts, participants:[{name,gender,level,totalGames,wins,losses}], memos:[...]}]
    lastShortfall: '',
  };
}

// 기본 회원 명단을 한 번만 넣는다. 이미 있는 이름은 건너뛰고, 넣은 뒤에는 표시를 남겨서
// 나중에 지운 사람이 다시 생기지 않게 한다.
function seedRoster(s) {
  if (s.rosterVersion === ROSTER_VERSION) return s;
  const names = new Set(s.players.map(p => p.name));
  DEFAULT_ROSTER.forEach(([name, gender, level]) => {
    if (!names.has(name)) s.players.push(newMember({ name, gender, level }));
  });
  s.rosterVersion = ROSTER_VERSION;
  return s;
}

function loadState() {
  return seedRoster(readSavedState());
}

function readSavedState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return defaultState();
    const merged = Object.assign(defaultState(), JSON.parse(raw));
    // 예전 데이터는 코트 수(courtCount)만 저장했으므로, 1번부터 그 수만큼의 코트로 바꿔준다.
    if (!Array.isArray(merged.settings.courts)) {
      merged.settings = { courts: Array.from({ length: merged.settings.courtCount || 0 }, (_, i) => i + 1) };
    }
    // 기존 저장 데이터에는 restSince가 없을 수 있으므로, 대기 중인데 기록이 없으면 지금부터 카운트 시작
    merged.players.forEach(p => { if (p.active && !p.resting && !p.restSince) p.restSince = Date.now(); });
    return merged;
  } catch (e) {
    return defaultState();
  }
}

let state = loadState();
const listeners = new Set();

export function getState() {
  return state;
}

// 상태 사본(draft)을 마음대로 고치면, 새 상태로 교체하고 저장한 뒤 화면을 다시 그린다.
export function update(mutator) {
  const draft = structuredClone(state);
  mutator(draft);
  state = draft;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  listeners.forEach(l => l());
}

function subscribe(listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function useAppState() {
  return useSyncExternalStore(subscribe, getState);
}
