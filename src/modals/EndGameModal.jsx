/* 경기 종료(점수 입력) 모달. edit 이면 이미 끝난 경기의 결과를 수정한다. */
import { useState } from 'react';
import { useAppState, getState } from '../store';
import { useUI } from '../ui';
import * as actions from '../actions';
import { playerName, playingPlayerIds, activeGameOnCourt } from '../lib/selectors';
import { TeamLine } from '../components/cards';

export default function EndGameModal({ gameId, edit }) {
  const state = useAppState();
  const { toast, warn, closeModal } = useUI();
  const g = state.games.find(x => x.id === gameId);
  const [rawA, setRawA] = useState(edit && g?.scoreA != null ? String(g.scoreA) : '');
  const [rawB, setRawB] = useState(edit && g?.scoreB != null ? String(g.scoreB) : '');
  const [memo, setMemo] = useState(edit && g ? g.memo || '' : '');
  if (!g) return null;

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

    let scoreA = null, scoreB = null, winner = null;
    if (a !== '') {
      scoreA = Number(a); scoreB = Number(b);
      if (isNaN(scoreA) || isNaN(scoreB)) { warn('점수를 올바르게 입력하세요.'); return; }
      if (scoreA === scoreB) { warn('무승부는 입력할 수 없습니다.'); return; }
      winner = scoreA > scoreB ? 'A' : 'B';
    }

    const result = { scoreA, scoreB, winner, memo: memo.trim() };
    closeModal();
    if (edit) {
      actions.editGameResult(gameId, result);
      toast('경기 결과를 수정했습니다.');
    } else {
      actions.endGame(gameId, result);
      toast('경기 결과가 저장되었습니다.', { action: { label: '되돌리기', onClick: undo } });
    }
  };

  return (
    <>
      <h3>{edit ? '✏️ 경기 결과 수정' : '🏁 경기 종료'} - {g.court}번 코트</h3>
      <TeamLine teamA={g.teamA} teamB={g.teamB} label={id => playerName(state, id)} style={{ marginBottom: 10 }} />
      <div className="form-grid">
        <label>팀 A 점수 (선택) <input type="number" min="0" placeholder="입력 안 해도 저장 가능" value={rawA} onChange={e => setRawA(e.target.value)} /></label>
        <label>팀 B 점수 (선택) <input type="number" min="0" placeholder="입력 안 해도 저장 가능" value={rawB} onChange={e => setRawB(e.target.value)} /></label>
        <label>특이사항(선택) <input type="text" placeholder="예: 민수 발목 통증" value={memo} onChange={e => setMemo(e.target.value)} /></label>
      </div>
      <div className="modal-actions">
        <button className="btn btn-ghost" onClick={closeModal}>취소</button>
        <button className="btn btn-primary" onClick={submit}>{edit ? '수정 저장' : '경기 종료 저장'}</button>
      </div>
    </>
  );
}
