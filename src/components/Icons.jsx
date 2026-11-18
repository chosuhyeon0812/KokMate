/* 앱 공통 선 그림 아이콘: 홈 메뉴 · 아래 탭 줄 · 홈 오른쪽 위 버튼이 같은 굵기 · 같은 모양으로 보이게 한 곳에 모은다.
   색은 글자색(currentColor)을 따라가서, 탭 줄에서는 회색 → 고른 탭은 초록이 된다. */
const PATHS = {
  // 위에서 본 코트: 바깥 네모 + 가운데 네트 + 짧은 센터 라인
  court: (
    <>
      <rect x="5" y="2.5" width="14" height="19" rx="1.5" />
      <path d="M3 12h18" />
      <path d="M12 2.5v5M12 16.5v5" />
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
  // 사람 한 명
  players: (
    <>
      <circle cx="12" cy="8" r="3.5" />
      <path d="M5 20c0-3.9 3.1-6.5 7-6.5s7 2.6 7 6.5" />
    </>
  ),
  // 반짝이 (자동 추천): 큰 별 하나 + 작은 별 하나
  sparkle: (
    <>
      <path d="M10 3.5l1.6 4.9 4.9 1.6-4.9 1.6L10 16.5l-1.6-4.9L3.5 10l4.9-1.6z" />
      <path d="M17.5 14.5l.8 2.2 2.2.8-2.2.8-.8 2.2-.8-2.2-2.2-.8 2.2-.8z" />
    </>
  ),
  // 설정: 손잡이 달린 막대 두 줄
  settings: (
    <>
      <path d="M4 8h9M17 8h3M4 16h3M11 16h9" />
      <circle cx="15" cy="8" r="2" />
      <circle cx="9" cy="16" r="2" />
    </>
  ),
};

export default function Icon({ name, size = 24, strokeWidth = 2 }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} fill="none" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {PATHS[name]}
    </svg>
  );
}
