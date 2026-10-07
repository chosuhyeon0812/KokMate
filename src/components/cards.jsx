import { useAppState } from '../store';
import { useUI } from '../ui';
import * as actions from '../actions';
import { timeStr, starStr } from '../lib/utils';
import { playerName, playingPlayerIds, activeGameOnCourt, waitingDuration, occupiedCourts } from '../lib/selectors';
import { starsFor } from '../lib/matching';
import EndGameModal from '../modals/EndGameModal';
import PlayerPicker from '../modals/PlayerPicker';

export function TeamLine({ teamA, teamB, label, style }) {
  return (
    <div className="team-line" style={style}>
      <span className="team-name">{teamA.map(label).join(' + ')}</span>
      <span className="vs">VS</span>
      <span className="team-name">{teamB.map(label).join(' + ')}</span>
    </div>
  );
}

export function LiveCourtCard({ game: g }) {
  const state = useAppState();
  const { openModal } = useUI();
  return (
    <div className="court-card playing">
      <div className="court-title">
        <span>{g.court}번 코트</span>
        <span className="status-dot live"><span className="dot"></span>진행 중</span>
      </div>
      <TeamLine teamA={g.teamA} teamB={g.teamB} label={id => playerName(state, id)} />
      <div className="muted center" style={{ fontSize: '.75rem' }}>시작 {timeStr(g.startTime)} · {g.gameType}</div>
      <div className="card-actions">
        <button className="btn btn-accent btn-sm btn-block" onClick={() => openModal(<EndGameModal gameId={g.id} />)}>경기 종료 / 점수 입력</button>
      </div>
    </div>
  );
}

export function RecCard({ rec: r, idx }) {
  const state = useAppState();
  const { openModal, toast, warn } = useUI();
  const st = starsFor(r.score);

  const start = () => {
    if (activeGameOnCourt(state, r.court)) { warn('해당 코트에 이미 진행 중인 경기가 있습니다.'); return; }
    actions.startRecommendation(idx);
    toast(`${r.court}번 코트 경기를 시작했습니다.`);
  };

  return (
    <div className="rec-card">
      <div className="section-row" style={{ marginBottom: 6 }}>
        <strong style={{ color: 'var(--accent-dark)' }}>추천 · {r.court}번 코트 · {r.gameType}</strong>
        <div className="row-actions">
          <button className="btn btn-outline btn-sm" onClick={() => openModal(<PlayerPicker mode="edit" idx={idx} />, { wide: true })}>수정</button>
          <button className="btn btn-primary btn-sm" onClick={start}>이 조합으로 경기 시작</button>
        </div>
      </div>
      <TeamLine teamA={r.teamA} teamB={r.teamB} label={id => playerName(state, id)} />
      <div className="rec-score">
        추천 기준 · 경기수균형 {starStr(5)} · 등급균형 {starStr(st.level)} · 파트너중복방지 {starStr(st.partner)} · 상대중복방지 {starStr(st.opponent)}
      </div>
    </div>
  );
}

export function WaitingCard({ match: w }) {
  const state = useAppState();
  const { toast, warn, openModal } = useUI();
  const playing = playingPlayerIds(state);
  const label = id => playing.has(id) ? playerName(state, id) + ' 🔴' : playerName(state, id);
  const hasPlaying = w.teamA.concat(w.teamB).some(id => playing.has(id));

  const start = () => {
    const stillPlaying = w.teamA.concat(w.teamB).filter(pid => playing.has(pid));
    if (stillPlaying.length) { warn(`아직 경기 중인 선수가 있어 시작할 수 없어요: ${stillPlaying.map(id => playerName(state, id)).join(', ')}`); return; }
    const busy = occupiedCourts(state);
    let court = null;
    for (let c = 1; c <= state.settings.courtCount; c++) { if (!busy.has(c)) { court = c; break; } }
    if (!court) { warn('비어있는 코트가 없습니다.'); return; }
    actions.startWaitingMatch(w.id, court);
    toast(`${court}번 코트에서 경기를 시작했습니다.`);
  };

  return (
    <div className="court-card">
      <div className="court-title"><span>대기 중 · {w.gameType}</span><span className="status-dot" style={{ color: 'var(--accent-dark)' }}>🕒 대기</span></div>
      <TeamLine teamA={w.teamA} teamB={w.teamB} label={label} />
      {hasPlaying && <div className="muted center" style={{ fontSize: '.72rem', marginTop: 2 }}>🔴 = 아직 경기 중인 선수. 끝난 뒤 배정하세요.</div>}
      <div className="card-actions">
        <button className="btn btn-primary btn-sm" onClick={start}>코트 배정하고 시작</button>
        <button className="btn btn-outline btn-sm" onClick={() => openModal(<PlayerPicker mode="editWaiting" waitingId={w.id} />, { wide: true })}>수정</button>
        <button className="btn btn-danger btn-sm" onClick={() => actions.deleteWaitingMatch(w.id)}>삭제</button>
      </div>
    </div>
  );
}

export function StatusBadge({ player: p }) {
  const state = useAppState();
  if (!p.active) return <span className="badge badge-rest">당일 제외</span>;
  const dur = waitingDuration(p);
  if (p.resting) return <span className="badge badge-rest">휴식{dur ? ' · ' + dur : ''}</span>;
  if (playingPlayerIds(state).has(p.id)) return <span className="badge badge-playing">경기 중</span>;
  return <span className="badge badge-active">대기{dur ? ' · ' + dur : ''}</span>;
}

export function GenderBadge({ gender }) {
  return <span className={`badge ${gender === 'M' ? 'badge-male' : 'badge-female'}`}>{gender === 'M' ? '남' : '여'}</span>;
}

export function EmptyHint({ children, style }) {
  return <div className="empty-hint" style={style}>{children}</div>;
}

export function Lead({ children, style }) {
  return <p className="muted" style={{ margin: '-6px 0 12px', fontSize: '.82rem', ...style }}>{children}</p>;
}
