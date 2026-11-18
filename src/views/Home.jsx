import { useAppState } from '../store';
import { useUI } from '../ui';
import * as actions from '../actions';
import { isGuest } from '../lib/utils';
import { playingPlayerIds, waitingPlayerIds } from '../lib/selectors';
import { EmptyHint } from '../components/cards';
import AttendanceModal from '../modals/AttendanceModal';
import Courts from './Courts';

export default function Home() {
  const state = useAppState();
  const { toast, warn, openModal, ask } = useUI();

  const stale = actions.isSessionStale(state);
  const attending = state.players.filter(p => p.active);
  const openAttendance = () => openModal(<AttendanceModal />, { wide: true });
  const saveStale = () => { if (actions.endStaleSession()) toast(`${actions.staleSessionLabel(state)} 모임 기록을 저장했어요.`); };

  const endSession = async () => {
    const doneCount = actions.sessionDoneGames(state).length;
    // 아직 진행 중인 경기는 결과가 없어 저장되지 않으므로, 지워진다는 걸 미리 알려준다.
    const liveCourts = state.games.filter(g => g.status === 'progress').map(g => g.court).sort((a, b) => a - b);
    const liveNote = liveCourts.length ? `${liveCourts.join(', ')}번 코트에서 아직 경기 중이에요. 이대로 종료하면 그 경기는 기록되지 않고 사라져요. (남기려면 취소하고 먼저 경기 종료를 눌러 주세요)\n\n` : '';
    if (doneCount === 0) {
      if (!liveCourts.length) { warn('저장할 경기 기록이 없어요.'); return; }
      if (!(await ask(`${liveNote}끝난 경기가 없어 저장할 기록은 없어요. 진행 중인 경기를 지우고 모임을 초기화할까요?`, { title: '모임 초기화', ok: '초기화', danger: true }))) return;
      actions.resetToday({ endOfSession: true });
      toast('모임을 초기화했어요.');
      return;
    }
    const guests = state.players.filter(isGuest).map(p => p.name);
    const rosterNote = guests.length ? `회원 명단은 그대로이고, 게스트 ${guests.length}명(${guests.join(', ')})만 명단에서 빠져요.` : '회원 명단은 그대로예요.';
    if (!(await ask(`${liveNote}오늘 기록이 "기록" 화면의 지난 모임 목록에 저장되고, 경기 기록, 경기 수, 콕 제출, 오늘 참석자, 추가한 코트가 초기화돼요. ${rosterNote}`, { title: '모임을 종료할까요?', ok: '모임 종료' }))) return;
    actions.endSession();
    toast('모임 기록을 저장했어요.');
  };

  return (
    <>
      <div className="card">
        <div className="section-row">
          <h2 className="mb0">오늘 모임</h2>
          <button type="button" className="session-end" onClick={endSession}>모임 종료</button>
        </div>
        {stale && (
          <EmptyHint style={{ borderColor: 'var(--danger)', background: 'var(--danger-pale)', color: 'var(--danger)', marginBottom: 10 }}>
            {actions.staleSessionLabel(state)} 모임이 아직 종료되지 않았어요.{" "}
            <button className="btn btn-outline btn-sm" onClick={saveStale}>지난 모임 저장</button>
          </EmptyHint>
        )}
        {/* 참석자를 고르기 전엔 큰 버튼, 고른 뒤엔 오늘 몇 명 왔는지와 지금 어디에 있는지를 한 줄로. 누르면 참석자 바꾸기. */}
        {attending.length === 0 ? (
          <div className="session-row">
            <button className="btn btn-primary" onClick={openAttendance}>오늘 참석자 선택</button>
          </div>
        ) : (
          <button type="button" className="attend-summary" onClick={openAttendance}>
            <span className="attend-summary-main">참석 <strong>{attending.length}</strong>명</span>
            <span className="attend-summary-sub">경기 중 {playingPlayerIds(state).size} · 대기 코트 {waitingPlayerIds(state).size} · 휴식 {attending.filter(p => p.resting).length}</span>
            <span className="attend-summary-edit">바꾸기 ›</span>
          </button>
        )}
      </div>

      <Courts />
    </>
  );
}
