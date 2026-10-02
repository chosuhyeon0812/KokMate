/* 선수 선택 모달 (바둑판 그리드) - 직접 경기 만들기 / 대기 코트 추가 / 추천 조합 수정에서 공통으로 사용 */
import { useState } from 'react';
import { useAppState } from '../store';
import { useUI } from '../ui';
import * as actions from '../actions';
import { genderLabel } from '../lib/utils';
import {
  playerById, playerName, availablePlayers, playingPlayerIds, waitingModalPlayers,
  fairnessCompare, waitingDuration, freeCourts,
} from '../lib/selectors';
import { EmptyHint } from '../components/cards';

export default function PlayerPicker({ mode, presetCourt, idx }) {
  const state = useAppState();
  const { toast, closeModal, switchView } = useUI();
  const rec = mode === 'edit' ? state.pendingRecs[idx] : null;
  const [selection, setSelection] = useState(() => rec ? rec.teamA.concat(rec.teamB) : []);
  const [courtChoice, setCourtChoice] = useState(presetCourt || null);

  if (mode === 'edit' && !rec) return null;

  const playing = playingPlayerIds(state);
  const courts = freeCourts(state);
  const court = courts.includes(courtChoice) ? courtChoice : (courts[0] || null);

  let pool;
  if (mode === 'waiting') {
    pool = waitingModalPlayers(state).sort((a, b) => {
      const ap = playing.has(a.id) ? 1 : 0, bp = playing.has(b.id) ? 1 : 0;
      return ap !== bp ? ap - bp : fairnessCompare(a, b);
    });
  } else {
    pool = availablePlayers(state).sort(fairnessCompare);
  }
  selection.forEach(id => {
    if (!pool.find(p => p.id === id)) {
      const p = playerById(state, id);
      if (p) pool.push(p);
    }
  });

  const pick = id => {
    if (!selection.includes(id) && selection.length >= 4) { toast('이미 4명이 선택되었습니다. 먼저 선택을 해제하세요.'); return; }
    setSelection(prev => prev.includes(id) ? prev.filter(x => x !== id) : prev.length < 4 ? [...prev, id] : prev);
  };

  const submit = () => {
    if (mode === 'manual' && !court) { toast('코트를 선택하세요.'); return; }
    if (selection.length !== 4) { toast('4명 모두 선택하세요.'); return; }
    if (mode === 'manual') {
      actions.startGame(court, selection);
      closeModal();
      toast('경기를 시작했습니다.');
      switchView('home');
    } else if (mode === 'waiting') {
      actions.addWaitingMatch(selection);
      closeModal();
      toast('대기 코트에 추가되었습니다.');
    } else {
      actions.updateRec(idx, selection);
      closeModal();
      toast('조합이 수정되었습니다.');
    }
  };

  const chip = (i, tag) => {
    const id = selection[i];
    return (
      <div className={`slot-chip ${id ? 'filled' : ''}`} onClick={() => id && setSelection(prev => prev.filter(x => x !== id))}>
        <span className="slot-tag">{tag}</span>{id ? playerName(state, id) : '선택 안 됨'}
      </div>
    );
  };

  const slots = (
    <>
      <div className="picker-slots">{chip(0, 'A1')}{chip(1, 'A2')}<span className="slot-vs">VS</span>{chip(2, 'B1')}{chip(3, 'B2')}</div>
      {selection.length > 0 && (
        <div className="center" style={{ margin: '2px 0 10px' }}>
          <button type="button" className="btn btn-ghost btn-sm" onClick={() => setSelection([])}>선택 초기화</button>
        </div>
      )}
    </>
  );

  const full = selection.length >= 4;
  const grid = pool.length === 0 ? <EmptyHint>선택 가능한 참가자가 없습니다.</EmptyHint> : (
    <div className="player-grid">
      {pool.map(p => {
        const i = selection.indexOf(p.id);
        const team = i === -1 ? '' : (i < 2 ? 'a' : 'b');
        const waitPart = playing.has(p.id) ? '🔴 경기 중' : waitingDuration(p);
        const disabled = full && i === -1;
        return (
          <button key={p.id} type="button" className={`player-tile ${i !== -1 ? 'selected team-' + team : ''}${disabled ? ' disabled' : ''}`} onClick={() => pick(p.id)}>
            {i !== -1 && <span className="tile-badge">팀{team.toUpperCase()} · {i % 2 + 1}</span>}
            <span className="tile-name">{p.name}</span>
            <span className="tile-meta">{genderLabel(p.gender)}/{p.level} · {p.totalGames}경기{waitPart ? ' · ' + waitPart : ''}</span>
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
        <h3>🛠 직접 경기 만들기</h3>
        <div className="field" style={{ marginBottom: 12 }}>
          <label>코트</label>
          <select value={court || ''} onChange={e => setCourtChoice(Number(e.target.value) || null)}>
            {courts.length === 0
              ? <option value="">사용 가능한 코트 없음</option>
              : courts.map(c => <option key={c} value={c}>{c}번 코트</option>)}
          </select>
        </div>
        {slots}
        <p className="muted" style={{ fontSize: '.78rem', margin: '8px 0' }}>선수를 누른 순서대로 팀 A 2명 → 팀 B 2명에 배정됩니다. 다시 누르면 선택이 취소돼요.</p>
        {grid}
        {actionsRow('경기 시작')}
      </>
    );
  }

  if (mode === 'waiting') {
    return (
      <>
        <h3>🕒 대기 코트 추가</h3>
        <p className="muted" style={{ marginTop: -6, fontSize: '.82rem' }}>코트를 아직 정하지 않고 다음 경기 멤버만 먼저 정해둡니다. 코트가 비면 나중에 배정해서 바로 시작할 수 있어요. 지금 경기 중인 선수도 다음 경기 멤버로 미리 넣어둘 수 있습니다 (🔴 표시).</p>
        {slots}
        {grid}
        {actionsRow('대기 코트에 추가')}
      </>
    );
  }

  return (
    <>
      <h3>✏️ 추천 조합 수정 - {rec.court}번 코트</h3>
      {slots}
      {grid}
      {actionsRow('저장')}
    </>
  );
}
