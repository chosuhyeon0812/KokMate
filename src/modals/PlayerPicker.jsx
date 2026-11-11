/* 선수 선택 모달 (바둑판 그리드) - 직접 경기 만들기 / 대기 코트 추가 / 추천 조합 수정 / 진행 중 경기 선수 바꾸기에서 공통으로 사용 */
import { useState } from 'react';
import { useAppState } from '../store';
import { useUI } from '../ui';
import * as actions from '../actions';
import { MAX_WAITING } from '../lib/utils';
import {
  playerById, availablePlayers, playingPlayerIds, waitingModalPlayers, waitingCounts,
  fairnessCompare, freeCourts, waitLabel, LONG_REST_MS,
} from '../lib/selectors';
import { EmptyHint, GuestTag } from '../components/cards';

const EMPTY_SLOTS = [null, null, null, null];

// 모임 밖 사람(레슨자 등) 자리. 노란 '외부' 칸을 누르면 이 표시가 한 칸을 차지하고, 저장할 때는 빠져서 경기에는 우리 사람만 남는다.
// 우리 사람이 적어도 1명은 있어야 하니 최대 3자리.
const OUTSIDERS = ['outsider-1', 'outsider-2', 'outsider-3'];
const isOutsider = id => OUTSIDERS.includes(id);

// 저장된 경기는 우리 사람만 들고 있으니, 4명이 안 되면 나머지를 '외부'로 채워서 보여준다.
function presetSlots(ids) {
  return ids.concat(OUTSIDERS.slice(0, 4 - ids.length));
}

// 직전 경기와 똑같은 4명 조합이면 알려준다. (막지는 않고 안내만. 팀은 코트에서 정하니 파트너는 따지지 않는다)
function pickNotes(state, sel) {
  const done = state.games.filter(g => g.status === 'done').sort((a, b) => b.endTime - a.endTime);
  const inGame = (g, id) => g.teamA.includes(id) || g.teamB.includes(id);
  const lastGameOf = id => done.find(g => inGame(g, id));
  const notes = [];

  if (sel.every(Boolean)) {
    const last = sel.map(lastGameOf);
    if (last.some(g => g && sel.every(id => inGame(g, id)))) notes.push({ warn: true, text: '직전 경기와 같은 4명이에요.' });
  }
  return notes;
}

export default function PlayerPicker({ mode, presetCourt, idx, waitingId, gameId }) {
  const state = useAppState();
  const { toast, warn, closeModal, switchView } = useUI();
  const rec = mode === 'edit' ? state.pendingRecs[idx] : null;
  const wait = mode === 'editWaiting' ? state.waitingMatches.find(w => w.id === waitingId) : null;
  const game = mode === 'editGame' ? state.games.find(g => g.id === gameId && g.status === 'progress') : null;
  const preset = rec || wait || game;
  // 4칸 배열. 빈 칸은 null이라, 한 명을 빼고 다시 고르면 그 칸에 들어간다. (팀은 코트에서 정하니 순서는 상관없다)
  const [selection, setSelection] = useState(() => preset ? presetSlots(preset.teamA.concat(preset.teamB)) : EMPTY_SLOTS);
  const filled = selection.filter(Boolean).length;
  const [courtChoice, setCourtChoice] = useState(presetCourt || null);

  if (mode === 'edit' && !rec) return null;
  if (mode === 'editWaiting' && !wait) return null;
  if (mode === 'editGame' && !game) return null;

  const playing = playingPlayerIds(state);
  const courts = freeCourts(state);
  const court = courts.includes(courtChoice) ? courtChoice : (courts[0] || null);

  // 대기 코트를 짤 때는 다른 대기 코트에 몇 번 들어가 있는지도 보여준다. (한 사람 최대 3곳)
  const forWaiting = mode === 'waiting' || mode === 'editWaiting';
  const waitCount = forWaiting ? waitingCounts(state, waitingId) : new Map();
  let pool;
  if (forWaiting) {
    pool = waitingModalPlayers(state, waitingId).sort((a, b) => {
      const ap = playing.has(a.id) ? 1 : 0, bp = playing.has(b.id) ? 1 : 0;
      if (ap !== bp) return ap - bp;
      const aw = waitCount.get(a.id) || 0, bw = waitCount.get(b.id) || 0;
      return aw !== bw ? aw - bw : fairnessCompare(a, b);
    });
  } else {
    pool = availablePlayers(state).sort(fairnessCompare);
  }
  // 고른 사람은 목록에 꼭 보이게 한다. 진행 중 경기 선수 바꾸기에서는 원래 4명도 넣어서, 뺐다가 다시 고를 수 있게 한다.
  selection.concat(game ? game.teamA.concat(game.teamB) : []).forEach(id => {
    if (id && !pool.find(p => p.id === id)) {
      const p = playerById(state, id);
      if (p) pool.push(p);
    }
  });

  // 누르면 넣고, 다시 누르면 뺀다.
  const pick = id => {
    if (selection.includes(id)) { unpick(id); return; }
    if (filled >= 4) { warn('이미 4명을 골랐어요. 뺄 사람을 먼저 눌러주세요.'); return; }
    setSelection(prev => { const next = [...prev]; next[next.indexOf(null)] = id; return next; });
  };

  const unpick = id => setSelection(prev => prev.map(x => (x === id ? null : x)));

  const submit = () => {
    if (mode === 'manual' && !court) { warn('코트를 골라 주세요.'); return; }
    if (filled !== 4) { warn('4칸을 모두 채워 주세요. 모임 밖 사람은 노란 "외부" 칸을 누르세요.'); return; }
    const members = selection.map(id => (isOutsider(id) ? null : id)); // '외부' 자리는 빼고 저장
    if (mode === 'manual') {
      actions.startGame(court, members);
      closeModal();
      toast('경기를 시작했어요.');
      switchView('home');
    } else if (mode === 'waiting') {
      if (state.waitingMatches.length >= MAX_WAITING) { warn(`대기 코트는 최대 ${MAX_WAITING}개까지 만들 수 있어요.`); return; }
      actions.addWaitingMatch(members);
      closeModal();
      toast('대기 코트에 넣었어요.');
    } else if (mode === 'editGame') {
      actions.updateGamePlayers(gameId, members);
      closeModal();
      toast(`${game.court}번 코트 선수를 바꿨어요.`);
    } else if (mode === 'editWaiting') {
      actions.updateWaitingMatch(waitingId, members);
      closeModal();
      toast('대기 코트 멤버를 수정했어요.');
    } else {
      actions.updateRec(idx, members);
      closeModal();
      toast('조합을 수정했어요.');
    }
  };

  const notes = pickNotes(state, selection);

  // 고른 사람은 아래 카드에 ✓로 보이니, 위에는 몇 명 골랐는지와 초기화 버튼만 둔다.
  const slots = (
    <>
      <div className="pick-count">
        <span><b>{filled}</b> / 4명 선택</span>
        {filled > 0 && <button type="button" className="btn btn-ghost btn-sm" onClick={() => setSelection(EMPTY_SLOTS)}>선택 초기화</button>}
      </div>
      {notes.length > 0 && (
        <div className="pick-notes">
          {notes.map(n => <div key={n.text} className={n.warn ? 'warn' : ''}>{n.warn ? '⚠ ' : 'ℹ '}{n.text}</div>)}
        </div>
      )}
    </>
  );

  const full = filled >= 4;
  // 고른 '외부' 칸은 모두 보여주고, 더 넣을 수 있으면 빈 '외부' 칸을 하나 더 둔다.
  const pickedOutsiders = selection.filter(isOutsider);
  const nextOutsider = OUTSIDERS.find(o => !selection.includes(o));
  const outsiderTiles = pickedOutsiders.concat(!full && nextOutsider ? [nextOutsider] : []);
  const grid = pool.length === 0 ? <EmptyHint>고를 수 있는 참가자가 없어요.</EmptyHint> : (
    <div className="player-grid">
      {outsiderTiles.map(o => (
        <button key={o} type="button" aria-pressed={selection.includes(o)} className={`player-tile outsider${selection.includes(o) ? ' selected' : ''}`} onClick={() => pick(o)}>
          <span className="tile-games">레슨자 등</span>
          {selection.includes(o) && <span className="tile-slot">✓</span>}
          <span className="tile-name">외부</span>
        </button>
      ))}
      {pool.map(p => {
        const i = selection.indexOf(p.id);
                const isPlaying = playing.has(p.id);
        const longRest = !isPlaying && p.restSince && Date.now() - p.restSince >= LONG_REST_MS;
        const disabled = full && i === -1;
        return (
          <button key={p.id} type="button" aria-pressed={i !== -1} className={`player-tile ${p.gender === 'M' ? 'male' : 'female'}${i !== -1 ? ' selected' : ''}${disabled ? ' disabled' : ''}`} onClick={() => pick(p.id)}>
            <span className="tile-games">{p.totalGames}경기</span>
            {i !== -1 && <span className="tile-slot">✓</span>}
            <span className="tile-name">{p.name} <span className="tile-level">/ {p.level}</span><GuestTag player={p} /></span>
            {isPlaying
              ? <span className="tile-meta tile-playing">경기 중</span>
              : <span className={`tile-meta${longRest ? ' tile-long' : ''}`}>{waitLabel(p)}</span>}
            {waitCount.get(p.id) > 0 && <span className="tile-meta tile-waiting">대기 {waitCount.get(p.id)}곳</span>}
          </button>
        );
      })}
    </div>
  );

  const actionsRow = (label) => (
    <div className="modal-actions">
      <button className="btn btn-ghost" onClick={closeModal}>취소</button>
      <button className="btn btn-primary" onClick={submit}>{label}</button>
    </div>
  );

  if (mode === 'manual') {
    return (
      <>
        <h3>경기 만들기</h3>
        <div className="field" style={{ marginBottom: 12 }}>
          <label>코트</label>
          <select value={court || ''} onChange={e => setCourtChoice(Number(e.target.value) || null)}>
            {courts.length === 0
              ? <option value="">사용 가능한 코트 없음</option>
              : courts.map(c => <option key={c} value={c}>{c}번 코트</option>)}
          </select>
        </div>
        {slots}
        {grid}
        {actionsRow('경기 시작')}
      </>
    );
  }

  if (mode === 'waiting') {
    return (
      <>
        <h3>대기 코트 추가</h3>
        <p className="muted" style={{ marginTop: -6, fontSize: '.82rem' }}>다음 경기 멤버를 미리 정해둬요. 지금 경기 중인 선수도 넣을 수 있어요.</p>
        {slots}
        {grid}
        {actionsRow('대기 코트에 추가')}
      </>
    );
  }

  if (mode === 'editGame') {
    return (
      <>
        <h3>선수 바꾸기 · {game.court}번 코트</h3>
        <p className="muted" style={{ marginTop: -6, fontSize: '.82rem' }}>바꿀 사람을 눌러 빼고, 들어갈 사람을 고르세요.</p>
        {slots}
        {grid}
        {actionsRow('저장')}
      </>
    );
  }

  if (mode === 'editWaiting') {
    return (
      <>
        <h3>대기 코트 수정</h3>
        {slots}
        {grid}
        {actionsRow('저장')}
      </>
    );
  }

  return (
    <>
      <h3>추천 조합 수정 · {rec.court}번 코트</h3>
      {slots}
      {grid}
      {actionsRow('저장')}
    </>
  );
}
