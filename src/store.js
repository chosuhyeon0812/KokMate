/* 앱 전체 상태 저장소 (localStorage 에 그대로 저장하므로 예전 버전 데이터도 이어서 사용 가능) */
import { useSyncExternalStore } from 'react';
import { STORAGE_KEY } from './lib/utils';

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
    const merged = Object.assign(defaultState(), JSON.parse(raw));
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
