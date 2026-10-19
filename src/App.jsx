import { useEffect, useMemo, useRef, useState } from 'react';
import { UIContext } from './ui';
import logo from './assets/logo.svg';
import Home from './views/Home';
import Players from './views/Players';
import Shuttles from './views/Shuttles';
import Records from './views/Records';
import Help from './views/Help';
import Welcome from './views/Welcome';
import { isFreshDevice, useAppState } from './store';
import RecommendModal from './modals/RecommendModal';
import { syncEnabled, useSync, WELCOME_DONE_KEY, readInviteCode } from './lib/sync';
import { TeamInfoModal } from './components/TeamCard';

const TABS = [
  { key: 'home', label: '🏟 코트', View: Home },
  { key: 'players', label: '👥 참가자', View: Players },
  { key: 'shuttles', label: '🏸 콕', View: Shuttles },
  { key: 'records', label: '📋 기록', View: Records },
];
// 사용법은 탭 대신 오른쪽 위 ? 버튼으로 연다.
const VIEWS = [...TABS, { key: 'help', View: Help }];

export default function App() {
  const [view, setView] = useState('home');
  const [modal, setModal] = useState(null); // { content, wide }
  const [toastMsg, setToastMsg] = useState(null); // { msg, id }
  const [askDlg, setAskDlg] = useState(null); // { message, title, ok, danger, resolve }
  const [, setTick] = useState(0);
  const toastTimer = useRef();
  const { team } = useSync();
  const hasRecs = useAppState().pendingRecs.length > 0;
  const [welcomeDone, setWelcomeDone] = useState(() => { try { return !!localStorage.getItem(WELCOME_DONE_KEY); } catch (e) { return false; } });
  // 처음 여는 기기에만 팀 만들기 / 참여 화면을 보여준다. (예전부터 쓰던 기기는 바로 앱으로)
  const showWelcome = syncEnabled && isFreshDevice && !team && !welcomeDone;
  // 초대 링크로 들어왔고 아직 그 팀이 아니면, 코드가 들어간 참여 화면을 보여준다.
  const [invite, setInvite] = useState(() => (syncEnabled ? readInviteCode() : null));
  const showInvite = !!invite && (!team || team.code !== invite);
  const skipWelcome = () => {
    try { localStorage.setItem(WELCOME_DONE_KEY, '1'); } catch (e) { /* 저장 못 해도 이번엔 넘어간다 */ }
    setWelcomeDone(true);
  };

  // 대기/휴식 시간이 화면에 실시간으로 반영되도록 주기적으로 다시 그린다.
  useEffect(() => {
    const t = setInterval(() => setTick(x => x + 1), 30000);
    return () => clearInterval(t);
  }, []);

  const ui = useMemo(() => {
    const show = (msg, type, ms, action) => {
      setToastMsg({ msg, type, action, id: Date.now() });
      clearTimeout(toastTimer.current);
      toastTimer.current = setTimeout(() => setToastMsg(null), ms);
    };
    return {
      // 성공 안내(✓) / 경고(⚠, 읽을 시간이 필요해 조금 더 오래 표시)
      // opts.action = { label, onClick } 이면 토스트에 버튼(예: 되돌리기)을 달고 누를 시간을 넉넉히 준다.
      toast(msg, opts) { show(msg, 'success', opts && opts.action ? 6000 : 2200, opts && opts.action); },
      warn(msg) { show(msg, 'warn', 3200); },
      openModal(content, opts) { setModal({ content, wide: !!(opts && opts.wide) }); },
      // 브라우저 기본 confirm 대신 앱 모양의 확인 창. 누른 결과(true/false)를 돌려준다. 열린 모달 위에 겹쳐서 뜬다.
      ask(message, opts = {}) { return new Promise(resolve => setAskDlg({ message, ...opts, resolve })); },
      closeModal() { setModal(null); },
      switchView: setView,
    };
  }, []);

  const { View } = VIEWS.find(t => t.key === view);
  const today = new Date().toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric', weekday: 'short' });

  return (
    <UIContext.Provider value={ui}>
      <header className="topbar">
        <div className="brand">
          <img src={logo} alt="로고" className="brand-logo" />
          <div className="brand-text">
            {/* 팀에 들어가 있으면 팀 이름(예: 씬민턴)을 크게 보여준다 */}
            <strong>{team ? team.name : '배드민턴 매칭'}</strong>
            <span>{team ? '배드민턴 매칭' : '소규모 모임 경기 운영 도우미'}</span>
          </div>
        </div>
        <div className="topbar-right">
          <div className="topbar-meta"><span>{today}</span></div>
          {/* 자동 추천은 잘 안 써서 숨겨둔 기능. 추천이 남아 있으면 작은 점으로 알려준다 */}
          {!showWelcome && !showInvite && <button className="help-btn sparkle-btn" title="자동 추천" aria-label="자동 추천" onClick={() => ui.openModal(<RecommendModal />, { wide: true })}>✨{hasRecs && <span className="sparkle-dot" />}</button>}
          {syncEnabled && !showWelcome && !showInvite && <button className="help-btn" title="설정" aria-label="설정" onClick={() => ui.openModal(<TeamInfoModal />)}>⚙️</button>}
          <button className={`help-btn${view === 'help' ? ' active' : ''}`} title="사용법" aria-label="사용법" onClick={() => setView(view === 'help' ? 'home' : 'help')}>?</button>
        </div>
      </header>

      {showInvite ? <Welcome initialCode={invite} onSkip={() => setInvite(null)} /> : showWelcome ? <Welcome onSkip={skipWelcome} /> : (<>
      <nav className="tabbar">
        {TABS.map(t => (
          <button key={t.key} className={`tab-btn${view === t.key ? ' active' : ''}`} onClick={() => setView(t.key)}>{t.label}</button>
        ))}
      </nav>

      <main><View /></main>
      </>)}

      {modal && (
        <div className="modal-root" onClick={e => { if (e.target === e.currentTarget) ui.closeModal(); }}>
          <div className={`modal-box${modal.wide ? ' wide' : ''}`}>{modal.content}</div>
        </div>
      )}
      {askDlg && (
        <div className="modal-root ask-root" onClick={e => { if (e.target === e.currentTarget) { askDlg.resolve(false); setAskDlg(null); } }}>
          <div className="modal-box ask-box" role="alertdialog" aria-modal="true">
            {askDlg.title && <h3>{askDlg.title}</h3>}
            <p className="ask-message">{askDlg.message}</p>
            <div className="modal-actions">
              <button className="btn btn-ghost" onClick={() => { askDlg.resolve(false); setAskDlg(null); }}>취소</button>
              <button className={`btn ${askDlg.danger ? 'btn-danger' : 'btn-primary'}`} autoFocus onClick={() => { askDlg.resolve(true); setAskDlg(null); }}>{askDlg.ok || '확인'}</button>
            </div>
          </div>
        </div>
      )}
      {toastMsg && (
        <div key={toastMsg.id} className={`toast toast-${toastMsg.type}`} role={toastMsg.type === 'warn' ? 'alert' : 'status'}>
          {toastMsg.msg}
          {toastMsg.action && (
            <button className="toast-action" onClick={() => { setToastMsg(null); toastMsg.action.onClick(); }}>{toastMsg.action.label}</button>
          )}
        </div>
      )}
    </UIContext.Provider>
  );
}
