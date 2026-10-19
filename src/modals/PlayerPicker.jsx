/* 선수 선택 모달 (바둑판 그리드) - 직접 경기 만들기 / 대기 코트 추가 / 추천 조합 수정 / 진행 중 경기 선수 바꾸기에서 공통으로 사용 */
import { useState } from 'react';
import { useAppState } from '../store';
import { useUI } from '../ui';
import * as actions from '../actions';
import { MAX_WAITING } from '../lib/utils';
import {
  playerById, availablePlayers, playingPlayerIds, waitingModalPlayers,
  fairnessCompare, freeCourts, shortWait, LONG_REST_MS,
} from '../lib/selectors';
import { EmptyHint } from '../components/cards';

const EMPTY_SLOTS = [null, null, null, null];

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
  const [selection, setSelection] = useState(() => preset ? preset.teamA.concat(preset.teamB) : EMPTY_SLOTS);
  const filled = selection.filter(Boolean).length;
  const [courtChoice, setCourtChoice] = useState(presetCourt || null);

  if (mode === 'edit' && !rec) return null;
  if (mode === 'editWaiting' && !wait) return null;
  if (mode === 'editGame' && !game) return null;

  const playing = playingPlayerIds(state);
  const courts = freeCourts(state);
  const court = courts.includes(courtChoice) ? courtChoice : (courts[0] || null);

  let pool;
  if (mode === 'waiting' || mode === 'editWaiting') {
    pool = waitingModalPlayers(state, waitingId).sort((a, b) => {
      const ap = playing.has(a.id) ? 1 : 0, bp = playing.has(b.id) ? 1 : 0;
      return ap !== bp ? ap - bp : fairnessCompare(a, b);
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
    if (mode === 'manual' && !court) { warn('코트를 선택하세요.'); return; }
    if (filled !== 4) { warn('4명 모두 선택하세요.'); return; }
    if (mode === 'manual') {
      actions.startGame(court, selection);
      closeModal();
      toast('경기를 시작했습니다.');
      switchView('home');
    } else if (mode === 'waiting') {
      if (state.waitingMatches.length >= MAX_WAITING) { warn(`대기 코트는 최대 ${MAX_WAITING}개까지 만들 수 있어요.`); return; }
      actions.addWaitingMatch(selection);
      closeModal();
      toast('대기 코트에 추가되었습니다.');
    } else if (mode === 'editGame') {
      actions.updateGamePlayers(gameId, selection);
      closeModal();
      toast(`${game.court}번 코트 선수를 바꿨습니다.`);
    } else if (mode === 'editWaiting') {
      actions.updateWaitingMatch(waitingId, selection);
      closeModal();
      toast('대기 코트 멤버를 수정했습니다.');
    } else {
      actions.updateRec(idx, selection);
      closeModal();
      toast('조합이 수정되었습니다.');
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
  const grid = pool.length === 0 ? <EmptyHint>선택 가능한 참가자가 없습니다.</EmptyHint> : (
    <div className="player-grid">
      {pool.map(p => {
        const i = selection.indexOf(p.id);
                const isPlaying = playing.has(p.id);
        const longRest = !isPlaying && p.restSince && Date.now() - p.restSince >= LONG_REST_MS;
        const corner = isPlaying ? '경기 중' : shortWait(p);
        const disabled = full && i === -1;
        return (
          <button key={p.id} type="button" className={`player-tile ${p.gender === 'M' ? 'male' : 'female'}${i !== -1 ? ' selected' : ''}${disabled ? ' disabled' : ''}`} onClick={() => pick(p.id)}>
            {i !== -1 && <span className="tile-slot">✓</span>}
            {isPlaying && <span className="tile-corner playing">경기 중</span>}
            <span className="tile-name">{p.name} <span className="tile-level">/ {p.level}</span></span>
            <span className="tile-meta">{p.totalGames}경기</span>
            {corner && !isPlaying && <span className={`tile-meta${longRest ? ' tile-long' : ''}`}>{corner} 휴식</span>}
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
