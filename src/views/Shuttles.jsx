import { useAppState } from '../store';
import { useUI } from '../ui';
import * as actions from '../actions';
import { sortByName } from '../lib/utils';
import { GenderBadge, EmptyHint } from '../components/cards';

export default function Shuttles() {
  const state = useAppState();
  const { toast, ask } = useUI();
  // 콕은 그날 경기에 쓰는 거라 오늘 참석자만 보여준다. (휴식 중이어도 참석자면 포함)
  const players = sortByName(state.players.filter(p => p.active));
  const doneCount = players.filter(p => p.shuttleDone).length;

  const reset = async () => {
    if (!(await ask('모든 사람의 콕 제출 표시와 비고가 지워져요.', { title: '콕 제출 상태를 초기화할까요?', ok: '초기화', danger: true }))) return;
    actions.resetShuttles();
    toast('콕 제출 상태가 초기화되었습니다.');
  };

  return (
    <div className="card">
      <div className="section-row">
        <h2 className="mb0">콕 관리 <span className="muted" style={{ fontSize: '.8rem', fontWeight: 600 }}>오늘 참석자</span></h2>
        <button className="btn btn-outline btn-sm" onClick={reset}>전체 초기화</button>
      </div>
      {players.length === 0 ? <EmptyHint>"코트" 화면에서 오늘 참석자를 먼저 선택하세요.</EmptyHint> : (
        <>
          <div className="summary-grid">
            <div className="summary-box"><div className="num">{doneCount} / {players.length}</div><div className="lbl">콕 제출</div></div>
          </div>
          <div style={{ overflowX: 'auto' }}>
            <table className="shuttle-table">
              <thead><tr><th>이름</th><th>성별</th><th>콕</th><th>비고</th></tr></thead>
              <tbody>
                {players.map(p => (
                  <tr key={p.id}>
                    <td>{p.name}</td>
                    <td><GenderBadge gender={p.gender} /></td>
                    <td>
                      <button className={`shuttle-toggle${p.shuttleDone ? ' on' : ''}`} aria-pressed={p.shuttleDone} aria-label={`${p.name} 콕 ${p.shuttleDone ? '제출함' : '아직 안 냄'}`} onClick={() => actions.toggleShuttle(p.id)}>
                        {p.shuttleDone ? '✓' : '−'}
                      </button>
                    </td>
                    <td>
                      <input className="shuttle-note" type="text" placeholder="예: 게스트 현금, 계좌 입금"
                        value={p.shuttleNote || ''} onChange={e => actions.setShuttleNote(p.id, e.target.value)} />
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
