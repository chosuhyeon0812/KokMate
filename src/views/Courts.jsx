import { useAppState } from '../store';
import { useUI } from '../ui';
import { activeGameOnCourt } from '../lib/selectors';
import { MAX_WAITING } from '../lib/utils';
import { LiveCourtCard, WaitingCard, EmptyHint, Lead } from '../components/cards';
import RestManagerModal from '../modals/RestManagerModal';
import PlayerPicker from '../modals/PlayerPicker';

export default function Courts() {
  const state = useAppState();
  const { openModal } = useUI();
  const courts = Array.from({ length: state.settings.courtCount }, (_, i) => i + 1);

  return (
    <>
      <div className="card">
        <div className="section-row">
          <h2 className="mb0">🏟 코트 현황</h2>
          <button className="btn btn-outline btn-sm" onClick={() => openModal(<RestManagerModal />)}>😴 휴식 관리</button>
        </div>
        <div className="court-grid">
          {courts.map(c => {
            const g = activeGameOnCourt(state, c);
            if (g) return <LiveCourtCard key={c} game={g} />;
            return (
              <div className="court-card empty" key={c}>
                <div className="court-title"><span>{c}번 코트</span><span className="status-dot" style={{ color: 'var(--muted)' }}>⚪ 대기</span></div>
                <div className="muted center" style={{ padding: '10px 0' }}>비어 있음</div>
                <button className="btn btn-primary btn-sm btn-block" onClick={() => openModal(<PlayerPicker mode="manual" presetCourt={c} />, { wide: true })}>이 코트에서 경기 만들기</button>
              </div>
            );
          })}
        </div>
      </div>
      <div className="card">
        <div className="section-row">
          <h2 className="mb0">🕒 대기 코트 <span className="muted" style={{ fontSize: '.8rem', fontWeight: 600 }}>{state.waitingMatches.length}/{MAX_WAITING}</span></h2>
          <button className="btn btn-outline btn-sm" disabled={state.waitingMatches.length >= MAX_WAITING} onClick={() => openModal(<PlayerPicker mode="waiting" />, { wide: true })}>대기 코트 추가</button>
        </div>
        <Lead>코트가 아직 비지 않았어도 다음 경기 멤버를 미리 정해둘 수 있습니다. 코트가 비면 "코트 배정하고 시작"을 누르세요.</Lead>
        {state.waitingMatches.length === 0 ? <EmptyHint>대기 중인 다음 경기가 없습니다.</EmptyHint> : (
          <div className="court-grid">{state.waitingMatches.map(w => <WaitingCard key={w.id} match={w} />)}</div>
        )}
      </div>
    </>
  );
}
