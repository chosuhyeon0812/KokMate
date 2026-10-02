import { useAppState } from '../store';
import { useUI } from '../ui';
import * as actions from '../actions';
import { sortByName, shuttleQuota } from '../lib/utils';
import { GenderBadge, EmptyHint, Lead } from '../components/cards';

export default function Shuttles() {
  const state = useAppState();
  const { toast } = useUI();
  const players = sortByName(state.players);
  const doneCount = players.filter(p => p.shuttleDone).length;

  const reset = () => {
    if (!confirm('모든 참가자의 콕 제출 상태를 미제출로 초기화할까요?')) return;
    actions.resetShuttles();
    toast('콕 제출 상태가 초기화되었습니다.');
  };

  return (
    <div className="card">
      <div className="section-row">
        <h2 className="mb0">🏸 콕 관리</h2>
        <button className="btn btn-outline btn-sm" onClick={reset}>전체 미제출로 초기화</button>
      </div>
      <Lead>남자는 3개, 여자는 2개씩 콕(셔틀콕)을 받아야 합니다. 받은 사람은 체크해주세요.</Lead>
      {players.length === 0 ? <EmptyHint>참가자를 먼저 등록하세요.</EmptyHint> : (
        <>
          <div className="summary-grid">
            <div className="summary-box"><div className="num">{doneCount} / {players.length}</div><div className="lbl">제출 완료</div></div>
          </div>
          <div style={{ overflowX: 'auto' }}>
            <table>
              <thead><tr><th>이름</th><th>성별</th><th>필요 개수</th><th>상태</th><th>관리</th></tr></thead>
              <tbody>
                {players.map(p => (
                  <tr key={p.id}>
                    <td>{p.name}</td>
                    <td><GenderBadge gender={p.gender} /></td>
                    <td>{shuttleQuota(p)}개</td>
                    <td>{p.shuttleDone ? <span className="badge badge-active">제출 완료</span> : <span className="badge badge-rest">미제출</span>}</td>
                    <td className="row-actions">
                      <button className={`btn ${p.shuttleDone ? 'btn-ghost' : 'btn-primary'} btn-sm`} onClick={() => actions.toggleShuttle(p.id)}>{p.shuttleDone ? '미제출로 변경' : '제출 완료로 변경'}</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
