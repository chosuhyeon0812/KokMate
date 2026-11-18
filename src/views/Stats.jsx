import { useAppState } from '../store';
import { useUI } from '../ui';
import * as actions from '../actions';
import { StatusBadge, EmptyHint, RankLabel, RankName, ShareButton } from '../components/cards';
import PlayerFormModal from '../modals/PlayerFormModal';
import { playingPlayerIds, shortWait, LONG_REST_MS } from '../lib/selectors';
import { todayStr } from '../lib/utils';
import { shareRanking, rankOf } from '../lib/shareImage';

export default function Stats() {
  const state = useAppState();
  const { toast, warn, ask, openModal } = useUI();
  const playing = playingPlayerIds(state);
  // 쉬고 있는 시점. 경기 중이거나 오늘 빠진 사람은 쉬는 중이 아니라 null
  const restFrom = p => (p.active && !playing.has(p.id) && p.restSince) || null;
  // 오늘 온 사람만 보여준다. 먼저 가서 불참으로 바꾼 사람도 오늘 뛴 경기가 있으면 남긴다.
  const todays = state.players.filter(p => p.active || p.totalGames > 0);
  // 사진(오늘 경기 순위)과 똑같이 많이 친 사람부터, 같은 경기 수는 같은 순위.
  const byGames = (a, b) => b.totalGames - a.totalGames || a.name.localeCompare(b.name, 'ko');
  const sorted = todays.slice().sort(byGames);
  const ranks = rankOf(sorted, (a, b) => a.totalGames === b.totalGames);
  // 다음 매칭 우선 표시는 지금 참석 중인 사람끼리만 비교한다.
  const minGames = Math.min(...todays.filter(p => p.active).map(p => p.totalGames));

  const shareTodayImage = async () => {
    const list = todays.slice().sort(byGames);
    const ranks = rankOf(list, (a, b) => a.totalGames === b.totalGames);
    const doneGames = state.games.filter(g => g.status === 'done').length;
    try {
      const result = await shareRanking({
        title: '오늘 경기 순위', subtitle: `${todayStr()} · 오늘 경기 ${doneGames}판`, columns: ['경기수'],
        rows: list.map((p, i) => ({ rank: ranks[i], name: p.name, level: p.level, gender: p.gender, values: [p.totalGames] })),
        filename: `콕메이트-오늘경기-${todayStr()}.png`,
      });
      if (result === 'saved') toast('사진을 저장했어요.');
    } catch (e) {
      warn('사진을 만들지 못했어요.');
    }
  };

  const reset = async () => {
    if (!(await ask('오늘 경기 기록과 경기 수가 모두 지워져요. 회원 명단은 그대로예요.', { title: '오늘 기록을 초기화할까요?', ok: '초기화', danger: true }))) return;
    actions.resetToday();
    toast('오늘 기록을 초기화했어요.');
  };

  return (
    <div className="card">
      <div className="section-row">
        <h2 className="mb0">오늘 순위</h2>
        <div className="row-actions">
          {todays.length > 0 && <ShareButton onClick={shareTodayImage} />}
          <button type="button" className="quiet-pill" onClick={reset}>초기화</button>
        </div>
      </div>
      {todays.length === 0 ? <EmptyHint>"매칭" 화면에서 오늘 참석자를 먼저 선택하세요.</EmptyHint> : (
        <>
          <div style={{ overflowX: 'auto' }}>
            <table className="rank-table">
              <thead><tr><th>순위</th><th>이름</th><th>경기수</th><th>대기 시간</th><th>상태</th></tr></thead>
              <tbody>
                {sorted.map((p, i) => {
                  const isMin = p.active && p.totalGames === minGames;
                  const from = restFrom(p);
                  const long = from && Date.now() - from >= LONG_REST_MS;
                  return (
                    <tr key={p.id} className="clickable-row" style={isMin ? { background: 'var(--primary-pale)' } : undefined} onClick={() => openModal(<PlayerFormModal playerId={p.id} />)}>
                      <td className="rank-cell"><RankLabel rank={ranks[i]} /></td>
                      <td><RankName person={p} /></td>
                      <td className={isMin ? 'rank-1' : ''}>{p.totalGames}</td>
                      <td style={long ? { color: 'var(--accent-dark)', fontWeight: 800 } : undefined}>{from ? shortWait(p) : '-'}</td>
                      <td><StatusBadge player={p} showTime={false} /></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
