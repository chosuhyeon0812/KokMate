import { useAppState } from '../store';
import { useUI } from '../ui';
import * as actions from '../actions';
import { todayStr } from '../lib/utils';
import { RecCard, EmptyHint } from '../components/cards';
import AttendanceModal from '../modals/AttendanceModal';
import PlayerPicker from '../modals/PlayerPicker';
import Courts from './Courts';

export default function Home() {
  const state = useAppState();
  const { toast, warn, openModal } = useUI();

  // 모임 종료를 안 누른 채 날짜가 바뀌었으면 알려준다. (지난 모임 경기 수가 오늘 경기에 섞이지 않도록)
  const startedOn = actions.sessionDate(state);
  // 자정을 넘겨 계속 치는 중일 수도 있으니, 마지막 경기 후 6시간이 지났을 때만 지난 모임으로 본다.
  const lastActivity = Math.max(0, ...state.games.map(g => g.endTime || g.startTime));
  const stale = startedOn && startedOn !== todayStr() && Date.now() - lastActivity > 6 * 3600000;
  const [, staleMonth, staleDay] = (startedOn || '').split('-').map(Number);

  const endSession = () => {
    const doneCount = actions.sessionDoneGames(state).length;
    // 아직 진행 중인 경기는 결과가 없어 저장되지 않으므로, 지워진다는 걸 미리 알려준다.
    const liveCourts = state.games.filter(g => g.status === 'progress').map(g => g.court).sort((a, b) => a - b);
    const liveNote = liveCourts.length ? `${liveCourts.join(', ')}번 코트에서 아직 경기 중이에요. 이대로 종료하면 그 경기는 기록되지 않고 사라집니다. (남기려면 취소하고 먼저 경기 종료를 눌러주세요)\n\n` : '';
    if (doneCount === 0) {
      if (!liveCourts.length) { warn('저장할 경기 기록이 없습니다.'); return; }
      if (!confirm(`${liveNote}끝난 경기가 없어 저장할 기록은 없어요. 진행 중인 경기를 지우고 모임을 초기화할까요?`)) return;
      actions.resetToday();
      toast('모임을 초기화했습니다.');
      return;
    }
    if (!confirm(`${liveNote}모임을 종료할까요? 오늘 기록이 "기록" 탭의 지난 모임 목록에 저장되고, 경기 기록과 참가자 경기 수는 초기화됩니다. (회원 명단은 유지)`)) return;
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
        {stale && (
          <EmptyHint style={{ borderColor: 'var(--danger)', background: 'var(--danger-pale)', color: 'var(--danger)', marginBottom: 10 }}>
            {staleMonth}월 {staleDay}일 모임이 아직 종료되지 않았어요. 오늘 모임을 시작하기 전에 "모임 종료"를 눌러 저장하세요.
          </EmptyHint>
        )}
        <div className="session-row">
          <button className="btn btn-primary" onClick={() => openModal(<AttendanceModal />, { wide: true })}>오늘 참석자 선택</button>
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
