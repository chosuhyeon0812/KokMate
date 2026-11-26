/* 홈 화면: 브랜드 가이드보드에서 사람이 들고 있는 휴대폰 화면처럼
   로고 · 인사말 · 제일 큰 '매칭 시작하기' 버튼 · 메뉴 카드(누르면 그 화면으로 들어간다). */
import { useState } from 'react';
import { useUI } from '../ui';
import Mascot from '../components/Mascot';
import Icon from '../components/Icons';
import { useSync } from '../lib/sync';

// 메뉴 카드 아이콘은 아래 탭 줄과 같은 선 그림 (components/Icons)
function MenuIcon({ name }) {
  return <Icon name={name} size={28} />;
}

// 홈에 올 때마다 하나씩 바뀌는 인사말. 바로 전에 나온 건 연달아 안 나오게 한다.
const GREETINGS = [
  '오늘 코트의 주인공은 바로 나 👈',
  '오늘도 콕콕! 즐거운 한 판 🏸',
  '오늘도 한 판 어때요?',
  '코트가 기다리고 있어요',
  '오늘의 랠리, 시작해볼까요?',
  '스매시 한 방, 스트레스도 날려요!',
  '이기든 지든, 재밌으면 승리!',
  '오늘의 파트너는 누굴까요? 👀',
  '오늘은 헛스윙 없는 날!',
  '내일 근육통은 내일의 내가 🫠',
  '몸풀기 먼저! 다치면 콕 못 쳐요',
  '땀 흘릴 준비 됐나요? 💪',
];
let lastGreeting = -1;
function pickGreeting() {
  let i = Math.floor(Math.random() * GREETINGS.length);
  if (i === lastGreeting) i = (i + 1) % GREETINGS.length;
  lastGreeting = i;
  return GREETINGS[i];
}

// 인사말 위에 작게 보여주는 오늘 날짜 (예: 11월 4일 수요일)
function todayLabel(d = new Date()) {
  return `${d.getMonth() + 1}월 ${d.getDate()}일 ${'일월화수목금토'[d.getDay()]}요일`;
}

export default function Menu() {
  const { switchView } = useUI();
  const { team } = useSync();
  const [greeting] = useState(pickGreeting);
  const items = [
    { key: 'shuttles', tone: 'orange', title: '셔틀콕' },
    { key: 'records', tone: 'purple', title: '기록' },
    { key: 'players', tone: 'green', title: '회원' },
  ];

  return (
    <div className="menu">
      <div className="menu-top">
        <div className="menu-logo">
          <Mascot size={58} lineColor="#0f3d24" />
          <span className="menu-wordmark"><b>Kok</b>Mate</span>
        </div>
        {/* 예전 위쪽 초록 머리줄에 있던 버튼들 */}
        <div className="menu-actions">
          <button type="button" className="round-btn" title="설정" aria-label="설정" onClick={() => switchView('settings')}><Icon name="settings" size={20} /></button>
          <button type="button" className="round-btn" title="사용법" aria-label="사용법" onClick={() => switchView('help')}>?</button>
        </div>
      </div>
      <div className="menu-hello">
        {team && <span className="menu-team">{team.name}</span>}
        <span className="menu-date">{todayLabel()}</span>
        <p className="menu-greet">{greeting}</p>
      </div>

      <button type="button" className="menu-start" onClick={() => switchView('home')}>
        <span>매칭 시작하기</span>
        <span className="menu-arrow" aria-hidden="true">
          {/* 단순한 › 모양 꺾쇠 (글자 대신 선으로 그려서 동그라미 한가운데 오게) */}
          <svg viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round"><path d="M9.5 6l6 6-6 6" /></svg>
        </span>
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
