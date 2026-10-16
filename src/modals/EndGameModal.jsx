/* 경기 종료(점수 입력) 모달. edit 이면 이미 끝난 경기의 결과를 수정한다. */
import { useState } from 'react';
import { useAppState, getState } from '../store';
import { useUI } from '../ui';
import * as actions from '../actions';
import { playerName, playingPlayerIds, activeGameOnCourt, nextReadyWaiting } from '../lib/selectors';
import StartWaitingModal from './StartWaitingModal';
import { TeamLine } from '../components/cards';

export default function EndGameModal({ gameId, edit }) {
  const state = useAppState();
  const { toast, warn, openModal, closeModal } = useUI();
  const g = state.games.find(x => x.id === gameId);
  const [rawA, setRawA] = useState(edit && g?.scoreA != null ? String(g.scoreA) : '');
  const [rawB, setRawB] = useState(edit && g?.scoreB != null ? String(g.scoreB) : '');
  const [memo, setMemo] = useState(edit && g ? g.memo || '' : '');
  const [winner, setWinner] = useState(edit && g ? g.winner : null);
  if (!g) return null;

  // 점수를 직접 입력하면 승리 팀 버튼도 그 점수에 맞춰 따라간다.
  const changeScore = (side, v) => {
    const a = side === 'A' ? v : rawA, b = side === 'B' ? v : rawB;
    (side === 'A' ? setRawA : setRawB)(v);
    if (a.trim() !== '' && b.trim() !== '' && Number(a) !== Number(b)) setWinner(Number(a) > Number(b) ? 'A' : 'B');
  };

  // 승리 팀을 다시 누르면 선택 해제, 다른 팀으로 바꾸면 입력된 점수도 뒤집어 준다.
  const pickWinner = side => {
    if (winner === side) { setWinner(null); setRawA(''); setRawB(''); return; }
    if (winner && rawA !== '' && rawB !== '') { setRawA(rawB); setRawB(rawA); }
    setWinner(side);
  };

  const pickScore = (win, lose) => {
    setRawA(String(winner === 'A' ? win : lose));
    setRawB(String(winner === 'A' ? lose : win));
  };

  const undo = () => {
    // 되돌리는 사이에 같은 코트나 같은 선수로 새 경기가 시작됐다면 되돌릴 수 없다.
    const now = getState();
    const game = now.games.find(x => x.id === gameId);
    if (!game || game.status !== 'done') return;
    if (activeGameOnCourt(now, game.court)) { warn(`${game.court}번 코트에서 이미 다른 경기가 진행 중이라 되돌릴 수 없어요.`); return; }
    const playing = playingPlayerIds(now);
    const busy = game.teamA.concat(game.teamB).filter(id => playing.has(id));
    if (busy.length) { warn(`다른 경기에 들어간 선수가 있어 되돌릴 수 없어요: ${busy.map(id => playerName(now, id)).join(', ')}`); return; }
    actions.undoEndGame(gameId);
    toast(`${game.court}번 코트 경기를 진행 중으로 되돌렸습니다.`);
  };

  const submit = () => {
    const a = rawA.trim(), b = rawB.trim();
    if ((a === '') !== (b === '')) { warn('점수는 두 팀 모두 입력하거나, 둘 다 비워두세요.'); return; }

    // 점수가 있으면 점수로 승패를 정하고, 점수 없이 승리 팀만 골랐으면 승패만 기록한다.
    let scoreA = null, scoreB = null, win = winner;
    if (a !== '') {
      scoreA = Number(a); scoreB = Number(b);
      if (isNaN(scoreA) || isNaN(scoreB)) { warn('점수를 올바르게 입력하세요.'); return; }
      if (scoreA === scoreB) { warn('무승부는 입력할 수 없습니다.'); return; }
      win = scoreA > scoreB ? 'A' : 'B';
    }

    const result = { scoreA, scoreB, winner: win, memo: memo.trim() };
    closeModal();
    if (edit) {
      actions.editGameResult(gameId, result);
      toast('경기 결과를 수정했습니다.');
    } else {
      actions.endGame(gameId, result);
      // 코트가 비었으니 바로 시작할 수 있는 대기 코트가 있으면 이어서 물어본다.
      if (nextReadyWaiting(getState())) openModal(<StartWaitingModal court={g.court} />);
      toast('경기 결과가 저장되었습니다.', { action: { label: '되돌리기', onClick: undo } });
    }
  };

  return (
    <>
      <h3>{edit ? '경기 결과 수정' : '경기 종료'} · {g.court}번 코트</h3>
      <div className="field-label">이긴 팀 (선택)</div>
      <div className="winner-pick">
        {['A', 'B'].map(side => (
          <button key={side} type="button" className={`winner-btn${winner === side ? ' on' : ''}`} onClick={() => pickWinner(side)}>
            <span className="winner-tag">{winner === side ? '🏆 승리' : `팀 ${side}`}</span>
            <span className="winner-names">{(side === 'A' ? g.teamA : g.teamB).map(id => playerName(state, id)).join(' + ')}</span>
          </button>
        ))}
      </div>
      {winner && (
        <>
          <div className="field-label">점수 바로 입력 (선택)</div>
          <div className="score-chips">
            {[[21, 10], [21, 11], [21, 12], [21, 13], [21, 14], [21, 15], [21, 16], [21, 17], [21, 18], [21, 19], [22, 20]].map(([w, l]) => {
              const on = rawA === String(winner === 'A' ? w : l) && rawB === String(winner === 'A' ? l : w);
              return <button key={l} type="button" className={`score-chip${on ? ' on' : ''}`} onClick={() => pickScore(w, l)}>{w}:{l}</button>;
            })}
          </div>
        </>
      )}
      <div className="form-grid score-inputs">
        <label>팀 A 점수 <input type="number" min="0" inputMode="numeric" placeholder="직접 입력" value={rawA} onChange={e => changeScore('A', e.target.value)} /></label>
        <label>팀 B 점수 <input type="number" min="0" inputMode="numeric" placeholder="직접 입력" value={rawB} onChange={e => changeScore('B', e.target.value)} /></label>
        <label>특이사항(선택) <input type="text" placeholder="예: 민수 발목 통증" value={memo} onChange={e => setMemo(e.target.value)} /></label>
      </div>
      <div className="modal-actions">
        <button className="btn btn-ghost" onClick={closeModal}>취소</button>
        <button className="btn btn-primary" onClick={submit}>{edit ? '수정 저장' : '경기 종료 저장'}</button>
      </div>
    </>
  );
}
