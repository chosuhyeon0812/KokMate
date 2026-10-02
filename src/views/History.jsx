import { useAppState } from '../store';
import { useUI } from '../ui';
import * as actions from '../actions';
import { todayStr, timeStr, durationStr } from '../lib/utils';
import { playerName } from '../lib/selectors';
import { EmptyHint } from '../components/cards';
import EndGameModal from '../modals/EndGameModal';

function Memos({ memos }) {
  if (!memos.length) return null;
  return <div className="history-memo">{memos.map((m, i) => <div key={i}>• {m}</div>)}</div>;
}

function SummaryGrid({ totalGames, usedCourts, participants, style }) {
  return (
    <div className="summary-grid" style={style}>
      <div className="summary-box"><div className="num">{totalGames}</div><div className="lbl">총 경기 수</div></div>
      <div className="summary-box"><div className="num">{usedCourts}</div><div className="lbl">사용 코트</div></div>
      <div className="summary-box"><div className="num">{participants}</div><div className="lbl">참가 인원</div></div>
    </div>
  );
}

function SessionHistoryCard() {
  const state = useAppState();
  if (state.sessionHistory.length === 0) {
    return (
      <div className="card">
        <h2>🗓 지난 모임 기록</h2>
        <EmptyHint>아직 저장된 모임이 없습니다. 모임이 끝나면 "홈"에서 "모임 종료"를 눌러 저장하세요.</EmptyHint>
      </div>
    );
  }

  const remove = id => { if (confirm('저장된 모임 기록을 삭제할까요?')) actions.deleteSessionRecord(id); };

  return (
    <div className="card">
      <h2>🗓 지난 모임 기록</h2>
      {state.sessionHistory.map(s => (
        <div className="history-item" key={s.id}>
          <div className="history-head"><span>{s.date}</span><span>{timeStr(s.endedAt)} 종료</span></div>
          <SummaryGrid totalGames={s.totalGames} usedCourts={s.usedCourts} participants={s.participants.length} style={{ margin: '8px 0' }} />
          <details>
            <summary style={{ cursor: 'pointer', fontSize: '.82rem', color: 'var(--primary)' }}>참가자별 경기 수 보기</summary>
            <div style={{ overflowX: 'auto', marginTop: 8 }}>
              <table>
                <thead><tr><th>이름</th><th>경기수</th><th>승</th><th>패</th></tr></thead>
                <tbody>
                  {s.participants.slice().sort((a, b) => b.totalGames - a.totalGames).map((p, i) => (
                    <tr key={i}><td>{p.name}</td><td>{p.totalGames}</td><td>{p.wins}</td><td>{p.losses}</td></tr>
                  ))}
                </tbody>
              </table>
            </div>
          </details>
          <Memos memos={s.memos} />
          <div className="card-actions"><button className="btn btn-danger btn-sm" onClick={() => remove(s.id)}>이 기록 삭제</button></div>
        </div>
      ))}
    </div>
  );
}

export default function History() {
  const state = useAppState();
  const { toast, openModal } = useUI();
  const today = todayStr();
  const todays = actions.todaysDoneGames(state).sort((a, b) => b.endTime - a.endTime);
  const usedCourts = new Set(state.games.filter(g => g.date === today).map(g => g.court)).size;
  const players = new Set();
  todays.forEach(g => g.teamA.concat(g.teamB).forEach(id => players.add(id)));
  const memos = todays.filter(g => g.memo).map(g => `코트${g.court} · ${g.memo}`);
  const names = ids => ids.map(id => playerName(state, id));

  const removeGame = g => {
    if (!confirm(`${g.court}번 코트 ${timeStr(g.startTime)} 경기 기록을 삭제할까요? 참가자 경기 수와 승패에서도 빠집니다.`)) return;
    actions.deleteGame(g.id);
    toast('경기 기록을 삭제했습니다.');
  };

  return (
    <>
      <div className="card">
        <h2>📅 오늘의 기록</h2>
        <SummaryGrid totalGames={todays.length} usedCourts={usedCourts} participants={players.size} />
        <Memos memos={memos} />
      </div>
      <div className="card">
        <h2>📋 경기 기록</h2>
        {todays.length === 0 ? <EmptyHint>오늘 종료된 경기가 없습니다.</EmptyHint> : todays.map(g => (
          <div className="history-item" key={g.id}>
            <div className="history-head">
              <span>{g.court}번 코트 · {g.gameType}</span>
              <span>{timeStr(g.startTime)} ~ {timeStr(g.endTime)} ({durationStr(g.startTime, g.endTime)})</span>
            </div>
            <div className="team-line">
              <span className={`team-name ${g.winner === 'A' ? 'badge-win' : ''}`}>{names(g.teamA).join(' + ')}</span>
              <span className="history-score">{g.winner ? `${g.scoreA} : ${g.scoreB}` : 'VS'}</span>
              <span className={`team-name ${g.winner === 'B' ? 'badge-win' : ''}`}>{names(g.teamB).join(' + ')}</span>
            </div>
            <div className="center muted" style={{ fontSize: '.75rem', marginTop: 4 }}>
              {g.winner ? `승리 · ${names(g.winner === 'A' ? g.teamA : g.teamB).join(', ')}` : '점수 미입력'}
            </div>
            {g.memo && <div className="history-memo">{g.memo}</div>}
            <div className="card-actions">
              <button className="btn btn-outline btn-sm" onClick={() => openModal(<EndGameModal gameId={g.id} edit />)}>결과 수정</button>
              <button className="btn btn-danger btn-sm" onClick={() => removeGame(g)}>삭제</button>
            </div>
          </div>
        ))}
      </div>
      <SessionHistoryCard />
    </>
  );
}
