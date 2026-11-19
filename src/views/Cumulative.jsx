/* 누적 기록: 저장된 지난 모임들로 회원별 출석 횟수, 경기 수, 마지막 참석일을 모아 보여준다. */
import { useState } from 'react';
import { useAppState } from '../store';
import { useUI } from '../ui';
import { EmptyHint, ShareButton } from '../components/cards';
import PlayerFormModal from '../modals/PlayerFormModal';
import { todayStr } from '../lib/utils';
import { cumulativeRows } from '../lib/cumulative';
import { shareRanking, rankOf } from '../lib/shareImage';

const PERIODS = [['week', '주간'], ['month', '월간'], ['year', '연간'], ['all', '전체']];
const BACK_LABEL = { month: '이번 달로', year: '올해로' };
const SORTS = [['attend', '출석순'], ['games', '경기순']];
const LONG_ABSENT_DAYS = 30; // 이만큼 안 나왔으면 빨간색으로

function agoLabel(days) {
  if (days == null) return '기록 없음';
  return days === 0 ? '오늘' : days === 1 ? '어제' : `${days}일 전`;
}

export default function Cumulative() {
  const state = useAppState();
  const { toast, warn, openModal } = useUI();
  const [period, setPeriod] = useState('month');
  const [offset, setOffset] = useState(0); // 0 = 이번 주·달·해, -1 = 지난번 ...
  const [sortBy, setSortBy] = useState('attend');
  const today = todayStr();
  const { range, sessions, rows: list } = cumulativeRows(state, period, today, offset);
  // 가장 오래된 모임보다 앞으로는 못 가고, 이번 주·달·해보다 뒤로도 못 간다.
  const firstDate = state.sessionHistory.reduce((m, s) => (!m || s.date < m ? s.date : m), null);
  const canPrev = firstDate != null && firstDate < range.from;
  const canNext = offset < 0;
  const pickPeriod = k => { setPeriod(k); setOffset(0); };

  const byName = (a, b) => a.name.localeCompare(b.name, 'ko');
  const sorters = {
    attend: (a, b) => b.attend - a.attend || b.games - a.games || byName(a, b),
    games: (a, b) => b.games - a.games || b.attend - a.attend || byName(a, b),
  };
  // 그 기간에 한 번도 안 온 사람(0번)은 표에서 뺀다.
  const sorted = list.filter(r => r.attend > 0).sort(sorters[sortBy]);
  const topAttend = Math.max(0, ...list.map(r => r.attend));
  const topGames = Math.max(0, ...list.map(r => r.games));
  // 출석순이면 출석왕, 경기순이면 경기왕
  const top = sortBy === 'attend' ? topAttend : topGames;
  const kings = top > 0 ? list.filter(r => r[sortBy] === top).sort(byName) : [];
  // "지난달 출석왕", "2026년 9월 출석 순위"처럼 쓰는 이름
  const periodName = range.tag || range.title;
  // 출석순이면 출석·경기 수가 둘 다 같아야, 경기순이면 경기·출석이 둘 다 같아야 같은 순위
  const ranks = rankOf(sorted, (a, b) => a.attend === b.attend && a.games === b.games);

  // 지금 보고 있는 기간·정렬 그대로 사진으로 만든다.
  const shareCumulativeImage = async () => {
    const shown = sorted.map((r, i) => ({ ...r, rank: ranks[i] }));
    if (shown.length === 0) { warn(`${periodName} 출석 기록이 없어요.`); return; }
    try {
      const result = await shareRanking({
        title: `${periodName} ${sortBy === 'attend' ? '출석' : '경기'} 순위`,
        subtitle: `${period === 'all' ? today : range.title} · 모임 ${sessions.length}번`,
        columns: ['출석', '경기수'],
        rows: shown.map(r => ({ rank: r.rank, name: r.name, level: r.level, gender: r.gender, values: [`${r.attend}번`, r.games] })),
        filename: `콕메이트-${periodName.replace(/[ ~]+/g, '')}-순위-${today}.png`,
      });
      if (result === 'saved') toast('사진을 저장했어요.');
    } catch (e) {
      warn('사진을 만들지 못했어요.');
    }
  };

  return (
    <div className="card">
      <div className="section-row">
        <h2 className="mb0">누적 기록 <span className="h2-sub">{periodName} 모임 {sessions.length}번</span></h2>
        <div className="pill-toggle">
          {PERIODS.map(([k, label]) => <button key={k} className={period === k ? 'on' : ''} onClick={() => pickPeriod(k)}>{label}</button>)}
        </div>
      </div>
      {period !== 'all' && (
        <div className="cal-head">
          <button type="button" className="cal-nav" aria-label="이전" disabled={!canPrev} onClick={() => setOffset(o => o - 1)}>‹</button>
          <div className="period-title">
            <div className="cal-title">{range.title}</div>
            {/* 날짜만 보여주고 "이번 주/지난달/올해" 같은 작은 글씨는 안 붙인다. 주간은 "이번 주로 ↩"도 없다 */}
            {!range.tag && period !== 'week' && <button type="button" className="period-back" onClick={() => setOffset(0)}>{BACK_LABEL[period]} ↩</button>}
          </div>
          <button type="button" className="cal-nav" aria-label="다음" disabled={!canNext} onClick={() => setOffset(o => o + 1)}>›</button>
        </div>
      )}
      {state.sessionHistory.length === 0 ? <EmptyHint>아직 저장된 모임이 없어요. 모임이 끝나면 "모임 종료"를 눌러 저장하세요.</EmptyHint> : (
        <>
          {kings.length > 0 && (
            <div className="attend-king">👑 {periodName} {sortBy === 'attend' ? '출석왕' : '경기왕'} <b>{kings.map(r => r.name).join(', ')}</b> <span className="muted">({top}{sortBy === 'attend' ? '번' : '경기'})</span></div>
          )}
          <div className="section-row" style={{ marginBottom: 8 }}>
            <div className="pill-toggle">
              {SORTS.map(([k, label]) => <button key={k} className={sortBy === k ? 'on' : ''} onClick={() => setSortBy(k)}>{label}</button>)}
            </div>
            <ShareButton onClick={shareCumulativeImage} />
          </div>
          {sorted.length === 0 ? <EmptyHint>이 기간에는 출석 기록이 없어요.</EmptyHint> : <div style={{ overflowX: 'auto' }}>
            <table className="rank-table">
              <thead><tr><th>순위</th><th>이름</th><th>출석</th><th>경기수</th><th>마지막 참석</th></tr></thead>
              <tbody>
                {sorted.map((r, i) => (
                  <tr key={r.key} className="clickable-row" onClick={() => openModal(<PlayerFormModal playerId={r.key} />)}>
                    <td>{ranks[i]}</td>
                    <td>{r.name} <span className="name-level">{r.level}</span></td>
                    <td className={sortBy === 'attend' && r.attend === topAttend && topAttend > 0 ? 'rank-1' : ''}>{r.attend}번</td>
                    <td className={sortBy === 'games' && r.games === topGames && topGames > 0 ? 'rank-1' : ''}>{r.games}</td>
                    <td style={r.days == null || r.days >= LONG_ABSENT_DAYS ? { color: 'var(--danger)', fontWeight: 700 } : undefined}>{agoLabel(r.days)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>}
          <div className="muted mt8" style={{ fontSize: '.78rem' }}>
            "모임 종료"로 저장된 모임만 세요. 그 기간에 안 온 사람은 안 나와요. 마지막 참석이 {LONG_ABSENT_DAYS}일 넘었거나 기록이 없으면 빨간색이에요.
          </div>
        </>
      )}
    </div>
  );
}
