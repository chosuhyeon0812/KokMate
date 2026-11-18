/* 기록 탭: 오늘(요약·순위·끝난 경기), 지난 모임(달력), 누적 기록을 위쪽 토글로 전환해서 보여준다. (공유·백업은 홈 ⚙️ 설정으로) */
import { useState } from 'react';
import History, { SessionHistoryCard } from './History';
import Cumulative from './Cumulative';

export default function Records() {
  const [sub, setSub] = useState('history');
  return (
    <>
      <div className="sub-toggle">
        <div className="pill-toggle">
          <button className={sub === 'history' ? 'on' : ''} onClick={() => setSub('history')}>오늘</button>
          <button className={sub === 'past' ? 'on' : ''} onClick={() => setSub('past')}>지난 모임</button>
          <button className={sub === 'total' ? 'on' : ''} onClick={() => setSub('total')}>누적</button>
        </div>
      </div>
      {sub === 'history' ? <History /> : sub === 'past' ? <SessionHistoryCard /> : <Cumulative />}
    </>
  );
}
