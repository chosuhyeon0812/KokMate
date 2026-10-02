import { useEffect, useMemo, useRef, useState } from 'react';
import { UIContext } from './ui';
import logo from './assets/logo.jpg';
import Home from './views/Home';
import Players from './views/Players';
import Courts from './views/Courts';
import Shuttles from './views/Shuttles';
import History from './views/History';
import Stats from './views/Stats';
import Help from './views/Help';

const TABS = [
  { key: 'home', label: '🏠 홈', View: Home },
  { key: 'players', label: '👥 참가자', View: Players },
  { key: 'courts', label: '🏟 코트 현황', View: Courts },
  { key: 'shuttles', label: '🏸 콕 관리', View: Shuttles },
  { key: 'history', label: '📋 경기 기록', View: History },
  { key: 'stats', label: '📊 통계', View: Stats },
  { key: 'help', label: '❓ 사용법', View: Help },
];

export default function App() {
  const [view, setView] = useState('home');
  const [modal, setModal] = useState(null); // { content, wide }
  const [toastMsg, setToastMsg] = useState(null); // { msg, id }
  const [, setTick] = useState(0);
  const toastTimer = useRef();

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
      closeModal() { setModal(null); },
      switchView: setView,
    };
  }, []);

  const { View } = TABS.find(t => t.key === view);
  const today = new Date().toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric', weekday: 'short' });

  return (
    <UIContext.Provider value={ui}>
      <header className="topbar">
        <div className="brand">
          <img src={logo} alt="로고" className="brand-logo" />
          <div className="brand-text">
            <strong>배드민턴 매칭</strong>
            <span>소규모 모임 경기 운영 도우미</span>
          </div>
        </div>
        <div className="topbar-meta"><span>{today}</span></div>
      </header>

      <nav className="tabbar">
        {TABS.map(t => (
          <button key={t.key} className={`tab-btn${view === t.key ? ' active' : ''}`} onClick={() => setView(t.key)}>{t.label}</button>
        ))}
      </nav>

      <main><View /></main>

      {modal && (
        <div className="modal-root" onClick={e => { if (e.target === e.currentTarget) ui.closeModal(); }}>
          <div className={`modal-box${modal.wide ? ' wide' : ''}`}>{modal.content}</div>
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
