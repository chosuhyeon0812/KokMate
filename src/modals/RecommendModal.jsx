/* 자동 추천: 주로 직접 고르는 모임이라 코트 화면에서는 빼고, 오른쪽 위 ✨ 버튼으로 연다. */
import { useAppState } from '../store';
import { useUI } from '../ui';
import * as actions from '../actions';
import { RecCard, EmptyHint } from '../components/cards';

export default function RecommendModal() {
  const state = useAppState();
  const { closeModal } = useUI();

  return (
    <>
      <div className="section-row">
        <h3 className="mb0">✨ 자동 추천</h3>
        <div className="row-actions">
          {(state.pendingRecs.length > 0 || state.lastShortfall) && <button className="btn btn-ghost btn-sm" onClick={actions.clearRecs}>추천 지우기</button>}
          <button className="btn btn-outline btn-sm" onClick={actions.recommend}>{state.pendingRecs.length ? '다시 추천' : '추천 받기'}</button>
        </div>
      </div>
      <p className="muted" style={{ fontSize: '.88rem', margin: '6px 0 12px' }}>경기 수와 급수를 보고 4명씩 짜줘요. 참고용이니 마음에 들 때만 쓰세요.</p>
      {state.lastShortfall && (
        <EmptyHint style={{ borderColor: 'var(--danger)', background: 'var(--danger-pale)', color: 'var(--danger)', marginBottom: 10 }}>{state.lastShortfall}</EmptyHint>
      )}
      {state.pendingRecs.length === 0 ? <EmptyHint>‘추천 받기’를 누르면 추천 조합이 나와요.</EmptyHint> :
        state.pendingRecs.map((r, idx) => <RecCard key={r.court} rec={r} idx={idx} />)}
      <div className="modal-actions"><button className="btn btn-ghost" onClick={closeModal}>닫기</button></div>
    </>
  );
}
