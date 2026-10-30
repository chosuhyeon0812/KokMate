/* 홈 화면: 브랜드 가이드보드에서 사람이 들고 있는 휴대폰 화면처럼
   로고 · 인사말 · 큰 '경기 시작하기' 버튼 · 메뉴 카드(누르면 그 화면으로 들어간다). */
import { useAppState } from '../store';
import { useUI } from '../ui';
import Mascot from '../components/Mascot';
import RecommendModal from '../modals/RecommendModal';
import { TeamInfoModal } from '../components/TeamCard';
import { syncEnabled, useSync } from '../lib/sync';

export default function Menu() {
  const state = useAppState();
  const { switchView, openModal } = useUI();
  const { team } = useSync();
  const hasRecs = state.pendingRecs.length > 0;
  const attending = state.players.filter(p => p.active);
  const shuttleDone = attending.filter(p => p.shuttleDone).length;

  const items = [
    { key: 'players', icon: '👥', tone: 'green', title: '참가자', desc: attending.length ? `오늘 ${attending.length}명 왔어요 · 회원 관리` : '오늘 온 사람 체크 · 회원 관리' },
    { key: 'shuttles', icon: '🏸', tone: 'orange', title: '콕', desc: attending.length ? `콕 낸 사람 ${shuttleDone} / ${attending.length}명` : '누가 콕을 냈는지 체크해요' },
    { key: 'records', icon: '📋', tone: 'purple', title: '기록', desc: '지난 모임과 경기 기록을 봐요' },
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
      {team && <span className="menu-team">{team.name}</span>}
      <p className="menu-greet">오늘도 좋은 매치, 기대할게요!</p>

      <button type="button" className="menu-start" onClick={() => switchView('home')}>
        <span>
          경기 시작하기
          <small>{attending.length ? `오늘 참석 ${attending.length}명` : '코트로 가서 오늘 경기를 짜요'}</small>
        </span>
        <span className="menu-arrow" aria-hidden="true">→</span>
      </button>

      {items.map(it => (
        <button type="button" key={it.key} className="menu-card" onClick={() => switchView(it.key)}>
          <span className={`menu-ico tone-${it.tone}`} aria-hidden="true">{it.icon}</span>
          <span className="menu-text">
            <strong>{it.title}</strong>
            <span>{it.desc}</span>
          </span>
          <span className="menu-chev" aria-hidden="true">›</span>
        </button>
      ))}
    </div>
  );
}
