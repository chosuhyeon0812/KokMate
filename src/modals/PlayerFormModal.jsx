import { useState } from 'react';
import { useUI } from '../ui';
import * as actions from '../actions';
import { LEVEL_OPTIONS } from '../lib/utils';

export default function PlayerFormModal({ player }) {
  const { toast, warn, closeModal } = useUI();
  const [name, setName] = useState(player ? player.name : '');
  const [gender, setGender] = useState(player ? player.gender : 'M');
  const [level, setLevel] = useState(player ? player.level : 'A');
  const [memo, setMemo] = useState(player && player.memo ? player.memo : '');

  const save = () => {
    if (!name.trim()) { warn('이름을 입력하세요.'); return; }
    actions.savePlayer(player ? player.id : null, { name: name.trim(), gender, level, memo: memo.trim() });
    closeModal();
    toast('저장되었습니다.');
  };

  return (
    <>
      <h3>{player ? '참가자 수정' : '참가자 추가'}</h3>
      <div className="form-grid">
        <label>이름 <input type="text" autoFocus value={name} onChange={e => setName(e.target.value)} placeholder="이름 입력" /></label>
        <label>성별
          <select value={gender} onChange={e => setGender(e.target.value)}>
            <option value="M">남성</option>
            <option value="F">여성</option>
          </select>
        </label>
        <label>등급
          <select value={level} onChange={e => setLevel(e.target.value)}>
            {LEVEL_OPTIONS.map(l => <option key={l} value={l}>{l}</option>)}
          </select>
        </label>
        <label>특이사항 <input type="text" value={memo} onChange={e => setMemo(e.target.value)} placeholder="예: 발목 부상 (선택)" /></label>
      </div>
      <div className="modal-actions">
        <button className="btn btn-ghost" onClick={closeModal}>취소</button>
        <button className="btn btn-primary" onClick={save}>{player ? '저장' : '추가'}</button>
      </div>
    </>
  );
}
