/* 기록 탭: 경기 기록과 참가자 통계를 위쪽 토글로 전환해서 보여준다. */
import { useState } from 'react';
import History from './History';
import Stats from './Stats';

export default function Records() {
  const [sub, setSub] = useState('history');
  return (
    <>
      <div className="sub-toggle">
        <div className="pill-toggle">
          <button className={sub === 'history' ? 'on' : ''} onClick={() => setSub('history')}>경기 기록</button>
          <button className={sub === 'stats' ? 'on' : ''} onClick={() => setSub('stats')}>통계</button>
        </div>
      </div>
      {sub === 'history' ? <History /> : <Stats />}
    </>
  );
}
