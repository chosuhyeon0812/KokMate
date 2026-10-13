import { useAppState } from '../store';
import { useUI } from '../ui';
import * as actions from '../actions';
import { RecCard, EmptyHint } from '../components/cards';
import AttendanceModal from '../modals/AttendanceModal';
import PlayerPicker from '../modals/PlayerPicker';
import Courts from './Courts';

export default function Home() {
  const state = useAppState();
  const { toast, warn, openModal } = useUI();

  const endSession = () => {
    if (actions.todaysDoneGames(state).length === 0) { warn('저장할 경기 기록이 없습니다.'); return; }
    if (!confirm('모임을 종료할까요? 오늘 기록이 "기록" 탭의 지난 모임 목록에 저장되고, 경기 기록과 참가자 경기 수는 초기화됩니다. (회원 명단은 유지)')) return;
    actions.endSession();
    toast('모임 기록이 저장되었습니다.');
  };

  return (
    <>
      <div className="card">
        <div className="section-row">
          <h2 className="mb0">오늘 모임</h2>
          <button className="btn btn-outline btn-sm" onClick={endSession}>모임 종료</button>
        </div>
        <div className="session-row">
          <button className="btn btn-primary" onClick={() => openModal(<AttendanceModal />)}>오늘 참석자 선택</button>
        </div>
      </div>

      <Courts />

      <div className="card">
        <h2>경기 만들기</h2>
        <button className="btn btn-primary btn-block" onClick={() => openModal(<PlayerPicker mode="manual" />, { wide: true })}>직접 경기 만들기</button>
      </div>

      <div className="card">
        <div className="section-row">
          <h2 className="mb0">자동 추천</h2>
          <button className="btn btn-outline btn-sm" onClick={actions.recommend}>추천 받기</button>
        </div>
        {state.lastShortfall && (
          <EmptyHint style={{ borderColor: 'var(--danger)', background: 'var(--danger-pale)', color: 'var(--danger)', marginBottom: 10 }}>{state.lastShortfall}</EmptyHint>
        )}
        {state.pendingRecs.length === 0 ? <EmptyHint>‘추천 받기’ 버튼을 누르면 추천 조합이 생성됩니다.</EmptyHint> :
          state.pendingRecs.map((r, idx) => <RecCard key={r.court} rec={r} idx={idx} />)}
      </div>
    </>
  );
}
