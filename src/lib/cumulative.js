/* 누적 기록 계산: 저장된 지난 모임들로 회원별 출석 횟수, 경기 수, 마지막 참석일을 모은다. (화면은 views/Cumulative.jsx) */

export function daysBetween(from, to) {
  const t = s => { const [y, m, d] = s.split('-').map(Number); return new Date(y, m - 1, d).getTime(); };
  return Math.round((t(to) - t(from)) / 86400000);
}

// 기록 속 참가자가 지금 명단의 누구인지 찾는다. 예전 기록에는 id가 없어서 같은 이름으로 맞춘다.
// 명단에서 삭제한 사람(그날만 온 레슨자·게스트 등)은 null 이라 누적 기록에서 뺀다.
function memberId(state, p) {
  if (p.id) return state.players.some(x => x.id === p.id) ? p.id : null;
  const same = state.players.find(x => x.name === p.name);
  return same ? same.id : null;
}

// 앱을 쓰기 전 출석 횟수는 회원마다 priorAttend 로 넣어뒀다. 모두 2026년 10월 19일 이전 기록이라
// '전체'와 2026년의 '올해'에 더한다.
const PRIOR_YEAR = '2026';

// period: 'month' | 'year' | 'all', today: 'YYYY-MM-DD'
// 돌려주는 것: { sessions: 기간 안의 모임들, rows: [{ key, name, level, gender, attend, games, last, days }] }
export function cumulativeRows(state, period, today) {
  const prefix = period === 'month' ? today.slice(0, 7) : period === 'year' ? today.slice(0, 4) : '';
  const sessions = state.sessionHistory.filter(s => s.date.startsWith(prefix));

  // 지금 명단의 회원은 한 번도 안 왔어도 보여준다. (오래 안 나온 회원을 찾을 수 있게)
  const rows = new Map(state.players.map(p => [p.id, {
    key: p.id, name: p.name, level: p.level, gender: p.gender,
    attend: period === 'all' || (period === 'year' && today.startsWith(PRIOR_YEAR)) ? p.priorAttend || 0 : 0, games: 0, last: null,
  }]));
  // 마지막 참석일은 기간과 상관없이 전체 기록에서 찾는다.
  state.sessionHistory.forEach(s => s.participants.forEach(p => {
    const r = rows.get(memberId(state, p));
    if (!r) return;
    if (!r.last || s.date > r.last) r.last = s.date;
  }));
  sessions.forEach(s => s.participants.forEach(p => {
    const r = rows.get(memberId(state, p));
    if (!r) return;
    r.attend += 1;
    r.games += p.totalGames;
  }));
  const list = [...rows.values()];
  list.forEach(r => { r.days = r.last ? daysBetween(r.last, today) : null; });
  return { sessions, rows: list };
}
