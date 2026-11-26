/* 선수 선택 모달 (바둑판 그리드) - 직접 경기 만들기 / 대기 코트 추가·수정 / 진행 중 경기 선수 바꾸기에서 공통으로 사용 */
import { useState } from 'react';
import { useAppState } from '../store';
import { useUI } from '../ui';
import * as actions from '../actions';
import { MAX_WAITING } from '../lib/utils';
import {
  playerById, availablePlayers, playingPlayerIds, waitingModalPlayers, waitingCounts,
  fairnessCompare, freeCourts, waitLabel, LONG_REST_MS, teamSize,
} from '../lib/selectors';
import { EmptyHint, GuestTag } from '../components/cards';
import { rankFills } from '../lib/matching';

const emptySlots = size => Array(size).fill(null);

// 모임 밖 사람(레슨자 등) 자리. 노란 '외부' 칸을 누르면 이 표시가 한 칸을 차지하고, 저장할 때는 빠져서 경기에는 우리 사람만 남는다.
// 우리 사람이 적어도 1명은 있어야 하니 최대 3자리.
const OUTSIDERS = ['outsider-1', 'outsider-2', 'outsider-3'];
const isOutsider = id => OUTSIDERS.includes(id);

// 저장된 경기는 우리 사람만 들고 있으니, 칸 수(복식 4, 단식 2)가 안 차면 나머지를 '외부'로 채워서 보여준다.
function presetSlots(ids, size) {
  return ids.concat(OUTSIDERS.slice(0, size - ids.length));
}

// 칸 수를 바꿀 때(복식↔단식) 우리 사람을 먼저 남기고, 넘치면 뺀다. '외부'는 칸 수보다 1개 적게만 남긴다.
function resize(selection, size) {
  const members = selection.filter(id => id && !isOutsider(id));
  const outsiders = selection.filter(isOutsider).slice(0, size - 1);
  return members.concat(outsiders).slice(0, size).concat(emptySlots(size)).slice(0, size);
}

// 직전 경기와 똑같은 멤버 조합이면 알려준다. (막지는 않고 안내만. 팀은 코트에서 정하니 파트너는 따지지 않는다)
function pickNotes(state, sel) {
  const done = state.games.filter(g => g.status === 'done').sort((a, b) => b.endTime - a.endTime);
  const inGame = (g, id) => g.teamA.includes(id) || g.teamB.includes(id);
  const lastGameOf = id => done.find(g => inGame(g, id));
  const notes = [];

  if (sel.every(Boolean)) {
    const last = sel.map(lastGameOf);
    if (last.some(g => g && sel.every(id => inGame(g, id)))) notes.push({ warn: true, text: `직전 경기와 같은 ${sel.length}명이에요.` });
  }
  return notes;
}

export default function PlayerPicker({ mode, presetCourt, waitingId, gameId }) {
  const state = useAppState();
  const { toast, warn, closeModal, switchView } = useUI();
  const wait = mode === 'editWaiting' ? state.waitingMatches.find(w => w.id === waitingId) : null;
  const game = mode === 'editGame' ? state.games.find(g => g.id === gameId && g.status === 'progress') : null;
  const preset = wait || game;
  // 복식은 4칸, 단식은 2칸 배열. 빈 칸은 null이라, 한 명을 빼고 다시 고르면 그 칸에 들어간다. (팀은 코트에서 정하니 순서는 상관없다)
  const [selection, setSelection] = useState(() => preset ? presetSlots(preset.teamA.concat(preset.teamB), teamSize(preset)) : emptySlots(4));
  const size = selection.length;
  const singles = size === 2;
  const filled = selection.filter(Boolean).length;
  const [courtChoice, setCourtChoice] = useState(presetCourt || null);
  // 마지막 ✨ 추천: 누르기 전 칸(base), 좋은 순서의 조합들(list), 지금 보여주는 순번(i)
  const [recs, setRecs] = useState(null);

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
    if (filled >= size) { warn(`이미 ${size}명을 골랐어요. 뺄 사람을 먼저 눌러주세요.`); return; }
    setSelection(prev => { const next = [...prev]; next[next.indexOf(null)] = id; return next; });
  };

  const unpick = id => setSelection(prev => prev.map(x => (x === id ? null : x)));

  // ✨ 추천: 고른 사람은 두고 빈 칸만 채운다. 경기 중인 사람은 되도록 빼고, 모자랄 때만 넣는다.
  // 추천 결과를 그대로 둔 채 다시 누르면 다음 조합으로 바꾼다. (끝까지 가면 처음으로)
  const fillWith = (base, combo) => { const next = [...base]; combo.forEach(id => { next[next.indexOf(null)] = id; }); return next; };
  const same = (a, b) => a.length === b.length && a.every((x, k) => x === b[k]);
  const recommend = () => {
    if (recs && same(selection, fillWith(recs.base, recs.list[recs.i]))) {
      if (recs.list.length === 1) { warn('다른 조합이 없어요.'); return; }
      const i = (recs.i + 1) % recs.list.length;
      if (i === 0) toast('처음 추천으로 돌아왔어요.');
      setRecs({ ...recs, i });
      setSelection(fillWith(recs.base, recs.list[i]));
      return;
    }
    // 칸이 다 차 있으면(예: 복식에서 고른 뒤 단식으로 바꿈) '외부'만 두고 사람 칸을 다 비워서 새로 추천한다.
    const base = filled >= size ? selection.map(id => (isOutsider(id) ? id : null)) : selection;
    if (!base.includes(null)) { warn('외부 칸만 있어요. 외부 칸을 하나 빼 주세요.'); return; }
    const resting = pool.filter(p => !playing.has(p.id));
    let list = rankFills(state, base, resting);
    if (!list.length) list = rankFills(state, base, pool);
    if (!list.length) { warn('빈 칸을 채울 사람이 모자라요.'); return; }
    // 지금 칸과 똑같은 조합은 건너뛰고 보여준다.
    const key = arr => arr.filter(Boolean).sort().join();
    const i = Math.max(0, list.findIndex(c => key(fillWith(base, c)) !== key(selection)));
    setRecs({ base, list, i });
    setSelection(fillWith(base, list[i]));
  };

  const submit = () => {
    if (mode === 'manual' && !court) { warn('코트를 골라 주세요.'); return; }
    if (filled !== size) { warn(`${size}칸을 모두 채워 주세요. 모임 밖 사람은 노란 "외부" 칸을 누르세요.`); return; }
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
    } else {
      actions.updateWaitingMatch(waitingId, members);
      closeModal();
      toast('대기 코트 멤버를 수정했어요.');
    }
  };

  const notes = pickNotes(state, selection);

  // 고른 사람은 아래 카드에 ✓로 보이니, 위에는 복식/단식 스위치와 몇 명 골랐는지, 초기화 버튼만 둔다.
  const slots = (
    <>
      <div className="gender-seg pick-type" role="group" aria-label="종목">
        <button type="button" className={singles ? '' : 'on'} aria-pressed={!singles} onClick={() => setSelection(s => resize(s, 4))}>복식</button>
        <button type="button" className={singles ? 'on' : ''} aria-pressed={singles} onClick={() => setSelection(s => resize(s, 2))}>단식</button>
      </div>
      <div className="pick-count">
        <span><b>{filled}</b> / {size}명 선택</span>
        {filled > 0 && <button type="button" className="btn btn-ghost btn-sm" onClick={() => setSelection(emptySlots(size))}>선택 초기화</button>}
      </div>
      {notes.length > 0 && (
        <div className="pick-notes">
          {notes.map(n => <div key={n.text} className={n.warn ? 'warn' : ''}>{n.warn ? '⚠ ' : 'ℹ '}{n.text}</div>)}
        </div>
      )}
    </>
  );

  const full = filled >= size;
  // 고른 '외부' 칸은 모두 보여주고, 더 넣을 수 있으면 빈 '외부' 칸을 하나 더 둔다. (우리 사람이 1명은 있어야 하니 칸 수보다 1개 적게)
  const pickedOutsiders = selection.filter(isOutsider);
  const nextOutsider = pickedOutsiders.length < size - 1 && OUTSIDERS.find(o => !selection.includes(o));
  const outsiderTiles = pickedOutsiders.concat(!full && nextOutsider ? [nextOutsider] : []);
  const grid = pool.length === 0 ? <EmptyHint>고를 수 있는 참석자가 없어요.</EmptyHint> : (
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

  // 제목 줄 오른쪽 끝 ✨: 누르면 빈 칸을 추천으로 채운다.
  const title = text => (
    <div className="section-row pick-title">
      <h3 className="mb0">{text}</h3>
      <button type="button" className="pick-rec" title="추천 (다시 누르면 다음 추천)" aria-label="추천으로 빈 칸 채우기, 다시 누르면 다음 추천" onClick={recommend}>✨</button>
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
        {title('경기 만들기')}
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
        {title('대기 코트 추가')}
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
        {title(`선수 바꾸기 · ${game.court}번 코트`)}
        <p className="muted" style={{ marginTop: -6, fontSize: '.82rem' }}>바꿀 사람을 눌러 빼고, 들어갈 사람을 고르세요.</p>
        {slots}
        {grid}
        {actionsRow('저장')}
      </>
    );
  }

  return (
    <>
      {title('대기 코트 수정')}
      {slots}
      {grid}
      {actionsRow('저장')}
    </>
  );
}
