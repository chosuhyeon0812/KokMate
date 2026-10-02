import { useState } from 'react';
import { useAppState } from '../store';
import { useUI } from '../ui';
import * as actions from '../actions';
import { playerName } from '../lib/selectors';
import { TeamLine } from '../components/cards';

export default function EndGameModal({ gameId }) {
  const state = useAppState();
  const { toast, warn, closeModal } = useUI();
  const [rawA, setRawA] = useState('');
  const [rawB, setRawB] = useState('');
  const [memo, setMemo] = useState('');
  const g = state.games.find(x => x.id === gameId);
  if (!g) return null;

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

    actions.endGame(gameId, { scoreA, scoreB, winner, memo: memo.trim() });
    closeModal();
    toast('경기 결과가 저장되었습니다.');
  };

  return (
    <>
      <h3>🏁 경기 종료 - {g.court}번 코트</h3>
      <TeamLine teamA={g.teamA} teamB={g.teamB} label={id => playerName(state, id)} style={{ marginBottom: 10 }} />
      <div className="form-grid">
        <label>팀 A 점수 (선택) <input type="number" min="0" placeholder="입력 안 해도 저장 가능" value={rawA} onChange={e => setRawA(e.target.value)} /></label>
        <label>팀 B 점수 (선택) <input type="number" min="0" placeholder="입력 안 해도 저장 가능" value={rawB} onChange={e => setRawB(e.target.value)} /></label>
        <label>특이사항(선택) <input type="text" placeholder="예: 민수 발목 통증" value={memo} onChange={e => setMemo(e.target.value)} /></label>
      </div>
      <div className="modal-actions">
        <button className="btn btn-ghost" onClick={closeModal}>취소</button>
        <button className="btn btn-primary" onClick={submit}>경기 종료 저장</button>
      </div>
    </>
  );
}
