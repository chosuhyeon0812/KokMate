import { useAppState } from '../store';
import { useUI } from '../ui';
import * as actions from '../actions';
import { sortByName } from '../lib/utils';
import { waitingDuration } from '../lib/selectors';
import { EmptyHint } from '../components/cards';

export default function RestManagerModal() {
  const state = useAppState();
  const { closeModal } = useUI();
  const rows = sortByName(state.players.filter(p => p.active));

  return (
    <>
      <h3>휴식 관리</h3>
      <div className="checklist">
        {rows.length === 0 ? <EmptyHint>당일 참여 중인 참가자가 없습니다.</EmptyHint> : rows.map(p => {
          const dur = waitingDuration(p);
          const durLabel = dur ? ` · ${p.resting ? '휴식' : '대기'} ${dur}` : '';
          return (
            <div className="crow" key={p.id}>
              <span>{p.name} <span className="muted">({p.totalGames}경기{durLabel})</span></span>
              <button className={`btn btn-sm ${p.resting ? 'btn-primary' : 'btn-ghost'}`} onClick={() => actions.toggleRest(p.id)}>{p.resting ? '휴식 중' : '휴식 지정'}</button>
            </div>
          );
        })}
      </div>
      <div className="modal-actions"><button className="btn btn-ghost" onClick={closeModal}>닫기</button></div>
    </>
  );
}
