export const STORAGE_KEY = 'bm-matcher-state-v1';
export const LEVEL_ORDER = { 'A': 5, 'B': 4, 'C': 3, 'D': 2, 'E': 1, 'F': 0 };
export const LEVEL_OPTIONS = ['A', 'B', 'C', 'D', 'E', 'F'];
export const MAX_WAITING = 3; // 대기 코트 최대 개수

export function uid(prefix) {
  return prefix + '_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

export function todayStr(ts) {
  const d = ts ? new Date(ts) : new Date();
  const pad = n => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function timeStr(ts) {
  const d = new Date(ts);
  const pad = n => String(n).padStart(2, '0');
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function durationStr(startTs, endTs) {
  const mins = Math.max(0, Math.round((endTs - startTs) / 60000));
  if (mins < 60) return `${mins}분`;
  return `${Math.floor(mins / 60)}시간 ${mins % 60}분`;
}

export function sortByName(players) {
  return players.slice().sort((a, b) => a.name.localeCompare(b.name, 'ko'));
}

export function shuttleQuota(p) {
  return p.gender === 'M' ? 3 : 2;
}

export function starStr(n) {
  return '★'.repeat(n) + '☆'.repeat(5 - n);
}

export function genderLabel(g) {
  return g === 'M' ? '남' : '여';
}
