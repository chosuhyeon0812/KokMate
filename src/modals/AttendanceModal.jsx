import { useState } from 'react';
import { useAppState } from '../store';
import { useUI } from '../ui';
import * as actions from '../actions';
import { sortByName, genderLabel } from '../lib/utils';
import { EmptyHint } from '../components/cards';

export default function AttendanceModal() {
  const state = useAppState();
  const { toast, closeModal } = useUI();
  const rows = sortByName(state.players);
  const [checked, setChecked] = useState(() => new Set(state.players.filter(p => p.active).map(p => p.id)));

  const toggle = id => {
    const next = new Set(checked);
    if (next.has(id)) next.delete(id); else next.add(id);
    setChecked(next);
  };

  const save = () => {
    actions.saveAttendance(checked);
    closeModal();
    toast(`오늘 참석자 ${checked.size}명으로 설정했습니다.`);
  };

  return (
    <>
      <h3>👋 오늘 참석자 선택</h3>
      <p className="muted" style={{ marginTop: -6, fontSize: '.82rem' }}>체크한 사람만 오늘 매칭 대상(당일 참여)이 됩니다. 하나씩 누를 필요 없이 여기서 한 번에 정하세요.</p>
      <div className="row-actions" style={{ marginBottom: 10 }}>
        <button className="btn btn-outline btn-sm" onClick={() => setChecked(new Set(state.players.map(p => p.id)))}>전체 선택</button>
        <button className="btn btn-outline btn-sm" onClick={() => setChecked(new Set())}>전체 해제</button>
      </div>
      <div className="checklist">
        {rows.length === 0 ? <EmptyHint>등록된 참가자가 없습니다. 먼저 "참가자" 탭에서 회원을 등록하세요.</EmptyHint> : rows.map(p => (
          <label className="crow" style={{ cursor: 'pointer' }} key={p.id}>
            <span><input type="checkbox" checked={checked.has(p.id)} onChange={() => toggle(p.id)} /> {p.name} <span className="muted">({genderLabel(p.gender)}/{p.level})</span></span>
          </label>
        ))}
      </div>
      <div className="modal-actions">
        <button className="btn btn-ghost" onClick={closeModal}>취소</button>
        <button className="btn btn-primary" onClick={save}>참석자 저장</button>
      </div>
    </>
  );
}
