import { useAppState } from '../store';
import { useUI } from '../ui';
import * as actions from '../actions';
import { StatusBadge, EmptyHint } from '../components/cards';

export default function Stats() {
  const state = useAppState();
  const { toast } = useUI();
  const sorted = state.players.slice().sort((a, b) => a.totalGames - b.totalGames);
  const minGames = sorted.length ? sorted[0].totalGames : 0;

  const reset = () => {
    if (!confirm('오늘 경기 기록과 참가자 경기 수/승패를 초기화할까요? (참가자 명단은 유지됩니다)')) return;
    actions.resetToday();
    toast('오늘 기록이 초기화되었습니다.');
  };

  return (
    <div className="card">
      <div className="section-row">
        <h2 className="mb0">📊 참가자 통계</h2>
        <button className="btn btn-outline btn-sm" onClick={reset}>오늘 기록 초기화</button>
      </div>
      {state.players.length === 0 ? <EmptyHint>참가자를 먼저 등록하세요.</EmptyHint> : (
        <>
          <div style={{ overflowX: 'auto' }}>
            <table>
              <thead><tr><th>순위</th><th>이름</th><th>경기수</th><th>승</th><th>패</th><th>상태</th></tr></thead>
              <tbody>
                {sorted.map((p, i) => {
                  const isMin = p.totalGames === minGames;
                  return (
                    <tr key={p.id} style={isMin ? { background: 'var(--primary-pale)' } : undefined}>
                      <td>{i + 1}</td>
                      <td>{p.name}</td>
                      <td className={isMin ? 'rank-1' : ''}>{p.totalGames}</td>
                      <td>{p.wins}</td>
                      <td>{p.losses}</td>
                      <td><StatusBadge player={p} /></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <div className="muted mt8" style={{ fontSize: '.78rem' }}>🟩 배경 표시 = 경기 수가 가장 적어 다음 매칭에서 우선 고려되는 참가자</div>
        </>
      )}
    </div>
  );
}
