/* 홈 화면: 브랜드 가이드보드에서 사람이 들고 있는 휴대폰 화면처럼
   로고 · 인사말 · 큰 '경기 시작하기' 버튼 · 메뉴 카드(누르면 그 화면으로 들어간다). */
import { useAppState } from '../store';
import { useUI } from '../ui';
import Mascot from '../components/Mascot';
import CourtScene from '../components/CourtScene';
import RecommendModal from '../modals/RecommendModal';
import { TeamInfoModal } from '../components/TeamCard';
import { syncEnabled, useSync } from '../lib/sync';

// 메뉴 카드 아이콘: 이모지 대신 앱 색에 맞춘 선 그림 (모양·색을 통일해서 덜 정신없게)
const ICONS = {
  players: (
    <>
      <circle cx="9" cy="8.5" r="3.2" />
      <path d="M3.5 19c.6-3.3 2.8-5.2 5.5-5.2s4.9 1.9 5.5 5.2" />
      <circle cx="16.5" cy="9.5" r="2.6" />
      <path d="M15.8 13.9c2.4-.2 4.2 1.4 4.7 4.6" />
    </>
  ),
  shuttles: (
    <>
      <path d="M8 4.5 12 13l4-8.5" />
      <path d="M5 6.5 10.5 14M19 6.5 13.5 14" />
      <path d="M5 6.5c1-1.4 2-2 3-2M19 6.5c-1-1.4-2-2-3-2M8 4.5c1.3-.7 2.6-1 4-1s2.7.3 4 1" />
      <path d="M9.6 14.5h4.8v2.2a2.4 2.4 0 0 1-4.8 0z" />
    </>
  ),
  records: (
    <>
      <rect x="5" y="4.5" width="14" height="16" rx="2.5" />
      <path d="M9 3.5h6v2.5H9z" />
      <path d="M8.5 11h7M8.5 14.5h7M8.5 18h4" />
    </>
  ),
};

function MenuIcon({ name }) {
  return (
    <svg viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {ICONS[name]}
    </svg>
  );
}

// 인사말 위에 작게 보여주는 오늘 날짜 (예: 11월 4일 수요일)
function todayLabel(d = new Date()) {
  return `${d.getMonth() + 1}월 ${d.getDate()}일 ${'일월화수목금토'[d.getDay()]}요일`;
}

export default function Menu() {
  const state = useAppState();
  const { switchView, openModal } = useUI();
  const { team } = useSync();
  const hasRecs = state.pendingRecs.length > 0;
  const attending = state.players.filter(p => p.active);
  const shuttleDone = attending.filter(p => p.shuttleDone).length;

  const items = [
    { key: 'players', tone: 'green', title: '참가자', desc: attending.length ? `오늘 ${attending.length}명 왔어요 · 회원 관리` : '오늘 온 사람 체크 · 회원 관리' },
    { key: 'shuttles', tone: 'orange', title: '콕', desc: attending.length ? `콕 낸 사람 ${shuttleDone} / ${attending.length}명` : '누가 콕을 냈는지 체크해요' },
    { key: 'records', tone: 'purple', title: '기록', desc: '지난 모임과 경기 기록을 봐요' },
  ];

  return (
    <div className="menu">
      <div className="menu-top">
        <div className="menu-logo">
          <Mascot size={58} lineColor="#0f3d24" />
          <span className="menu-wordmark"><b>Kok</b>Mate</span>
        </div>
        {/* 예전 위쪽 초록 머리줄에 있던 버튼들. 자동 추천은 잘 안 써서 숨겨둔 기능이라 추천이 남아 있으면 작은 점으로 알려준다 */}
        <div className="menu-actions">
          <button type="button" className="round-btn sparkle-btn" title="자동 추천" aria-label="자동 추천" onClick={() => openModal(<RecommendModal />, { wide: true })}>✨{hasRecs && <span className="sparkle-dot" />}</button>
          {syncEnabled && <button type="button" className="round-btn" title="설정" aria-label="설정" onClick={() => openModal(<TeamInfoModal />)}>⚙️</button>}
          <button type="button" className="round-btn" title="사용법" aria-label="사용법" onClick={() => switchView('help')}>?</button>
        </div>
      </div>
      <div className="menu-hello">
        {team && <span className="menu-team">{team.name}</span>}
        <span className="menu-date">{todayLabel()}</span>
        <p className="menu-greet">오늘도 좋은 매치, 기대할게요!</p>
      </div>

      <button type="button" className="menu-start" onClick={() => switchView('home')}>
        <span>
          경기 시작하기
          <small>{attending.length ? `오늘 참석 ${attending.length}명` : '코트로 가서 오늘 경기를 짜요'}</small>
        </span>
        <span className="menu-arrow" aria-hidden="true">→</span>
        {/* 버튼 오른쪽 뒤에 흐리게 깔리는 셔틀콕 캐릭터 */}
        <Mascot size={100} lineColor="#fff" className="menu-start-deco" />
      </button>

      {items.map(it => (
        <button type="button" key={it.key} className="menu-card" onClick={() => switchView(it.key)}>
          <span className={`menu-ico tone-${it.tone}`}><MenuIcon name={it.key} /></span>
          <span className="menu-text">
            <strong>{it.title}</strong>
            <span>{it.desc}</span>
          </span>
          <span className="menu-chev" aria-hidden="true">›</span>
        </button>
      ))}
      <CourtScene />
    </div>
  );
}
