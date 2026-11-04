/* 홈 화면 아래 장식: 옆에서 본 배드민턴 코트에서 4명이 복식을 친다.
   셔틀콕은 네트를 넘어 포물선으로 날아가고(코르크가 앞), 받는 사람은 라켓을 젖혔다가 휘두른다.
   매 프레임 React를 다시 그리지 않고 ref의 속성만 바꾼다. 움직임 줄이기를 켠 폰에서는 멈춘 장면. */
import { useEffect, useRef } from 'react';

const GROUND = 96;     // 바닥 줄 y
const FLIGHT = 1.35;   // 셔틀콕이 한 번 날아가는 시간(초)
const WINDUP = 0.4;    // 치기 전에 라켓을 젖히는 시간
const FOLLOW = 0.3;    // 친 뒤 라켓이 돌아오는 시간
const REST = -15, BACK = -75, HIT = 55; // 라켓 팔 각도(도): 평소 / 젖힘 / 휘두름 끝

// dir: 1이면 오른쪽(네트 쪽)을 보고, -1이면 왼쪽을 본다.
const PLAYERS = [
  { x: 38, dir: 1 },
  { x: 84, dir: 1 },
  { x: 156, dir: -1 },
  { x: 202, dir: -1 },
];
// 치는 순서: 왼쪽 뒤 → 오른쪽 뒤 → 왼쪽 앞 → 오른쪽 앞 → 다시 왼쪽 뒤
const ORDER = [0, 3, 1, 2];

// 라켓에 맞는 자리 (사람 앞 위쪽)
const contact = p => ({ x: p.x + p.dir * 12, y: GROUND - 38 });

function armAngle(timeToHit, timeSinceHit) {
  if (timeSinceHit >= 0 && timeSinceHit < FOLLOW) return HIT + (REST - HIT) * (timeSinceHit / FOLLOW);
  if (timeToHit >= 0 && timeToHit < WINDUP) {
    const k = 1 - timeToHit / WINDUP; // 0 → 1
    // 앞 70%는 천천히 젖히고, 마지막 30%에 빠르게 휘두른다
    return k < 0.7 ? REST + (BACK - REST) * (k / 0.7) : BACK + (HIT - BACK) * ((k - 0.7) / 0.3);
  }
  return REST;
}

// 동글동글한 2등신 사람: 색칠 없이 얇은 선만(볼터치만 옅은 분홍). 큰 머리, 작은 콩 몸, 동그란 손발, 삐친 머리 한 가닥.
// 발밑이 (0,0), 오른쪽을 본다(dir=-1이면 뒤집힘). bobRef는 제자리 콩콩 뛰기용.
function Person({ p, armRef, bobRef }) {
  return (
    <g transform={`translate(${p.x} ${GROUND}) scale(${p.dir} 1)`} className="court-person">
      <g ref={bobRef}>
        <path d="M-2.5 -7 L-3.5 -3 M2.5 -7 L4 -3" />
        <ellipse cx="-4" cy="-1.7" rx="2.8" ry="1.7" />
        <ellipse cx="4.8" cy="-1.7" rx="2.8" ry="1.7" />
        <ellipse cy="-13" rx="7" ry="7.5" />
        <path d="M-5 -15 L-8.5 -10.5" />
        <circle cx="-9" cy="-9.8" r="1.6" />
        {/* 라켓 든 팔: 어깨를 중심으로 돈다. 머리보다 먼저 그려서 뒤로 젖힐 때 머리 뒤로 지나간다 */}
        <g transform="translate(4 -16)">
          <g ref={armRef} transform={`rotate(${REST})`}>
            <path d="M0 0 L5.5 -3.5" />
            <path d="M6.6 -5 L10 -11" />
            <ellipse cx="12.2" cy="-16.4" rx="3.7" ry="5.4" transform="rotate(22 12.2 -16.4)" />
            <circle cx="6" cy="-4" r="1.6" />
          </g>
        </g>
        <circle cy="-29" r="9" />
        <path d="M-1.5 -37.8 Q0 -42.5 3.2 -40.2" />
        <ellipse cx="4.4" cy="-30" rx="1.15" ry="1.5" className="dot" />
        <circle cx="4.8" cy="-30.6" r=".4" className="shine" />
        <ellipse cx="5.6" cy="-26.2" rx="1.9" ry="1.1" className="blush" />
        <path d="M1.6 -25.6 Q3 -24.3 4.2 -25.8" />
      </g>
    </g>
  );
}

export default function CourtScene() {
  const shuttleRef = useRef(null);
  const shadowRef = useRef(null);
  const armRefs = useRef([]);
  const bobRefs = useRef([]);

  useEffect(() => {
    const reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const place = (x, y, angle, height) => {
      shuttleRef.current?.setAttribute('transform', `translate(${x.toFixed(1)} ${y.toFixed(1)}) rotate(${angle.toFixed(1)})`);
      const s = Math.max(0.45, 1 - height / 70);
      shadowRef.current?.setAttribute('transform', `translate(${x.toFixed(1)} ${GROUND + 1}) scale(${s.toFixed(2)} 1)`);
    };

    const draw = t => {
      const leg = Math.floor(t / FLIGHT);
      const k = (t % FLIGHT) / FLIGHT;
      const from = PLAYERS[ORDER[leg % 4]];
      const to = PLAYERS[ORDER[(leg + 1) % 4]];
      const a = contact(from), b = contact(to);
      const h = 18 + Math.abs(b.x - a.x) * 0.16; // 멀리 칠수록 높이 뜬다
      const x = a.x + (b.x - a.x) * k;
      const y = a.y + (b.y - a.y) * k - 4 * h * k * (1 - k);
      const dx = b.x - a.x, dy = (b.y - a.y) - 4 * h * (1 - 2 * k);
      place(x, y, Math.atan2(dy, dx) * 180 / Math.PI, GROUND - y);

      // 각 사람: 다음에 칠 때까지 남은 시간 / 지난번에 친 뒤 지난 시간
      ORDER.forEach((pi, slot) => {
        const cycle = FLIGHT * 4;
        const hitAt = slot * FLIGHT;
        const since = (((t - hitAt) % cycle) + cycle) % cycle;
        const until = (cycle - since) % cycle;
        armRefs.current[pi]?.setAttribute('transform', `rotate(${armAngle(until, since).toFixed(1)})`);
      });
      // 제자리 콩콩: 사람마다 박자를 조금씩 다르게
      PLAYERS.forEach((p, i) => {
        const hop = Math.abs(Math.sin(t * 4.2 + i * 1.3)) * 1.6;
        bobRefs.current[i]?.setAttribute('transform', `translate(0 ${(-hop).toFixed(2)})`);
      });
    };

    if (reduce) { draw(FLIGHT * 0.45); return; }
    let raf = 0;
    const start = performance.now();
    // 첫 프레임 시각이 start보다 살짝 앞설 수 있어서 0 밑으로 안 내려가게 한다
    const loop = now => { draw(Math.max(0, now - start) / 1000); raf = requestAnimationFrame(loop); };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, []);

  return (
    <svg className="menu-court" viewBox="0 0 240 108" aria-hidden="true">
      {/* 바닥 */}
      <rect x="6" y={GROUND} width="228" height="7" rx="3.5" fill="#d5eedd" />
      <path d={`M14 ${GROUND + 3.5}H226`} stroke="#fff" strokeWidth="1.2" strokeDasharray="0" opacity=".8" />
      <ellipse ref={shadowRef} rx="4" ry="1.3" fill="#0f5132" opacity=".12" transform={`translate(60 ${GROUND + 1})`} />
      {/* 네트 */}
      <path d={`M119 ${GROUND}V60M121 ${GROUND}V60`} stroke="#8fb9a0" strokeWidth="1.6" />
      <rect x="118" y="60" width="4" height="22" fill="url(#netMesh)" />
      <rect x="117.5" y="58.5" width="5" height="3" rx="1" fill="#fff" stroke="#8fb9a0" strokeWidth=".8" />
      <defs>
        <pattern id="netMesh" width="2" height="2" patternUnits="userSpaceOnUse">
          <path d="M0 0H2M0 0V2" stroke="#8fb9a0" strokeWidth=".5" />
        </pattern>
      </defs>
      {PLAYERS.map((p, i) => <Person key={i} p={p} armRef={el => { armRefs.current[i] = el; }} bobRef={el => { bobRefs.current[i] = el; }} />)}
      {/* 셔틀콕: 오른쪽(+x)이 코르크. 날아가는 방향으로 돌린다 */}
      <g ref={shuttleRef} transform="translate(50 50)">
        <path d="M1.5 -2 L-7 -4.6 L-7 4.6 L1.5 2 Z" fill="#fff" stroke="#9fb0a6" strokeWidth=".8" strokeLinejoin="round" />
        <path d="M-7 -2 L1 -.8 M-7 2 L1 .8" stroke="#c8d3cc" strokeWidth=".6" />
        <circle cx="2.6" cy="0" r="2.3" fill="#fff" stroke="#0f5132" strokeWidth=".9" />
      </g>
    </svg>
  );
}
