import { useState } from 'react';
import { useAppState } from '../store';
import { useUI } from '../ui';
import * as actions from '../actions';
import { sortByName, LEVEL_ORDER } from '../lib/utils';
import { EmptyHint, GuestTag } from '../components/cards';

export default function AttendanceModal() {
  const state = useAppState();
  const { toast, closeModal } = useUI();
  const [checked, setChecked] = useState(() => new Set(state.players.filter(p => p.active).map(p => p.id)));
  const [query, setQuery] = useState('');
  const [gender, setGender] = useState('F');
  const [sort, setSort] = useState('name');
  // 여자/남자 탭으로 나눠 보여주고, 이름 일부로도 찾을 수 있게 한다. 전체 선택/해제는 지금 보이는 사람에게만 적용된다.
  const ofGender = g => state.players.filter(p => (p.gender === 'M' ? 'M' : 'F') === g);
  const countChecked = g => ofGender(g).filter(p => checked.has(p.id)).length;
  // 급수순은 같은 급수끼리 ㄱㄴㄷ 순으로 둔다. (sort는 안정 정렬이라 이름순을 먼저 해두면 유지된다)
  const byName = sortByName(ofGender(gender));
  const sorted = sort === 'low' ? byName.sort((a, b) => LEVEL_ORDER[a.level] - LEVEL_ORDER[b.level])
    : sort === 'high' ? byName.sort((a, b) => LEVEL_ORDER[b.level] - LEVEL_ORDER[a.level]) : byName;
  const rows = sorted.filter(p => p.name.includes(query.trim()));
  const tabLabel = gender === 'M' ? '남자' : '여자';

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
    toast(`오늘 참석자 ${checked.size}명으로 정했어요.`);
  };

  return (
    <>
      <h3>오늘 참석자 선택 <span className="muted" style={{ fontSize: '.85rem', fontWeight: 700 }}>{checked.size}명 선택</span></h3>
      <p className="muted" style={{ marginTop: -6, fontSize: '.82rem' }}>오늘 온 사람을 눌러 선택하세요. 선택한 사람만 오늘 경기에 들어가요.</p>
      {state.players.length === 0 ? <EmptyHint>아직 등록된 참가자가 없어요. 먼저 "참가자" 화면에서 회원을 등록해 주세요.</EmptyHint> : (
        <>
          <div className="gender-seg">
            {[['F', '여자'], ['M', '남자']].map(([g, label]) => (
              <button key={g} type="button" className={`${g === 'M' ? 'male' : 'female'}${gender === g ? ' on' : ''}`} onClick={() => setGender(g)}>
                <span className="gender-dot" />{label}
                <span className="gender-count">{countChecked(g)}<small>/{ofGender(g).length}</small></span>
              </button>
            ))}
          </div>
          <input type="search" className="attend-search" placeholder="🔍  이름 검색" value={query} onChange={e => setQuery(e.target.value)} />
          <div className="attend-bar">
            <div className="sort-chips">
              {[['name', 'ㄱㄴㄷ 순'], ['low', '급수 낮은 순'], ['high', '급수 높은 순']].map(([k, label]) => (
                <button key={k} type="button" className={sort === k ? 'on' : ''} onClick={() => setSort(k)}>{label}</button>
              ))}
            </div>
            <div className="attend-bulk">
              <button type="button" onClick={() => setVisible(true)}>{query.trim() ? '보이는 사람 선택' : '전체 선택'}</button>
              <span aria-hidden="true">·</span>
              <button type="button" onClick={() => setVisible(false)}>{query.trim() ? '보이는 사람 해제' : '전체 해제'}</button>
            </div>
          </div>
          {rows.length === 0 ? <EmptyHint>{query.trim() ? `"${query.trim()}"(이)가 들어간 ${tabLabel} 회원이 없어요.` : `등록된 ${tabLabel} 회원이 없어요.`}</EmptyHint> : (
            <div className="player-grid attend-grid">
              {rows.map(p => {
                const on = checked.has(p.id);
                return (
                  <button key={p.id} type="button" aria-pressed={on} className={`player-tile ${p.gender === 'M' ? 'male' : 'female'}${on ? ' selected' : ''}`} onClick={() => toggle(p.id)}>
                    {on && <span className="attend-check">✓</span>}
                    <span className="tile-name">{p.name} <span className="tile-level">/ {p.level}</span><GuestTag player={p} /></span>
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
