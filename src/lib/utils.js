export const STORAGE_KEY = 'bm-matcher-state-v1';
export const LEVEL_ORDER = { 'A': 5, 'B': 4, 'C': 3, 'D': 2, 'E': 1, 'F': 0 };
export const LEVEL_OPTIONS = ['A', 'B', 'C', 'D', 'E', 'F'];
export const MAX_WAITING = 6; // 대기 코트 최대 개수
export const MAX_WAITING_PER_PLAYER = 3; // 한 사람이 동시에 들어갈 수 있는 대기 코트 수 (레슨하는 운영진 등 미리 여러 판 짜두기용)
// 회원 역할. 예전 데이터처럼 role 이 없으면 일반 회원으로 본다.
// 게스트(그날만 온 레슨자·손님)는 모임을 종료하면 명단에서 자동으로 지운다.
export const ROLE_OPTIONS = [['owner', '모임장'], ['staff', '운영진'], ['member', '일반 회원'], ['guest', '게스트']];
export function roleOf(p) {
  return p.role || 'member';
}
export function isGuest(p) {
  return p.role === 'guest';
}
export function roleLabel(role) {
  return (ROLE_OPTIONS.find(([v]) => v === role) || ROLE_OPTIONS[2])[1];
}

export function uid(prefix) {
  return prefix + '_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

// 회원 명단에만 올라간 새 참가자 (오늘 참석자는 아님)
export function newMember({ name, gender, level }) {
  return { id: uid('p'), name, gender, level, memo: '', active: false, resting: false, totalGames: 0, wins: 0, losses: 0, shuttleDone: false, restSince: null };
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

export function starStr(n) {
  return '★'.repeat(n) + '☆'.repeat(5 - n);
}

export function genderLabel(g) {
  return g === 'M' ? '남' : '여';
}
