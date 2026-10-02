import { useState } from 'react';
import { useAppState } from '../store';
import { useUI } from '../ui';
import * as actions from '../actions';
import { LiveCourtCard, RecCard, EmptyHint, Lead } from '../components/cards';
import AttendanceModal from '../modals/AttendanceModal';
import RestManagerModal from '../modals/RestManagerModal';
import PlayerPicker from '../modals/PlayerPicker';

export default function Home() {
  const state = useAppState();
  const { toast, warn, openModal } = useUI();
  const [courtInput, setCourtInput] = useState(String(state.settings.courtCount));
  const progressGames = state.games.filter(g => g.status === 'progress');

  const saveSettings = () => {
    actions.saveSettings(courtInput);
    setCourtInput(String(Math.max(1, Number(courtInput) || 1)));
    toast('설정이 저장되었습니다.');
  };

  const endSession = () => {
    if (actions.todaysDoneGames(state).length === 0) { warn('저장할 경기 기록이 없습니다.'); return; }
    if (!confirm('모임을 종료할까요? 오늘 기록이 "경기 기록" 탭의 지난 모임 목록에 저장되고, 경기 기록과 참가자 경기 수는 초기화됩니다.')) return;
    actions.endSession();
    toast('모임 기록이 저장되었습니다.');
  };

  return (
    <>
      <div className="card">
        <div className="section-row"><h2 className="mb0">👋 오늘 모임</h2></div>
        <Lead>전체 회원 중 오늘 참석하는 사람만 골라두면 매칭이 그 사람들 안에서만 이뤄집니다. 모임이 끝나면 기록을 저장하고 초기화하세요.</Lead>
        <div className="row-actions">
          <button className="btn btn-primary btn-sm" onClick={() => openModal(<AttendanceModal />)}>오늘 참석자 선택</button>
          <button className="btn btn-outline btn-sm" onClick={endSession}>모임 종료 (저장 후 초기화)</button>
        </div>
      </div>

      <div className="card">
        <h2>⚙️ 코트 설정</h2>
        <div className="settings-grid">
          <div className="field">
            <label>코트 수</label>
            <input type="number" min="1" max="20" value={courtInput} onChange={e => setCourtInput(e.target.value)} />
          </div>
          <button className="btn btn-ghost" onClick={saveSettings}>설정 저장</button>
        </div>
        <div className="muted mt8" style={{ fontSize: '.76rem' }}>남복 / 여복 / 혼복 종목은 그때그때 참여 인원 상황에 맞춰 앱이 자동으로 정합니다.</div>
      </div>

      <div className="card">
        <div className="section-row"><h2 className="mb0">🟢 진행 중인 경기</h2></div>
        {progressGames.length === 0 ? <EmptyHint>진행 중인 경기가 없습니다.</EmptyHint> : (
          <div className="court-grid">{progressGames.map(g => <LiveCourtCard key={g.id} game={g} />)}</div>
        )}
      </div>

      <div className="card">
        <div className="section-row"><h2 className="mb0">🛠 경기 만들기</h2></div>
        <Lead>기본적으로 운영진이 직접 코트별 팀을 구성합니다.</Lead>
        <button className="btn btn-primary btn-block" onClick={() => openModal(<PlayerPicker mode="manual" />, { wide: true })}>직접 경기 만들기</button>
        <div className="card-actions">
          <button className="btn btn-outline btn-sm" onClick={() => openModal(<RestManagerModal />)}>휴식 관리</button>
        </div>
      </div>

      <div className="card">
        <div className="section-row">
          <h2 className="mb0">🎯 자동 매칭 추천 <span className="muted" style={{ fontSize: '.72rem', fontWeight: 500 }}>(선택 기능)</span></h2>
          <button className="btn btn-outline btn-sm" onClick={actions.recommend}>추천 받기</button>
        </div>
        <Lead>직접 짜기 번거로울 때, 참고할 조합을 추가로 추천해드립니다.</Lead>
        {state.lastShortfall && (
          <EmptyHint style={{ borderColor: 'var(--danger)', background: 'var(--danger-pale)', color: 'var(--danger)', marginBottom: 10 }}>{state.lastShortfall}</EmptyHint>
        )}
        {state.pendingRecs.length === 0 ? <EmptyHint>‘추천 받기’ 버튼을 누르면 추천 조합이 생성됩니다.</EmptyHint> :
          state.pendingRecs.map((r, idx) => <RecCard key={r.court} rec={r} idx={idx} />)}
      </div>
    </>
  );
}
