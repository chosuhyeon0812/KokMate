import { useAppState } from '../store';
import { useUI } from '../ui';
import * as actions from '../actions';
import { starStr, isGuest } from '../lib/utils';

// 진행 중 코트의 경과 시간: 막 시작하면 '00분', 그 뒤로 '7분', '12분', '1시간 5분'
function elapsedLabel(startTs) {
  const mins = Math.max(0, Math.floor((Date.now() - startTs) / 60000));
  if (mins === 0) return '00분';
  return mins < 60 ? `${mins}분` : `${Math.floor(mins / 60)}시간 ${mins % 60}분`;
}
import { playerName, playerById, playingPlayerIds, activeGameOnCourt, waitingDuration, freeCourts, waitLabel, LONG_REST_MS } from '../lib/selectors';
import { starsFor } from '../lib/matching';
import { useEndGame } from '../modals/EndGameModal';
import PlayerPicker from '../modals/PlayerPicker';

// 남자는 파랑, 여자는 분홍 박스로 이름을 보여준다. (성별 글자 대신 색으로 구분)
// meta를 켜면 왼쪽 위 모서리에 경기 수, 이름 밑에 쉰 시간(경기 중이면 '경기 중')을 보여준다.
// live는 진행 중인 코트처럼 다 같이 경기 중인 게 당연한 곳이라 '경기 중'을 생략한다.
export function NameChips({ ids, label, meta = false, live = false }) {
  const state = useAppState();
  const playing = playingPlayerIds(state);
  return ids.map(id => {
    const p = playerById(state, id);
    const isPlaying = playing.has(id);
    const long = !isPlaying && p && p.restSince && Date.now() - p.restSince >= LONG_REST_MS;
    return (
      <span key={id} className={`name-chip ${p?.gender === 'M' ? 'male' : 'female'}${meta && p ? ' with-meta' : ''}`}>
        {meta && p && <span className="chip-games">{p.totalGames}경기</span>}
        <span className="chip-name">{label(id)}{p && <span className="chip-level"> / {p.level}</span>}{p && <GuestTag player={p} />}</span>
        {meta && p && !live && (isPlaying
          ? <span className="chip-meta chip-playing">경기 중</span>
          : <span className={`chip-meta${long ? ' chip-long' : ''}`}>{waitLabel(p)}</span>)}
      </span>
    );
  });
}

// 팀은 코트에서 가위바위보로 정하니까 VS 없이 4명을 한 묶음으로 보여준다.
export function TeamLine({ teamA, teamB, label, style, live, meta = true }) {
  return (
    <div className="team-line four" style={style}>
      <NameChips ids={teamA.concat(teamB)} label={label} meta={meta} live={live} />
    </div>
  );
}

// 진행 중 코트의 '경기 관리' 창: 종료 / 선수 바꾸기 / 취소
function LiveGameMenu({ gameId }) {
  const state = useAppState();
  const { openModal, closeModal, toast, ask } = useUI();
  const endGame = useEndGame();
  const g = state.games.find(x => x.id === gameId && x.status === 'progress');
  if (!g) return null;

  const cancel = async () => {
    if (!(await ask('기록에 남지 않고 경기 수도 올라가지 않아요.', { title: `${g.court}번 코트 경기를 취소할까요?`, ok: '경기 취소', danger: true }))) return;
    closeModal();
    actions.deleteGame(g.id);
    toast(`${g.court}번 코트 경기를 취소했습니다.`);
  };

  return (
    <>
      <h3>{g.court}번 코트 경기</h3>
      <div className="game-menu">
        <button className="btn btn-accent" onClick={() => { closeModal(); endGame(g); }}>경기 종료</button>
        <button className="btn btn-outline" onClick={() => openModal(<PlayerPicker mode="editGame" gameId={g.id} />, { wide: true })}>선수 바꾸기</button>
        <button className="btn btn-danger" onClick={cancel}>경기 취소</button>
      </div>
      <div className="modal-actions"><button className="btn btn-ghost" onClick={closeModal}>닫기</button></div>
    </>
  );
}

export function LiveCourtCard({ game: g }) {
  const state = useAppState();
  const { openModal } = useUI();

  return (
    <div className="court-card playing">
      <div className="court-title">
        <span>{g.court}번 코트</span>
        <span className="status-dot live elapsed"><span className="dot"></span>{elapsedLabel(g.startTime)}</span>
      </div>
      <TeamLine teamA={g.teamA} teamB={g.teamB} label={id => playerName(state, id)} live />
      <div className="card-actions">
        <button className="btn btn-accent btn-sm btn-block" onClick={() => openModal(<LiveGameMenu gameId={g.id} />)}>경기 관리</button>
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
        <strong style={{ color: 'var(--accent-dark)' }}>추천 · {r.court}번 코트</strong>
        <div className="row-actions">
          <button className="btn btn-outline btn-sm" onClick={() => openModal(<PlayerPicker mode="edit" idx={idx} />, { wide: true })}>수정</button>
          <button className="btn btn-danger btn-sm" onClick={() => actions.deleteRec(idx)}>삭제</button>
          <button className="btn btn-primary btn-sm" onClick={start}>이 조합으로 경기 시작</button>
        </div>
      </div>
      <TeamLine teamA={r.teamA} teamB={r.teamB} label={id => playerName(state, id)} />
      <div className="rec-score">
        추천 기준 · 경기수균형 {starStr(5)} · 급수균형 {starStr(st.level)} · 파트너중복방지 {starStr(st.partner)} · 상대중복방지 {starStr(st.opponent)}
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
      <div className="court-title"><span><span className="wait-no">대기 {no}</span></span><span className="status-dot" style={{ color: 'var(--accent-dark)' }}>🕒 대기</span></div>
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

// showTime=false: 쉰 시간을 옆 칸에 따로 보여줄 때는 상태만
export function StatusBadge({ player: p, showTime = true }) {
  const state = useAppState();
  if (!p.active) return <span className="badge badge-rest">당일 제외</span>;
  const dur = showTime ? waitingDuration(p) : '';
  if (p.resting) return <span className="badge badge-rest">휴식{dur ? ' · ' + dur : ''}</span>;
  if (playingPlayerIds(state).has(p.id)) return <span className="badge badge-playing">경기 중</span>;
  return <span className="badge badge-active">대기{dur ? ' · ' + dur : ''}</span>;
}

export function GenderBadge({ gender }) {
  return <span className={`badge ${gender === 'M' ? 'badge-male' : 'badge-female'}`}>{gender === 'M' ? '남자' : '여자'}</span>;
}

// 이름 옆에 붙는 작은 '게스트' 표시 (모임 종료하면 명단에서 빠지는 사람)
export function GuestTag({ player }) {
  return isGuest(player) ? <span className="guest-tag">게스트</span> : null;
}

export function EmptyHint({ children, style }) {
  return <div className="empty-hint" style={style}>{children}</div>;
}
