/* 선수 선택 모달 (바둑판 그리드) - 직접 경기 만들기 / 대기 코트 추가 / 추천 조합 수정 / 진행 중 경기 선수 바꾸기에서 공통으로 사용 */
import { useState } from 'react';
import { useAppState } from '../store';
import { useUI } from '../ui';
import * as actions from '../actions';
import { genderLabel, MAX_WAITING } from '../lib/utils';
import {
  playerById, playerName, availablePlayers, playingPlayerIds, waitingModalPlayers,
  fairnessCompare, freeCourts, shortWait, LONG_REST_MS,
} from '../lib/selectors';
import { EmptyHint } from '../components/cards';

const EMPTY_SLOTS = [null, null, null, null];
const SLOT_TAGS = ['A1', 'A2', 'B1', 'B2'];

// 고른 팀에서 오늘 이미 같이 뛴 파트너, 직전 경기와 똑같은 4명 조합을 알려준다. (막지는 않고 안내만)
function pickNotes(state, sel) {
  const done = state.games.filter(g => g.status === 'done').sort((a, b) => b.endTime - a.endTime);
  const inGame = (g, id) => g.teamA.includes(id) || g.teamB.includes(id);
  const sameTeam = (g, x, y) => (g.teamA.includes(x) && g.teamA.includes(y)) || (g.teamB.includes(x) && g.teamB.includes(y));
  const lastGameOf = id => done.find(g => inGame(g, id));
  const notes = [];

  if (sel.every(Boolean)) {
    const last = sel.map(lastGameOf);
    if (last.some(g => g && sel.every(id => inGame(g, id)))) notes.push({ warn: true, text: '직전 경기와 같은 4명이에요.' });
  }
  for (const [x, y] of [[sel[0], sel[1]], [sel[2], sel[3]]]) {
    if (!x || !y) continue;
    const count = done.filter(g => sameTeam(g, x, y)).length;
    if (!count) continue;
    const pair = `${playerName(state, x)} + ${playerName(state, y)}`;
    const recent = [lastGameOf(x), lastGameOf(y)].some(g => g && sameTeam(g, x, y));
    notes.push(recent
      ? { warn: true, text: `${pair}: 직전 경기에서도 파트너였어요 (오늘 ${count}번)` }
      : { warn: false, text: `${pair}: 오늘 ${count}번 파트너였어요` });
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
  // 자리(A1, A2, B1, B2)를 고정한 4칸 배열. 빈 자리는 null이라, 한 명을 빼고 다시 고르면 그 자리에 들어간다.
  const [selection, setSelection] = useState(() => preset ? preset.teamA.concat(preset.teamB) : EMPTY_SLOTS);
  const filled = selection.filter(Boolean).length;
  const [courtChoice, setCourtChoice] = useState(presetCourt || null);
  // 위쪽 자리 칸을 눌러 고른 자리. 고른 상태에서 선수를 누르면 그 자리에 들어가고, 다른 자리를 누르면 서로 바뀐다.
  const [activeSlot, setActiveSlot] = useState(null);

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

  const swapSlots = (i, j) => setSelection(prev => { const next = [...prev]; [next[i], next[j]] = [next[j], next[i]]; return next; });

  const pick = id => {
    const at = selection.indexOf(id);
    if (activeSlot !== null) {
      // 고른 자리에 넣는다. 이미 다른 자리에 있던 사람이면 두 자리를 맞바꾼다.
      if (at === -1) setSelection(prev => { const next = [...prev]; next[activeSlot] = id; return next; });
      else if (at !== activeSlot) swapSlots(at, activeSlot);
      else unpick(id);
      setActiveSlot(null);
      return;
    }
    if (at !== -1) { unpick(id); return; }
    if (filled >= 4) { warn('이미 4명이 선택되었습니다. 자리 칸을 누르면 그 자리 사람을 바꿀 수 있어요.'); return; }
    setSelection(prev => { const next = [...prev]; next[next.indexOf(null)] = id; return next; });
  };

  // 자리 칸 누르기: 처음 누르면 그 자리를 고르고, 같은 자리를 한 번 더 누르면 비우고, 다른 자리를 누르면 서로 바꾼다.
  const tapSlot = i => {
    if (activeSlot === null) { setActiveSlot(i); return; }
    if (activeSlot === i) {
      if (selection[i]) unpick(selection[i]);
      else setActiveSlot(null);
      return;
    }
    swapSlots(activeSlot, i);
    setActiveSlot(null);
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

  const chip = (i, tag) => {
    const id = selection[i];
    return (
      <div className={`slot-chip${id ? ' filled' : ''}${activeSlot === i ? ' active' : ''}`} onClick={() => tapSlot(i)}>
        <span className="slot-tag">{tag}</span>{id ? playerName(state, id) : '선택 안 됨'}
      </div>
    );
  };

  const slots = (
    <>
      <div className="picker-slots">{chip(0, SLOT_TAGS[0])}{chip(1, SLOT_TAGS[1])}<span className="slot-vs">VS</span>{chip(2, SLOT_TAGS[2])}{chip(3, SLOT_TAGS[3])}</div>
      {filled > 0 && (
        <div className="center" style={{ margin: '2px 0 10px' }}>
          <button type="button" className="btn btn-ghost btn-sm" onClick={() => { setSelection(EMPTY_SLOTS); setActiveSlot(null); }}>선택 초기화</button>
        </div>
      )}
      <div className="slot-hint">
        {activeSlot === null
          ? '자리 칸을 누르면 그 자리에 넣거나, 두 자리를 서로 바꿀 수 있어요.'
          : `${SLOT_TAGS[activeSlot]} 자리를 골랐어요. 넣을 사람을 누르거나 다른 자리를 눌러 바꾸세요.${selection[activeSlot] ? ' (한 번 더 누르면 비워요)' : ''}`}
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
        const team = i === -1 ? '' : (i < 2 ? 'a' : 'b');
        const isPlaying = playing.has(p.id);
        const longRest = !isPlaying && p.restSince && Date.now() - p.restSince >= LONG_REST_MS;
        const corner = isPlaying ? '경기 중' : shortWait(p);
        const disabled = full && i === -1 && activeSlot === null;
        return (
          <button key={p.id} type="button" className={`player-tile ${i !== -1 ? 'selected team-' + team : ''}${disabled ? ' disabled' : ''}`} onClick={() => pick(p.id)}>
            {i !== -1 && <span className="tile-slot">{team.toUpperCase()}{i % 2 + 1}</span>}
            {corner && <span className={`tile-corner${isPlaying ? ' playing' : longRest ? ' long' : ''}`}>{corner}</span>}
            <span className="tile-name">{p.name}</span>
            <span className="tile-meta">{genderLabel(p.gender)} · {p.level} · {p.totalGames}경기</span>
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
