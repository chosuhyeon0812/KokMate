import { useState } from 'react';
import { useAppState } from '../store';
import { useUI } from '../ui';
import * as actions from '../actions';
import { StatusBadge, EmptyHint } from '../components/cards';
import { playingPlayerIds, shortWait, LONG_REST_MS } from '../lib/selectors';

export default function Stats() {
  const state = useAppState();
  const { toast, ask } = useUI();
  const [sortBy, setSortBy] = useState('games');
  const playing = playingPlayerIds(state);
  // 쉬고 있는 시점. 경기 중이거나 오늘 빠진 사람은 쉬는 중이 아니라 null
  const restFrom = p => (p.active && !playing.has(p.id) && p.restSince) || null;
  // 대기 시간순: 다음 경기에 넣을 사람을 고르는 용도라 대기 → 휴식 → 경기 중/빠진 사람 순서로, 같은 무리 안에서는 오래 쉰 사람 먼저
  const group = p => (!restFrom(p) ? 2 : p.resting ? 1 : 0);
  const byRest = (a, b) => group(a) - group(b) || (restFrom(a) ?? 0) - (restFrom(b) ?? 0) || a.totalGames - b.totalGames;
  // 오늘 온 사람만 보여준다. 먼저 가서 불참으로 바꾼 사람도 오늘 뛴 경기가 있으면 남긴다.
  const todays = state.players.filter(p => p.active || p.totalGames > 0);
  const sorted = todays.slice().sort(sortBy === 'rest' ? byRest : (a, b) => a.totalGames - b.totalGames);
  // 다음 매칭 우선 표시는 지금 참석 중인 사람끼리만 비교한다.
  const minGames = Math.min(...todays.filter(p => p.active).map(p => p.totalGames));

  const reset = async () => {
    if (!(await ask('오늘 경기 기록과 경기 수가 모두 지워져요. 회원 명단은 그대로예요.', { title: '오늘 기록을 초기화할까요?', ok: '초기화', danger: true }))) return;
    actions.resetToday();
    toast('오늘 기록이 초기화되었습니다.');
  };

  return (
    <div className="card">
      <div className="section-row">
        <h2 className="mb0">참가자 통계 <span className="muted" style={{ fontSize: '.8rem', fontWeight: 600 }}>오늘 참석자</span></h2>
        <div className="pill-toggle">
          <button className={sortBy === 'games' ? 'on' : ''} onClick={() => setSortBy('games')}>경기 수순</button>
          <button className={sortBy === 'rest' ? 'on' : ''} onClick={() => setSortBy('rest')}>대기 시간순</button>
        </div>
        <button className="btn btn-outline btn-sm" onClick={reset}>오늘 기록 초기화</button>
      </div>
      {todays.length === 0 ? <EmptyHint>"코트" 탭에서 오늘 참석자를 먼저 선택하세요.</EmptyHint> : (
        <>
          <div style={{ overflowX: 'auto' }}>
            <table>
              <thead><tr><th>순위</th><th>이름</th><th>경기수</th><th>대기 시간</th><th>상태</th></tr></thead>
              <tbody>
                {sorted.map((p, i) => {
                  const isMin = sortBy === 'games' && p.active && p.totalGames === minGames;
                  const from = restFrom(p);
                  const long = from && Date.now() - from >= LONG_REST_MS;
                  return (
                    <tr key={p.id} style={isMin ? { background: 'var(--primary-pale)' } : undefined}>
                      <td>{i + 1}</td>
                      <td>{p.name}</td>
                      <td className={isMin ? 'rank-1' : ''}>{p.totalGames}</td>
                      <td style={long ? { color: 'var(--accent-dark)', fontWeight: 800 } : undefined}>{from ? shortWait(p) : '-'}</td>
                      <td><StatusBadge player={p} showTime={false} /></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <div className="muted mt8" style={{ fontSize: '.78rem' }}>
            {sortBy === 'games' ? '🟩 배경 표시 = 경기 수가 가장 적어 다음 매칭에서 우선 고려되는 참가자 · ' : ''}
            대기 시간은 마지막 경기가 끝난 뒤부터예요. 20분이 넘으면 진하게 표시돼요.
          </div>
        </>
      )}
    </div>
  );
}
