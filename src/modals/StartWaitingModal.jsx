/* 경기를 종료해 코트가 비었을 때, 대기 코트를 그 코트에서 바로 시작할지 묻는 창 */
import { useAppState } from '../store';
import { useUI } from '../ui';
import * as actions from '../actions';
import { playerName, activeGameOnCourt, nextReadyWaiting } from '../lib/selectors';
import { TeamLine } from '../components/cards';

export default function StartWaitingModal({ court }) {
  const state = useAppState();
  const { toast, warn, closeModal } = useUI();
  const next = nextReadyWaiting(state);
  if (!next) return null;
  const { match: w, idx } = next;

  const start = () => {
    if (activeGameOnCourt(state, court)) { warn(`${court}번 코트에서 이미 다른 경기가 진행 중이에요.`); return; }
    closeModal();
    actions.startWaitingMatch(w.id, court);
    toast(`대기 ${idx + 1}번 경기를 ${court}번 코트에서 시작했습니다.`);
  };

  return (
    <>
      <h3>{court}번 코트가 비었어요</h3>
      <p className="muted" style={{ marginTop: -6, fontSize: '.85rem' }}>대기 {idx + 1}번 경기를 이 코트에서 바로 시작할까요?</p>
      {idx > 0 && <p className="muted" style={{ fontSize: '.78rem' }}>앞 순번 대기 코트에는 아직 경기 중인 선수가 있어서 대기 {idx + 1}번을 보여드려요.</p>}
      <div className="court-card">
        <div className="court-title"><span><span className="wait-no">대기 {idx + 1}</span> {w.gameType}</span></div>
        <TeamLine teamA={w.teamA} teamB={w.teamB} label={id => playerName(state, id)} />
      </div>
      <div className="modal-actions">
        <button className="btn btn-ghost" onClick={closeModal}>나중에</button>
        <button className="btn btn-primary" onClick={start}>{court}번 코트에서 바로 시작</button>
      </div>
    </>
  );
}
