import { useState } from 'react';
import { useAppState } from '../store';
import { useUI } from '../ui';
import * as actions from '../actions';
import { StatusBadge, EmptyHint } from '../components/cards';

export default function Stats() {
  const state = useAppState();
  const { toast } = useUI();
  const [sortBy, setSortBy] = useState('games');
  const diffs = scoreDiffs(state.games);
  const rate = p => (p.wins + p.losses ? p.wins / (p.wins + p.losses) : null);
  // 승률순: 승패 기록이 없는 사람은 맨 뒤, 승률이 같으면 승수가 많은 사람 먼저
  const byRate = (a, b) => (rate(b) ?? -1) - (rate(a) ?? -1) || b.wins - a.wins || (diffs[b.id] ?? 0) - (diffs[a.id] ?? 0);
  // 오늘 온 사람만 보여준다. 먼저 가서 불참으로 바꾼 사람도 오늘 뛴 경기가 있으면 남긴다.
  const todays = state.players.filter(p => p.active || p.totalGames > 0);
  const sorted = todays.slice().sort(sortBy === 'rate' ? byRate : (a, b) => a.totalGames - b.totalGames);
  // 다음 매칭 우선 표시는 지금 참석 중인 사람끼리만 비교한다.
  const minGames = Math.min(...todays.filter(p => p.active).map(p => p.totalGames));

  const reset = () => {
    if (!confirm('오늘 경기 기록과 참가자 경기 수/승패를 초기화할까요? (참가자 명단은 유지됩니다)')) return;
    actions.resetToday();
    toast('오늘 기록이 초기화되었습니다.');
  };

  return (
    <div className="card">
      <div className="section-row">
        <h2 className="mb0">참가자 통계 <span className="muted" style={{ fontSize: '.8rem', fontWeight: 600 }}>오늘 참석자</span></h2>
        <div className="pill-toggle">
          <button className={sortBy === 'games' ? 'on' : ''} onClick={() => setSortBy('games')}>경기 수순</button>
          <button className={sortBy === 'rate' ? 'on' : ''} onClick={() => setSortBy('rate')}>승률순</button>
        </div>
        <button className="btn btn-outline btn-sm" onClick={reset}>오늘 기록 초기화</button>
      </div>
      {todays.length === 0 ? <EmptyHint>"코트" 탭에서 오늘 참석자를 먼저 선택하세요.</EmptyHint> : (
        <>
          <div style={{ overflowX: 'auto' }}>
            <table>
              <thead><tr><th>순위</th><th>이름</th><th>경기수</th><th>승</th><th>패</th><th>승률</th><th>득실</th><th>상태</th></tr></thead>
              <tbody>
                {sorted.map((p, i) => {
                  const isMin = sortBy === 'games' && p.active && p.totalGames === minGames;
                  return (
                    <tr key={p.id} style={isMin ? { background: 'var(--primary-pale)' } : undefined}>
                      <td>{i + 1}</td>
                      <td>{p.name}</td>
                      <td className={isMin ? 'rank-1' : ''}>{p.totalGames}</td>
                      <td>{p.wins}</td>
                      <td>{p.losses}</td>
                      <td className={sortBy === 'rate' && i === 0 && rate(p) != null ? 'rank-1' : ''}>{rate(p) == null ? '-' : `${Math.round(rate(p) * 100)}%`}</td>
                      <td>{diffs[p.id] == null ? '-' : diffs[p.id] > 0 ? `+${diffs[p.id]}` : diffs[p.id]}</td>
                      <td><StatusBadge player={p} /></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <div className="muted mt8" style={{ fontSize: '.78rem' }}>
            {sortBy === 'games' ? '🟩 배경 표시 = 경기 수가 가장 적어 다음 매칭에서 우선 고려되는 참가자 · ' : ''}
            승률은 승패를 기록한 경기만, 득실은 점수를 입력한 경기만 계산합니다.
          </div>
        </>
      )}
    </div>
  );
}

// 점수가 입력된 끝난 경기만 모아서 선수별 (내 팀 점수 - 상대 점수) 합계를 구한다.
function scoreDiffs(games) {
  const diffs = {};
  games.forEach(g => {
    if (g.status !== 'done' || g.scoreA == null || g.scoreB == null) return;
    const add = (ids, d) => ids.forEach(id => { diffs[id] = (diffs[id] ?? 0) + d; });
    add(g.teamA, g.scoreA - g.scoreB);
    add(g.teamB, g.scoreB - g.scoreA);
  });
  return diffs;
}
