/* 회원 창의 출석부: 한 달 달력에 온 날마다 ✓ 도장 (일요일 1 · 2부 둘 다면 ✓✓) */
import { useState } from 'react';
import { todayStr } from '../lib/utils';
import { attendDates } from '../lib/cumulative';

// 보통 모임 여는 요일 (일 · 월 · 수 · 금). 이 요일인데 안 온 날은 연하게 칠해서 빠진 날이 보이게 한다.
const MEET_DAYS = [0, 1, 3, 5];

export default function AttendStamps({ state, playerId }) {
  const today = todayStr();
  const [ym, setYm] = useState(today.slice(0, 7));
  const [year, month] = ym.split('-').map(Number);
  const pad = n => String(n).padStart(2, '0');
  const move = diff => { const d = new Date(year, month - 1 + diff, 1); setYm(`${d.getFullYear()}-${pad(d.getMonth() + 1)}`); };

  const dates = attendDates(state, playerId);
  const first = new Date(year, month - 1, 1).getDay();
  const days = new Date(year, month, 0).getDate();
  const cells = Array.from({ length: first }, () => null).concat(Array.from({ length: days }, (_, i) => i + 1));
  const monthTotal = Object.entries(dates).filter(([d]) => d.startsWith(ym)).reduce((n, [, c]) => n + c, 0);

  return (
    <div className="stamp-board">
      <div className="cal-head">
        <button type="button" className="cal-nav" aria-label="지난달" onClick={() => move(-1)}>‹</button>
        <div className="cal-title">{year}년 {month}월 출석 <b className="stamp-total">{monthTotal}회</b></div>
        <button type="button" className="cal-nav" aria-label="다음달" disabled={ym >= today.slice(0, 7)} onClick={() => move(1)}>›</button>
      </div>
      <div className="cal">
        {'일월화수목금토'.split('').map((w, i) => <div key={w} className={`cal-w${i === 0 ? ' sun' : i === 6 ? ' sat' : ''}`}>{w}</div>)}
        {cells.map((d, i) => {
          if (!d) return <div key={`e${i}`} />;
          const date = `${ym}-${pad(d)}`;
          const n = dates[date];
          const missed = !n && date <= today && MEET_DAYS.includes((first + d - 1) % 7);
          return (
            <div key={date} className={`cal-d stamp-d${n ? ' stamped' : ''}${missed ? ' missed' : ''}`} aria-label={n ? `${month}월 ${d}일 출석 ${n}회` : undefined}>
              <span className="cal-num">{d}</span>
              {n > 0 && <span className="stamp">{'✓'.repeat(Math.min(n, 3))}</span>}
            </div>
          );
        })}
      </div>
    </div>
  );
}
