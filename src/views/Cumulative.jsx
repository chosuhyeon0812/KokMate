/* 누적 기록: 저장된 지난 모임들로 회원별 출석 횟수, 경기 수, 마지막 참석일을 모아 보여준다. */
import { useState } from 'react';
import { useAppState } from '../store';
import { useUI } from '../ui';
import { EmptyHint } from '../components/cards';
import { todayStr } from '../lib/utils';
import { cumulativeRows } from '../lib/cumulative';
import { shareRanking, rankOf } from '../lib/shareImage';

const PERIODS = [['month', '이번 달'], ['year', '올해'], ['all', '전체']];
const SORTS = [['attend', '출석순'], ['games', '경기순']];
const LONG_ABSENT_DAYS = 30; // 이만큼 안 나왔으면 빨간색으로

function agoLabel(days) {
  if (days == null) return '기록 없음';
  return days === 0 ? '오늘' : days === 1 ? '어제' : `${days}일 전`;
}

export default function Cumulative() {
  const state = useAppState();
  const { toast, warn } = useUI();
  const [period, setPeriod] = useState('month');
  const [sortBy, setSortBy] = useState('attend');
  const today = todayStr();
  const { sessions, rows: list } = cumulativeRows(state, period, today);

  const byName = (a, b) => a.name.localeCompare(b.name, 'ko');
  const sorters = {
    attend: (a, b) => b.attend - a.attend || b.games - a.games || byName(a, b),
    games: (a, b) => b.games - a.games || b.attend - a.attend || byName(a, b),
  };
  const sorted = list.slice().sort(sorters[sortBy]);
  const topAttend = Math.max(0, ...list.map(r => r.attend));
  const kings = topAttend > 0 ? list.filter(r => r.attend === topAttend).sort(byName) : [];
  const periodName = PERIODS.find(([k]) => k === period)[1];
  // 출석순이면 출석·경기 수가 둘 다 같아야, 경기순이면 경기·출석이 둘 다 같아야 같은 순위
  const ranks = rankOf(sorted, (a, b) => a.attend === b.attend && a.games === b.games);

  // 지금 보고 있는 기간·정렬 그대로 사진으로 만든다. 그 기간에 한 번도 안 온 사람은 뺀다.
  const shareCumulativeImage = async () => {
    const shown = sorted.map((r, i) => ({ ...r, rank: ranks[i] })).filter(r => r.attend > 0);
    if (shown.length === 0) { warn(`${periodName} 출석 기록이 없어요.`); return; }
    try {
      const result = await shareRanking({
        title: `${periodName} ${sortBy === 'attend' ? '출석' : '경기'} 순위`,
        subtitle: `${today} · ${periodName} 모임 ${sessions.length}번`,
        columns: ['출석', '경기수'],
        rows: shown.map(r => ({ rank: r.rank, name: r.name, level: r.level, gender: r.gender, values: [`${r.attend}번`, r.games] })),
        filename: `콕메이트-${periodName}-순위-${today}.png`,
      });
      if (result === 'saved') toast('사진을 저장했어요.');
    } catch (e) {
      warn('사진을 만들지 못했어요.');
    }
  };

  return (
    <div className="card">
      <div className="section-row">
        <h2 className="mb0">누적 기록 <span className="muted" style={{ fontSize: '.8rem', fontWeight: 600 }}>{periodName} 모임 {sessions.length}번</span></h2>
        <div className="pill-toggle">
          {PERIODS.map(([k, label]) => <button key={k} className={period === k ? 'on' : ''} onClick={() => setPeriod(k)}>{label}</button>)}
        </div>
      </div>
      {state.sessionHistory.length === 0 ? <EmptyHint>아직 저장된 모임이 없어요. 모임이 끝나면 "모임 종료"를 눌러 저장하세요.</EmptyHint> : (
        <>
          {kings.length > 0 && (
            <div className="attend-king">👑 {periodName} 출석왕 <b>{kings.map(r => r.name).join(', ')}</b> <span className="muted">({topAttend}번)</span></div>
          )}
          <div className="section-row" style={{ marginBottom: 8 }}>
            <div className="pill-toggle">
              {SORTS.map(([k, label]) => <button key={k} className={sortBy === k ? 'on' : ''} onClick={() => setSortBy(k)}>{label}</button>)}
            </div>
            <button className="btn btn-outline btn-sm" onClick={shareCumulativeImage}>공유</button>
          </div>
          <div style={{ overflowX: 'auto' }}>
            <table>
              <thead><tr><th>순위</th><th>이름</th><th>출석</th><th>경기수</th><th>마지막 참석</th></tr></thead>
              <tbody>
                {sorted.map((r, i) => (
                  <tr key={r.key}>
                    <td>{ranks[i]}</td>
                    <td>{r.name} <span className="name-level">{r.level}</span></td>
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
