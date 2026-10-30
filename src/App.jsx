import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { UIContext } from './ui';
import Home from './views/Home';
import Menu from './views/Menu';
import Players from './views/Players';
import Shuttles from './views/Shuttles';
import Records from './views/Records';
import Help from './views/Help';
import Welcome from './views/Welcome';
import { isFreshDevice, getState } from './store';
import { isSessionStale, endStaleSession, staleSessionLabel } from './actions';
import { syncEnabled, useSync, WELCOME_DONE_KEY, readInviteCode } from './lib/sync';
import Splash from './components/Splash';

// 홈 메뉴에서 각 화면으로 들어가고, 화면 맨 위 '‹ 홈'으로 돌아온다. (사용법은 홈의 ? 버튼)
// 모임 중에는 코트·참가자·콕·기록을 자주 오가서, 안쪽 화면 맨 아래 탭 줄(icon 있는 것)로 홈을 거치지 않고 바로 옮긴다.
// 배드민턴 코트 이모지가 없어서 위에서 본 코트를 직접 그린다. (가운데 네트, 짧은 서비스 라인, 센터 라인)
const CourtIcon = (
  <svg viewBox="0 0 20 24" width="0.85em" height="1em">
    <rect x="3" y="1" width="14" height="22" rx="0.5" fill="#3fa34d" stroke="#fff" strokeWidth="0.8" />
    <path d="M3 8.75H17M3 15.25H17M10 1V8.75M10 15.25V23" stroke="#fff" strokeWidth="0.7" />
    <path d="M1.5 12H18.5" stroke="#2b2b2b" strokeWidth="1.2" />
  </svg>
);

const VIEWS = [
  { key: 'menu', View: Menu },
  { key: 'home', title: '코트', icon: CourtIcon, View: Home },
  { key: 'players', title: '참가자', icon: '👥', View: Players },
  { key: 'shuttles', title: '콕', icon: '🏸', View: Shuttles },
  { key: 'records', title: '기록', icon: '📋', View: Records },
  { key: 'help', title: '사용법', View: Help },
];
const NAV_VIEWS = VIEWS.filter(t => t.icon);
const viewIndex = key => VIEWS.findIndex(t => t.key === key);
const onSubPage = () => !!(window.history.state && window.history.state.page);

export default function App() {
  const [view, setViewRaw] = useState('menu'); // 앱을 열면 홈 메뉴부터
  // 휴대폰 앱처럼: 홈에서 들어갈 땐 화면이 오른쪽에서, 홈으로 돌아올 땐 왼쪽에서 밀려 들어온다.
  const navDir = useRef('fwd');
  const setView = useCallback(next => setViewRaw(cur => {
    if (next !== cur) navDir.current = viewIndex(next) > viewIndex(cur) ? 'fwd' : 'back';
    return next;
  }), []);
  useEffect(() => { window.scrollTo(0, 0); }, [view]);
  // 휴대폰 '뒤로' 버튼(뒤로 가기 몸짓)을 누르면 앱이 꺼지지 않고 홈으로 돌아오게 한다.
  useEffect(() => {
    if (view !== 'menu' && !onSubPage()) window.history.pushState({ page: true }, '');
  }, [view]);
  useEffect(() => {
    const onPop = () => { setModal(null); setView('menu'); };
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, [setView]);
  const goHome = () => { if (onSubPage()) window.history.back(); else setView('menu'); };
  const [modal, setModal] = useState(null); // { content, wide }
  const [toastMsg, setToastMsg] = useState(null); // { msg, id }
  const [askDlg, setAskDlg] = useState(null); // { message, title, ok, cancel, danger, resolve }
  const [, setTick] = useState(0);
  const toastTimer = useRef();
  // 앱을 열 때마다 맨 앞에 잠깐 초록 화면을 보여준다.
  const [splash, setSplash] = useState(true);
  const hideSplash = useCallback(() => setSplash(false), []);
  const { team } = useSync();
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

  // 모임 종료를 안 누르고 날짜가 바뀌었으면, 앱을 열 때(켜둔 동안은 1분마다 확인) 지난 모임을 저장할지 한 번 묻는다.
  // "나중에"를 누르면 이번에는 다시 묻지 않고, 코트 화면의 안내에서 저장할 수 있다.
  const askedStale = useRef(false);
  useEffect(() => {
    const check = async () => {
      if (askedStale.current || !isSessionStale(getState())) return;
      askedStale.current = true;
      const date = staleSessionLabel(getState());
      const yes = await ui.ask(`${date} 모임이 아직 종료되지 않았어요. 그날 기록을 "기록" 화면에 저장하고 오늘 모임을 새로 시작할까요?`, { title: '지난 모임 저장', ok: '저장하기', cancel: '나중에' });
      if (yes && endStaleSession()) ui.toast(`${date} 모임 기록을 저장했어요.`);
    };
    check();
    const t = setInterval(check, 60000);
    return () => clearInterval(t);
  }, [ui]);

  const { View, title } = VIEWS.find(t => t.key === view);

  return (
    <UIContext.Provider value={ui}>
      {splash && <Splash onDone={hideSplash} />}
      {/* 위쪽 초록 머리줄은 없앴다. 로고 · 팀 이름 · 자동 추천/설정/사용법 버튼은 홈 화면 맨 위에 있다. */}
      {showInvite ? <Welcome initialCode={invite} onSkip={() => setInvite(null)} /> : showWelcome ? <Welcome onSkip={skipWelcome} /> : (<>
      <main key={view} className={`page page-${navDir.current}`}>
        {view !== 'menu' && (
          <div className="page-head">
            <button type="button" className="back-btn" aria-label="홈으로" title="홈으로" onClick={goHome}>‹</button>
            <h1>{title}</h1>
          </div>
        )}
        <View />
      </main>
      {NAV_VIEWS.some(t => t.key === view) && (
        <nav className="bottom-nav" aria-label="화면 바꾸기">
          {NAV_VIEWS.map(t => (
            <button type="button" key={t.key} className={`bottom-nav-btn${t.key === view ? ' active' : ''}`} aria-current={t.key === view ? 'page' : undefined} onClick={() => setView(t.key)}>
              <span className="bottom-nav-ico" aria-hidden="true">{t.icon}</span>
              {t.title}
            </button>
          ))}
        </nav>
      )}
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
              <button className="btn btn-ghost" onClick={() => { askDlg.resolve(false); setAskDlg(null); }}>{askDlg.cancel || '취소'}</button>
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
