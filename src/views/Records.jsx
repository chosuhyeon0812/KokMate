/* 기록 탭: 경기 기록, 참가자 통계, 누적 기록, 팀 공유·백업을 위쪽 토글로 전환해서 보여준다. */
import { useState } from 'react';
import History from './History';
import Stats from './Stats';
import Cumulative from './Cumulative';
import Backup from './Backup';

export default function Records() {
  const [sub, setSub] = useState('history');
  return (
    <>
      <div className="sub-toggle">
        <div className="pill-toggle">
          <button className={sub === 'history' ? 'on' : ''} onClick={() => setSub('history')}>경기 기록</button>
          <button className={sub === 'stats' ? 'on' : ''} onClick={() => setSub('stats')}>통계</button>
          <button className={sub === 'total' ? 'on' : ''} onClick={() => setSub('total')}>누적</button>
          <button className={sub === 'backup' ? 'on' : ''} onClick={() => setSub('backup')}>공유·백업</button>
        </div>
      </div>
      {sub === 'history' ? <History /> : sub === 'stats' ? <Stats /> : sub === 'total' ? <Cumulative /> : <Backup />}
    </>
  );
}
