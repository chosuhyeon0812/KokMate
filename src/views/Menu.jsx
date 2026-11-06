/* 홈 화면: 브랜드 가이드보드에서 사람이 들고 있는 휴대폰 화면처럼
   로고 · 인사말 · 제일 큰 '매칭 시작하기' 버튼 · 메뉴 카드(누르면 그 화면으로 들어간다). */
import { useAppState } from '../store';
import { useUI } from '../ui';
import Mascot from '../components/Mascot';
import RecommendModal from '../modals/RecommendModal';
import { TeamInfoModal } from '../components/TeamCard';
import { syncEnabled, useSync } from '../lib/sync';

// 메뉴 카드 아이콘: 앱 색에 맞춘 간단한 선 그림 3개 (같은 굵기·같은 크기로 통일)
const ICONS = {
  // 사람 한 명
  players: (
    <>
      <circle cx="12" cy="8" r="3.5" />
      <path d="M5 20c0-3.9 3.1-6.5 7-6.5s7 2.6 7 6.5" />
    </>
  ),
  // 셔틀콕: 깃털 부분(사다리꼴) + 아래 코르크
  shuttles: (
    <>
      <path d="M6 4h12l-4 10h-4z" />
      <path d="M12 4v10" />
      <path d="M10 14h4v1.5a2 2 0 0 1-4 0z" />
    </>
  ),
  // 트로피
  records: (
    <>
      <path d="M7 4h10v5a5 5 0 0 1-10 0z" />
      <path d="M7 6H5a2 2 0 0 0 0 4h2.4M17 6h2a2 2 0 0 1 0 4h-2.4" />
      <path d="M12 14v5M8.5 20h7" />
    </>
  ),
};

function MenuIcon({ name }) {
  return (
    <svg viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
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
  const items = [
    { key: 'players', tone: 'green', title: '회원 관리' },
    { key: 'shuttles', tone: 'orange', title: '셔틀콕' },
    { key: 'records', tone: 'purple', title: '경기 기록' },
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
        <span>매칭 시작하기</span>
        <span className="menu-arrow" aria-hidden="true">→</span>
        {/* 버튼 오른쪽 뒤에 흐리게 깔리는 셔틀콕 캐릭터 */}
        <Mascot size={140} lineColor="#fff" className="menu-start-deco" />
      </button>

      {items.map(it => (
        <button type="button" key={it.key} className="menu-card" onClick={() => switchView(it.key)}>
          <span className={`menu-ico tone-${it.tone}`}><MenuIcon name={it.key} /></span>
          <strong className="menu-text">{it.title}</strong>
          <span className="menu-chev" aria-hidden="true">›</span>
        </button>
      ))}
    </div>
  );
}
