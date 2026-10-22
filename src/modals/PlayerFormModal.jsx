/* 참가자 추가/수정 모달. 수정일 때는 오늘 상태(참석·휴식)를 바로 바꾸거나 삭제할 수도 있다. */
import { useState } from 'react';
import { useAppState } from '../store';
import { useUI } from '../ui';
import * as actions from '../actions';
import { LEVEL_OPTIONS, ROLE_OPTIONS, roleOf } from '../lib/utils';
import { playerById, playingPlayerIds, waitingPlayerIds } from '../lib/selectors';

export default function PlayerFormModal({ playerId }) {
  const state = useAppState();
  const { toast, warn, closeModal, ask } = useUI();
  const player = playerId ? playerById(state, playerId) : null;
  const [name, setName] = useState(player ? player.name : '');
  const [gender, setGender] = useState(player ? player.gender : 'M');
  const [level, setLevel] = useState(player ? player.level : 'A');
  const [memo, setMemo] = useState(player && player.memo ? player.memo : '');
  const [role, setRole] = useState(player ? roleOf(player) : 'member');
  // 같은 이름(띄어쓰기 무시)인 다른 회원. 동명이인일 수도 있어서 막지는 않고 알려만 준다.
  const sameName = state.players.find(p => p.id !== playerId && name.trim() && p.name.replace(/\s/g, '') === name.replace(/\s/g, ''));
  if (playerId && !player) return null;

  const save = () => {
    if (!name.trim()) { warn('이름을 입력하세요.'); return; }
    actions.savePlayer(player ? player.id : null, { name: name.trim(), gender, level, role, memo: memo.trim() });
    closeModal();
    toast('저장되었습니다.');
  };

  const remove = async () => {
    if (playingPlayerIds(state).has(player.id)) { warn('지금 경기 중인 선수는 삭제할 수 없습니다. 경기 종료 후 삭제하세요.'); return; }
    if (waitingPlayerIds(state).has(player.id)) { warn('대기 코트에 들어가 있는 선수는 삭제할 수 없습니다. 대기 코트에서 먼저 빼주세요.'); return; }
    if (!(await ask('지난 경기 기록에 나온 이름은 그대로 남아요.', { title: `${player.name} 님을 삭제할까요?`, ok: '삭제', danger: true }))) return;
    actions.deletePlayer(player.id);
    closeModal();
    toast('삭제했습니다.');
  };

  return (
    <>
      <h3>{player ? '참가자 수정' : '참가자 추가'}</h3>
      {player && (
        <div className="today-status">
          <span className="field-label">오늘 상태 (누르면 바로 바뀌어요)</span>
          <div className="pill-toggle">
            <button className={player.active ? 'on' : ''} onClick={() => !player.active && actions.toggleActive(player.id)}>참석</button>
            <button className={!player.active ? 'on' : ''} onClick={() => player.active && actions.toggleActive(player.id)}>불참</button>
          </div>
          {player.active && (
            <div className="pill-toggle">
              <button className={!player.resting ? 'on' : ''} onClick={() => player.resting && actions.toggleRest(player.id)}>경기 가능</button>
              <button className={player.resting ? 'on' : ''} onClick={() => !player.resting && actions.toggleRest(player.id)}>휴식</button>
            </div>
          )}
        </div>
      )}
      <div className="form-grid">
        <label>이름 <input type="text" autoFocus={!player} value={name} onChange={e => setName(e.target.value)} placeholder="이름 입력" />
          {sameName && <span className="field-warn">⚠ {sameName.name} 님이 이미 있어요 ({sameName.gender === 'M' ? '남성' : '여성'} / {sameName.level})</span>}
        </label>
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
        <label>역할
          <select value={role} onChange={e => setRole(e.target.value)}>
            {ROLE_OPTIONS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
          </select>
          {role === 'guest' && <span className="field-note">모임 종료 시 명단에서 빠져요 (기록은 남음). 자주 오면 일반 회원으로!</span>}
        </label>
        <label>특이사항 <input type="text" value={memo} onChange={e => setMemo(e.target.value)} placeholder="예: 발목 부상 (선택)" /></label>
      </div>
      <div className="modal-actions">
        {player && <button className="btn btn-danger" style={{ marginRight: 'auto' }} onClick={remove}>삭제</button>}
        <button className="btn btn-ghost" onClick={closeModal}>취소</button>
        <button className="btn btn-primary" onClick={save}>{player ? '저장' : '추가'}</button>
      </div>
    </>
  );
}
