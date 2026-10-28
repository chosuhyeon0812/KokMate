/* 콕메이트 캐릭터: 웃는 얼굴의 셔틀콕 (브랜드 가이드보드 그림). 처음 화면(스플래시)에서 쓴다.
   같은 그림이 assets/logo.svg 에도 있으니 고칠 때 같이 고친다. */
const OUTLINE = '#0f3d24';

export default function Mascot({ size = 160, lineColor = '#fff', className = '' }) {
  return (
    <svg className={className} width={size} height={size} viewBox="0 0 200 200" aria-hidden="true">
      {/* 날아가는 느낌의 선: 왼쪽 위 곡선 두 개, 오른쪽 아래 짧은 선 두 개 */}
      <g stroke={lineColor} strokeWidth="6" strokeLinecap="round" fill="none">
        <path d="M44 58 Q34 72 38 90" />
        <path d="M28 78 Q22 88 27 100" />
        <path d="M128 140 L150 128" />
        <path d="M132 156 L148 149" />
      </g>
      <g transform="translate(-4 2) rotate(35 100 100)">
        {/* 바깥 테두리: 같은 모양을 굵게 먼저 그려서 실루엣에만 선이 생기게 한다 */}
        <g fill={OUTLINE} stroke={OUTLINE} strokeWidth="13" strokeLinejoin="round">
          <path d="M70 108 L42 54 A17 17 0 0 1 70 36 A17 17 0 0 1 100 30 A17 17 0 0 1 130 36 A17 17 0 0 1 158 54 L130 108 Z" />
          <path d="M72 120 C66 150 78 178 100 178 C122 178 134 150 128 120 Z" />
          <path d="M68 104 H132 L129 124 H71 Z" />
        </g>
        {/* 깃털 */}
        <path d="M70 108 L42 54 A17 17 0 0 1 70 36 A17 17 0 0 1 100 30 A17 17 0 0 1 130 36 A17 17 0 0 1 158 54 L130 108 Z" fill="#fff" />
        <g stroke="#dfe4e1" strokeWidth="4.5" strokeLinecap="round">
          <path d="M86 100 L74 46" />
          <path d="M100 100 L100 40" />
          <path d="M114 100 L126 46" />
        </g>
        {/* 머리 + 초록 띠 */}
        <path d="M72 120 C66 150 78 178 100 178 C122 178 134 150 128 120 Z" fill="#fff" />
        <path d="M68 104 H132 L129 124 H71 Z" fill="#22c55e" />
        {/* 얼굴 */}
        <g transform="translate(0 4) rotate(-35 100 150)">
          <ellipse cx="82" cy="156" rx="6.5" ry="4" fill="#fbb4c0" />
          <ellipse cx="118" cy="156" rx="6.5" ry="4" fill="#fbb4c0" />
          <circle cx="89" cy="146" r="4.2" fill={OUTLINE} />
          <circle cx="111" cy="146" r="4.2" fill={OUTLINE} />
          <path d="M93 155 Q100 162 107 155" fill="none" stroke={OUTLINE} strokeWidth="4" strokeLinecap="round" />
        </g>
      </g>
    </svg>
  );
}
