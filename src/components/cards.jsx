import { useAppState } from '../store';
import { useUI } from '../ui';
import * as actions from '../actions';
import { timeStr, starStr, durationStr } from '../lib/utils';
import { playerName, playerById, playingPlayerIds, activeGameOnCourt, waitingDuration, freeCourts, shortWait, LONG_REST_MS } from '../lib/selectors';
import { starsFor } from '../lib/matching';
import EndGameModal from '../modals/EndGameModal';
import PlayerPicker from '../modals/PlayerPicker';

// 20분 넘게 쉰 사람 표시. 이모지는 기기마다 색이 달라서 메인 청록색 셔틀콕을 직접 그린다.
export function RestAlarm() {
  return (
    <span className="rest-alarm" role="img" aria-label="20분 넘게 쉼" title="20분 넘게 쉼">
      <svg viewBox="0 0 24 24" width="18" height="18" fill="none" aria-hidden="true">
        <path d="M5 3H19L15 14H9Z" fill="var(--primary-pale-2)" stroke="var(--primary)" strokeWidth="1.6" strokeLinejoin="round" />
        <path d="M9.6 3.4 11 14M14.4 3.4 13 14M7 8.5H17" stroke="var(--primary)" strokeWidth="1.2" />
        <path d="M8.5 14H15.5V16A3.5 3.5 0 0 1 8.5 16Z" fill="var(--primary)" />
      </svg>
    </span>
  );
}

// 남자는 파랑, 여자는 분홍 박스로 이름을 보여준다. (성별 글자 대신 색으로 구분)
// meta를 켜면 이름 밑에 오늘 경기 수와 쉰 시간(경기 중이면 '경기 중')을 같이 보여준다.
// live는 진행 중인 코트처럼 다 같이 경기 중인 게 당연한 곳이라 '경기 중'을 생략한다.
export function NameChips({ ids, label, meta = false, live = false }) {
  const state = useAppState();
  const playing = playingPlayerIds(state);
  return ids.map(id => {
    const p = playerById(state, id);
    const isPlaying = playing.has(id);
    const wait = !isPlaying && p ? shortWait(p) : '';
    const long = wait && Date.now() - p.restSince >= LONG_REST_MS;
    return (
      <span key={id} className={`name-chip ${p?.gender === 'M' ? 'male' : 'female'}`}>
        {meta && long && <RestAlarm />}
        <span className="chip-name">{label(id)}{p && <span className="chip-level"> / {p.level}</span>}</span>
        {meta && p && (
          <>
            <span className="chip-meta">{p.totalGames}경기</span>
            {isPlaying && !live && <span className="chip-meta chip-playing">경기 중</span>}
            {wait && <span className={`chip-meta${long ? ' chip-long' : ''}`}>{wait} 휴식</span>}
          </>
        )}
      </span>
    );
  });
}

export function TeamLine({ teamA, teamB, label, style, live }) {
  return (
    <div className="team-line" style={style}>
      <span className="team-name"><NameChips ids={teamA} label={label} meta live={live} /></span>
      <span className="vs">VS</span>
      <span className="team-name"><NameChips ids={teamB} label={label} meta live={live} /></span>
    </div>
  );
}

export function LiveCourtCard({ game: g }) {
  const state = useAppState();
  const { openModal, toast } = useUI();

  const cancel = () => {
    if (!confirm(`${g.court}번 코트 경기를 취소할까요? 기록에 남지 않고 경기 수도 올라가지 않습니다.`)) return;
    actions.deleteGame(g.id);
    toast(`${g.court}번 코트 경기를 취소했습니다.`);
  };

  return (
    <div className="court-card playing">
      <div className="court-title">
        <span>{g.court}번 코트</span>
        <span className="status-dot live"><span className="dot"></span>진행 중</span>
      </div>
      <TeamLine teamA={g.teamA} teamB={g.teamB} label={id => playerName(state, id)} live />
      <div className="muted center" style={{ fontSize: '.75rem' }}>시작 {timeStr(g.startTime)} · <b className="elapsed">{durationStr(g.startTime, Date.now())}째</b> · {g.gameType}</div>
      <div className="card-actions">
        <button className="btn btn-accent btn-sm btn-block" onClick={() => openModal(<EndGameModal gameId={g.id} />)}>경기 종료 / 점수 입력</button>
      </div>
      <div className="card-actions">
        <button className="btn btn-outline btn-sm" onClick={() => openModal(<PlayerPicker mode="editGame" gameId={g.id} />, { wide: true })}>선수 바꾸기</button>
        <button className="btn btn-danger btn-sm" onClick={cancel}>경기 취소</button>
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

export function WaitingCard({ match: w, no }) {
  const state = useAppState();
  const { toast, warn, openModal } = useUI();
  const playing = playingPlayerIds(state);
  const hasPlaying = w.teamA.concat(w.teamB).some(id => playing.has(id));

  const start = () => {
    const stillPlaying = w.teamA.concat(w.teamB).filter(pid => playing.has(pid));
    if (stillPlaying.length) { warn(`아직 경기 중인 선수가 있어 시작할 수 없어요: ${stillPlaying.map(id => playerName(state, id)).join(', ')}`); return; }
    const court = freeCourts(state)[0];
    if (!court) { warn('비어있는 코트가 없습니다.'); return; }
    actions.startWaitingMatch(w.id, court);
    toast(`${court}번 코트에서 경기를 시작했습니다.`);
  };

  return (
    <div className="court-card">
      <div className="court-title"><span><span className="wait-no">대기 {no}</span> {w.gameType}</span><span className="status-dot" style={{ color: 'var(--accent-dark)' }}>🕒 대기</span></div>
      <TeamLine teamA={w.teamA} teamB={w.teamB} label={id => playerName(state, id)} />
      {hasPlaying && <div className="muted center" style={{ fontSize: '.72rem', marginTop: 2 }}>"경기 중" 선수가 있어요. 그 경기가 끝난 뒤 배정하세요.</div>}
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
  return <span className={`badge ${gender === 'M' ? 'badge-male' : 'badge-female'}`}>{gender === 'M' ? '남자' : '여자'}</span>;
}

export function EmptyHint({ children, style }) {
  return <div className="empty-hint" style={style}>{children}</div>;
}
