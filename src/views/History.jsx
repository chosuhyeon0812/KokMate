import { useAppState } from '../store';
import { useUI } from '../ui';
import * as actions from '../actions';
import { timeStr, durationStr } from '../lib/utils';
import { playerName } from '../lib/selectors';
import { EmptyHint, NameChips, OutsiderChips, RankLabel, RankName } from '../components/cards';
import { shareRanking, rankOf } from '../lib/shareImage';

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

// "2026-10-19" → "10월 19일 (일)"
function dateLabel(date) {
  const [y, m, d] = date.split('-').map(Number);
  return `${m}월 ${d}일 (${'일월화수목금토'[new Date(y, m - 1, d).getDay()]})`;
}

function SessionHistoryCard() {
  const state = useAppState();
  const { ask, toast, warn } = useUI();
  if (state.sessionHistory.length === 0) {
    return (
      <div className="card">
        <h2>지난 모임 기록</h2>
        <EmptyHint>아직 저장된 모임이 없어요. 모임이 끝나면 "매칭" 화면의 "모임 종료"를 눌러 저장하세요.</EmptyHint>
      </div>
    );
  }

  // 지난 모임 순위: 많이 친 사람부터, 같은 경기 수는 같은 순위 (통계 탭과 같은 모양)
  const rankingOf = s => {
    const list = s.participants.slice().sort((a, b) => b.totalGames - a.totalGames || a.name.localeCompare(b.name, 'ko'));
    return { list, ranks: rankOf(list, (a, b) => a.totalGames === b.totalGames) };
  };

  const share = async s => {
    const { list, ranks } = rankingOf(s);
    const [, m, d] = s.date.split('-').map(Number);
    try {
      const result = await shareRanking({
        title: `${m}월 ${d}일 경기 순위`, subtitle: `${dateLabel(s.date)} · 경기 ${s.totalGames}판 · ${list.length}명`, columns: ['경기수'],
        rows: list.map((p, i) => ({ rank: ranks[i], name: p.name, level: p.level, gender: p.gender, values: [p.totalGames] })),
        filename: `콕메이트-경기순위-${s.date}.png`,
      });
      if (result === 'saved') toast('사진을 저장했어요.');
    } catch (e) {
      warn('사진을 만들지 못했어요.');
    }
  };

  const remove = async id => { if (await ask('삭제하면 되돌릴 수 없어요.', { title: '저장된 모임 기록을 삭제할까요?', ok: '삭제', danger: true })) actions.deleteSessionRecord(id); };

  return (
    <div className="card">
      <h2>지난 모임 기록</h2>
      {state.sessionHistory.map(s => { const { list, ranks } = rankingOf(s); return (
        // 모임이 쌓이면 길어지므로 한 줄 요약으로 접어두고, 누르면 참가자별 경기 수와 메모가 펼쳐진다.
        <details className="history-item fold-item" key={s.id}>
          <summary>
            <div className="history-head"><span>{dateLabel(s.date)}</span></div>
            <div className="fold-line"><span>코트 <b>{s.usedCourts}</b>개</span><span>경기 <b>{s.totalGames}</b>번</span><span>인원 <b>{s.participants.length}</b>명</span>{s.memos.length > 0 && <span>📝</span>}</div>
          </summary>
          <div style={{ overflowX: 'auto', marginTop: 8 }}>
            <table className="rank-table">
              <thead><tr><th>순위</th><th>이름</th><th>경기수</th></tr></thead>
              <tbody>
                {list.map((p, i) => (
                  <tr key={i}><td className="rank-cell"><RankLabel rank={ranks[i]} /></td><td><RankName person={p} /></td><td>{p.totalGames}</td></tr>
                ))}
              </tbody>
            </table>
          </div>
          <Memos memos={s.memos} />
          <div className="card-actions">
            <button className="btn btn-outline btn-sm" onClick={() => share(s)}>공유</button>
            <button className="btn btn-danger btn-sm" onClick={() => remove(s.id)}>이 기록 삭제</button>
          </div>
        </details>
      ); })}
    </div>
  );
}

export default function History() {
  const state = useAppState();
  const { toast, ask } = useUI();
  const todays = actions.sessionDoneGames(state).sort((a, b) => b.endTime - a.endTime);
  const usedCourts = new Set(state.games.map(g => g.court)).size;
  const players = new Set();
  todays.forEach(g => g.teamA.concat(g.teamB).forEach(id => players.add(id)));
  const memos = todays.filter(g => g.memo).map(g => `코트${g.court} · ${g.memo}`);
  const names = ids => ids.map(id => playerName(state, id));

  const removeGame = async g => {
    if (!(await ask('4명의 경기 수에서도 1씩 빠져요.', { title: `${g.court}번 코트 ${timeStr(g.startTime)} 경기 기록을 삭제할까요?`, ok: '삭제', danger: true }))) return;
    actions.deleteGame(g.id);
    toast('경기 기록을 삭제했어요.');
  };

  return (
    <>
      <div className="card">
        <h2>오늘 요약</h2>
        <SummaryGrid totalGames={todays.length} usedCourts={usedCourts} participants={players.size} />
        <Memos memos={memos} />
      </div>
      <div className="card">
        <h2>경기 기록</h2>
        {todays.length === 0 ? <EmptyHint>오늘 끝난 경기가 아직 없어요.</EmptyHint> : todays.map(g => (
          <div className="history-item" key={g.id}>
            <div className="history-head">
              <span>{g.court}번 코트 · {g.gameType}</span>
              <span className="history-head-right">
                {timeStr(g.startTime)} ~ {timeStr(g.endTime)} ({durationStr(g.startTime, g.endTime)})
                <button className="history-del" aria-label="경기 기록 삭제" onClick={() => removeGame(g)}>✕</button>
              </span>
            </div>
            <div className="team-line four">
              <NameChips ids={g.teamA.concat(g.teamB)} label={id => playerName(state, id)} />
              <OutsiderChips count={g.teamA.length + g.teamB.length} />
            </div>
            {/* 예전에 승패를 기록했던 경기만 결과를 보여준다 */}
            {g.winner && (
              <div className="center muted" style={{ fontSize: '.75rem', marginTop: 4 }}>
                승리 · {names(g.winner === 'A' ? g.teamA : g.teamB).join(', ')}{g.scoreA != null ? ` (${g.scoreA}:${g.scoreB})` : ''}
              </div>
            )}
            {g.memo && <div className="history-memo">{g.memo}</div>}
          </div>
        ))}
      </div>
      <SessionHistoryCard />
    </>
  );
}
