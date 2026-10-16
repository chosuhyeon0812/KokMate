import { useState } from 'react';
import { useAppState } from '../store';
import { useUI } from '../ui';
import * as actions from '../actions';
import { sortByName, genderLabel } from '../lib/utils';
import { EmptyHint } from '../components/cards';

export default function AttendanceModal() {
  const state = useAppState();
  const { toast, closeModal } = useUI();
  const [checked, setChecked] = useState(() => new Set(state.players.filter(p => p.active).map(p => p.id)));
  const [query, setQuery] = useState('');
  // 회원이 많으니 이름 일부로 찾을 수 있게 한다. 전체 선택/해제는 지금 보이는 사람에게만 적용된다.
  const rows = sortByName(state.players).filter(p => p.name.includes(query.trim()));

  const toggle = id => {
    const next = new Set(checked);
    if (next.has(id)) next.delete(id); else next.add(id);
    setChecked(next);
  };

  const setVisible = on => {
    const next = new Set(checked);
    rows.forEach(p => (on ? next.add(p.id) : next.delete(p.id)));
    setChecked(next);
  };

  const save = () => {
    actions.saveAttendance(checked);
    closeModal();
    toast(`오늘 참석자 ${checked.size}명으로 설정했습니다.`);
  };

  return (
    <>
      <h3>오늘 참석자 선택 <span className="muted" style={{ fontSize: '.85rem', fontWeight: 700 }}>{checked.size}명 선택</span></h3>
      <p className="muted" style={{ marginTop: -6, fontSize: '.82rem' }}>오늘 온 사람을 눌러 선택하세요. 선택한 사람만 오늘 경기에 들어가요.</p>
      {state.players.length === 0 ? <EmptyHint>등록된 참가자가 없습니다. 먼저 "참가자" 탭에서 회원을 등록하세요.</EmptyHint> : (
        <>
          <div className="attend-tools">
            <input type="search" className="attend-search" placeholder="이름 검색" value={query} onChange={e => setQuery(e.target.value)} />
            <button className="btn btn-outline btn-sm" onClick={() => setVisible(true)}>{query.trim() ? '보이는 사람 선택' : '전체 선택'}</button>
            <button className="btn btn-outline btn-sm" onClick={() => setVisible(false)}>{query.trim() ? '보이는 사람 해제' : '전체 해제'}</button>
          </div>
          {rows.length === 0 ? <EmptyHint>"{query.trim()}"(이)가 들어간 이름이 없어요.</EmptyHint> : (
            <div className="player-grid attend-grid">
              {rows.map(p => {
                const on = checked.has(p.id);
                return (
                  <button key={p.id} type="button" aria-pressed={on} className={`player-tile${on ? ' selected' : ''}`} onClick={() => toggle(p.id)}>
                    {on && <span className="attend-check">✓</span>}
                    <span className="tile-name">{p.name}</span>
                    <span className="tile-meta">{genderLabel(p.gender)} · {p.level}</span>
                  </button>
                );
              })}
            </div>
          )}
        </>
      )}
      <div className="modal-actions">
        <button className="btn btn-ghost" onClick={closeModal}>취소</button>
        <button className="btn btn-primary" onClick={save}>{checked.size}명 저장</button>
      </div>
    </>
  );
}
