/* 누적 기록: 저장된 지난 모임들로 회원별 출석 횟수, 경기 수, 마지막 참석일을 모아 보여준다. */
import { useState } from 'react';
import { useAppState } from '../store';
import { EmptyHint } from '../components/cards';
import { todayStr } from '../lib/utils';

const PERIODS = [['month', '이번 달'], ['year', '올해'], ['all', '전체']];
const SORTS = [['attend', '출석순'], ['games', '경기순']];
const LONG_ABSENT_DAYS = 30; // 이만큼 안 나왔으면 빨간색으로

function daysBetween(from, to) {
  const t = s => { const [y, m, d] = s.split('-').map(Number); return new Date(y, m - 1, d).getTime(); };
  return Math.round((t(to) - t(from)) / 86400000);
}

function agoLabel(days) {
  if (days == null) return '기록 없음';
  return days === 0 ? '오늘' : days === 1 ? '어제' : `${days}일 전`;
}

// 기록 속 참가자가 지금 명단의 누구인지 찾는다. 예전 기록에는 id가 없어서 같은 이름으로 맞춘다.
// 명단에서 삭제한 사람(그날만 온 레슨자·게스트 등)은 null 이라 누적 기록에서 뺀다.
function memberId(state, p) {
  if (p.id) return state.players.some(x => x.id === p.id) ? p.id : null;
  const same = state.players.find(x => x.name === p.name);
  return same ? same.id : null;
}

export default function Cumulative() {
  const state = useAppState();
  const [period, setPeriod] = useState('month');
  const [sortBy, setSortBy] = useState('attend');
  const today = todayStr();
  const prefix = period === 'month' ? today.slice(0, 7) : period === 'year' ? today.slice(0, 4) : '';
  const sessions = state.sessionHistory.filter(s => s.date.startsWith(prefix));

  // 지금 명단의 회원은 한 번도 안 왔어도 보여준다. (오래 안 나온 회원을 찾을 수 있게)
  const rows = new Map(state.players.map(p => [p.id, { key: p.id, name: p.name, attend: 0, games: 0, last: null }]));
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

  const byName = (a, b) => a.name.localeCompare(b.name, 'ko');
  const sorters = {
    attend: (a, b) => b.attend - a.attend || b.games - a.games || byName(a, b),
    games: (a, b) => b.games - a.games || b.attend - a.attend || byName(a, b),
  };
  const sorted = list.slice().sort(sorters[sortBy]);
  const topAttend = Math.max(0, ...list.map(r => r.attend));
  const kings = topAttend > 0 ? list.filter(r => r.attend === topAttend).sort(byName) : [];
  const periodName = PERIODS.find(([k]) => k === period)[1];

  return (
    <div className="card">
      <div className="section-row">
        <h2 className="mb0">누적 기록 <span className="muted" style={{ fontSize: '.8rem', fontWeight: 600 }}>{periodName} 모임 {sessions.length}번</span></h2>
        <div className="pill-toggle">
          {PERIODS.map(([k, label]) => <button key={k} className={period === k ? 'on' : ''} onClick={() => setPeriod(k)}>{label}</button>)}
        </div>
      </div>
      {state.sessionHistory.length === 0 ? <EmptyHint>아직 저장된 모임이 없습니다. 모임이 끝나면 "모임 종료"를 눌러 저장하세요.</EmptyHint> : (
        <>
          {kings.length > 0 && (
            <div className="attend-king">👑 {periodName} 출석왕 <b>{kings.map(r => r.name).join(', ')}</b> <span className="muted">({topAttend}번)</span></div>
          )}
          <div className="pill-toggle" style={{ marginBottom: 8 }}>
            {SORTS.map(([k, label]) => <button key={k} className={sortBy === k ? 'on' : ''} onClick={() => setSortBy(k)}>{label}</button>)}
          </div>
          <div style={{ overflowX: 'auto' }}>
            <table>
              <thead><tr><th>순위</th><th>이름</th><th>출석</th><th>경기수</th><th>마지막 참석</th></tr></thead>
              <tbody>
                {sorted.map((r, i) => (
                  <tr key={r.key}>
                    <td>{i + 1}</td>
                    <td>{r.name}</td>
                    <td className={r.attend === topAttend && topAttend > 0 ? 'rank-1' : ''}>{r.attend}번</td>
                    <td>{r.games}</td>
                    <td style={r.days == null || r.days >= LONG_ABSENT_DAYS ? { color: 'var(--danger)', fontWeight: 700 } : undefined}>{agoLabel(r.days)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="muted mt8" style={{ fontSize: '.78rem' }}>
            "모임 종료"로 저장된 모임만 세요. 마지막 참석이 {LONG_ABSENT_DAYS}일 넘었거나 기록이 없으면 빨간색이에요.
          </div>
        </>
      )}
    </div>
  );
}
