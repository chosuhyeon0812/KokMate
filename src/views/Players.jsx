import { useState } from 'react';
import { useAppState } from '../store';
import { useUI } from '../ui';
import { sortByName, LEVEL_OPTIONS, ROLE_OPTIONS, roleOf, roleLabel } from '../lib/utils';
import { EmptyHint } from '../components/cards';
import PlayerFormModal from '../modals/PlayerFormModal';

const EMPTY_FILTER = { q: '', gender: '', level: '', role: '' };
// 탭을 옮겨 다녀도 검색어·필터가 유지되도록 컴포넌트 밖에 기억해 둔다.
let savedFilter = EMPTY_FILTER;

export default function Players() {
  const state = useAppState();
  const { openModal } = useUI();
  const [filter, setFilterState] = useState(savedFilter);
  const setFilter = f => { savedFilter = f; setFilterState(f); };

  const q = filter.q.trim();
  const filtered = sortByName(state.players).filter(p =>
    (!q || p.name.includes(q)) &&
    (!filter.gender || p.gender === filter.gender) &&
    (!filter.level || p.level === filter.level) &&
    (!filter.role || roleOf(p) === filter.role)
  );
  const filterActive = q || filter.gender || filter.level || filter.role;

  const filterSelect = (key, label, options) => (
    <div className="field">
      <label>{label}</label>
      <select value={filter[key]} onChange={e => setFilter({ ...filter, [key]: e.target.value })}>
        <option value="">전체</option>
        {options.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
      </select>
    </div>
  );

  return (
    <div className="card">
      <div className="section-row">
        <h2 className="mb0">참가자 ({filterActive ? `${filtered.length}/${state.players.length}` : state.players.length}명)</h2>
        <div className="row-actions">
          {/* 이름 검색: '+ 추가' 옆 같은 높이의 작은 둥근 칸 */}
          {state.players.length > 0 && (
            <label className="search-pill">
              <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" aria-hidden="true"><circle cx="11" cy="11" r="6.5" /><path d="M16 16l4 4" /></svg>
              <input type="search" aria-label="이름 검색" value={filter.q} onChange={e => setFilter({ ...filter, q: e.target.value })} />
            </label>
          )}
          <button type="button" className="add-pill" aria-label="참가자 추가" onClick={() => openModal(<PlayerFormModal />)}>
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" aria-hidden="true"><path d="M12 5v14M5 12h14" /></svg>
            추가
          </button>
        </div>
      </div>
      {state.players.length > 0 && (
        <div className="settings-grid" style={{ marginBottom: 14 }}>
          {filterSelect('gender', '성별', [['M', '남성'], ['F', '여성']])}
          {filterSelect('level', '급수', LEVEL_OPTIONS.map(l => [l, l]))}
          {filterSelect('role', '역할', ROLE_OPTIONS)}
          {filterActive && <button className="btn btn-ghost btn-sm" onClick={() => setFilter(EMPTY_FILTER)}>{q ? '검색·필터 초기화' : '필터 초기화'}</button>}
        </div>
      )}
      {state.players.length === 0 ? <EmptyHint>아직 등록된 참가자가 없어요. 오른쪽 위 ‘추가’로 시작하세요.</EmptyHint> :
        filtered.length === 0 ? <EmptyHint>{q ? `"${q}"(이)가 들어간 참가자가 없어요.` : '조건에 맞는 참가자가 없어요.'}</EmptyHint> : (
          // 한 줄에 한 명: 이름 / 급수, 오른쪽 끝에 역할(일반 회원은 비움). 색은 '대기 중' 칸과 같은 파랑·분홍, 누르면 수정 창.
          <div className="member-list">
            {filtered.map(p => (
              <button type="button" key={p.id} className={`bench-chip ${p.gender === 'M' ? 'male' : 'female'}`} onClick={() => openModal(<PlayerFormModal playerId={p.id} />)}>
                <span className="bench-name">{p.name} <span className="bench-level">/ {p.level}</span></span>
                {roleOf(p) !== 'member' && <span className={`bench-games role-text ${roleOf(p)}`}>{roleLabel(roleOf(p))}</span>}
              </button>
            ))}
          </div>
        )}
    </div>
  );
}
