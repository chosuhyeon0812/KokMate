/* 앱을 열 때 맨 앞에 잠깐 보이는 초록 화면 (브랜드 가이드보드의 휴대폰 화면 그대로). 누르면 바로 넘어간다. */
import { useEffect, useState } from 'react';
import Mascot from './Mascot';

const SHOW_MS = 1700;
const FADE_MS = 450;

export default function Splash({ onDone }) {
  const [leaving, setLeaving] = useState(false);

  useEffect(() => {
    if (!leaving) {
      const t = setTimeout(() => setLeaving(true), SHOW_MS);
      return () => clearTimeout(t);
    }
    const t = setTimeout(onDone, FADE_MS);
    return () => clearTimeout(t);
  }, [leaving, onDone]);

  return (
    <div className={`splash${leaving ? ' leaving' : ''}`} onClick={() => setLeaving(true)} role="presentation">
      <div className="splash-center">
        <Mascot size={190} className="splash-mascot" />
        <h1 className="splash-title">KokMate</h1>
        <p className="splash-slogan">오늘 칠 메이트, 여기서!</p>
        <div className="splash-dots"><span /><span /><span /></div>
      </div>
      {/* 아래쪽 코트: 살짝 밝은 바닥 위에 원근감 있는 흰 줄 */}
      <svg className="splash-court" viewBox="0 0 400 200" preserveAspectRatio="xMidYMin slice" aria-hidden="true">
        <path d="M-60 200 V40 Q200 -14 460 40 V200 Z" fill="#fff" opacity=".07" />
        <g stroke="#fff" strokeWidth="3.5" strokeLinecap="round" fill="none" opacity=".92">
          <path d="M95 30 H305" />
          <path d="M90.6 40 H309.4" />
          <path d="M95 30 L20 200 M305 30 L380 200" />
          <path d="M113 30 L52 200 M287 30 L348 200" />
          <path d="M68.5 90 H331.5" />
          <path d="M200 30 V200" />
        </g>
      </svg>
    </div>
  );
}
