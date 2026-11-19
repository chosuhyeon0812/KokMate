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

const parse = s => { const [y, m, d] = s.split('-').map(Number); return new Date(y, m - 1, d); };
const fmt = dt => `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}-${String(dt.getDate()).padStart(2, '0')}`;

// 이번 주 월요일 'YYYY-MM-DD' (한 주는 월요일부터 일요일까지)
export function weekStart(today) {
  const dt = parse(today);
  dt.setDate(dt.getDate() - (dt.getDay() + 6) % 7);
  return fmt(dt);
}

// 기간 하나: 오늘이 들어간 주·달·해에서 offset 만큼 옮긴 것 (-1 = 지난주/지난달/작년).
// 돌려주는 것: { from, to: 'YYYY-MM-DD' (둘 다 포함), title: '2026년 10월' 같은 이름, tag: '지난달' 같은 말 (가까울 때만) }
export function periodRange(period, today, offset = 0) {
  const t = parse(today);
  if (period === 'week') {
    const a = parse(weekStart(today));
    a.setDate(a.getDate() + offset * 7);
    const b = new Date(a); b.setDate(a.getDate() + 6);
    const title = a.getMonth() === b.getMonth()
      ? `${a.getMonth() + 1}월 ${a.getDate()}일 ~ ${b.getDate()}일`
      : `${a.getMonth() + 1}월 ${a.getDate()}일 ~ ${b.getMonth() + 1}월 ${b.getDate()}일`;
    const yearNote = a.getFullYear() !== t.getFullYear() ? `${a.getFullYear()}년 ` : '';
    return { from: fmt(a), to: fmt(b), title: yearNote + title, tag: ['이번 주', '지난주'][-offset] };
  }
  if (period === 'month') {
    const a = new Date(t.getFullYear(), t.getMonth() + offset, 1);
    const b = new Date(a.getFullYear(), a.getMonth() + 1, 0);
    return { from: fmt(a), to: fmt(b), title: `${a.getFullYear()}년 ${a.getMonth() + 1}월`, tag: ['이번 달', '지난달'][-offset] };
  }
  if (period === 'year') {
    const y = t.getFullYear() + offset;
    return { from: `${y}-01-01`, to: `${y}-12-31`, title: `${y}년`, tag: ['올해', '작년'][-offset] };
  }
  return { from: '', to: '9999-12-31', title: '전체', tag: '전체' };
}

// 앱을 쓰기 전 출석 횟수는 회원마다 priorAttend 로 넣어뒀다. 모두 2026년 10월 19일 이전 기록이라
// '전체'와 2026년 연간에 더한다.
const PRIOR_YEAR = '2026';

// period: 'week' | 'month' | 'year' | 'all', today: 'YYYY-MM-DD', offset: 0 = 이번, -1 = 지난번 ...
// 돌려주는 것: { range, sessions: 기간 안의 모임들, rows: [{ key, name, level, gender, attend, games, last, days }] }
export function cumulativeRows(state, period, today, offset = 0) {
  const range = periodRange(period, today, offset);
  const sessions = state.sessionHistory.filter(s => s.date >= range.from && s.date <= range.to);
  const addPrior = period === 'all' || (period === 'year' && range.from.startsWith(PRIOR_YEAR));

  // 지금 명단의 회원은 한 번도 안 왔어도 0번으로 넣어둔다. (화면에서는 0번인 사람을 뺀다)
  const rows = new Map(state.players.map(p => [p.id, {
    key: p.id, name: p.name, level: p.level, gender: p.gender,
    attend: addPrior ? p.priorAttend || 0 : 0, games: 0, last: null,
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
  return { range, sessions, rows: list };
}
