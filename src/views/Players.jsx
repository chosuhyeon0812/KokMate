import { useState } from 'react';
import { useAppState } from '../store';
import { useUI } from '../ui';
import { sortByName, LEVEL_OPTIONS, ROLE_OPTIONS, roleOf, roleLabel, todayStr } from '../lib/utils';
import { EmptyHint } from '../components/cards';
import PlayerFormModal from '../modals/PlayerFormModal';
import { cumulativeRows, agoLabel, LONG_ABSENT_DAYS } from '../lib/cumulative';

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
  // 최근 참석: 누적 기록과 같은 계산 (지난 모임 기록에서 가장 최근 날)
  const lastSeen = new Map(cumulativeRows(state, 'all', todayStr()).rows.map(r => [r.key, r.days]));

  const filterSelect = (key, label, options) => (
    <div className={filter[key] ? 'field picked' : 'field'}>
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
        <h2 className="mb0">회원 ({filterActive ? `${filtered.length}/${state.players.length}` : state.players.length}명)</h2>
        <div className="row-actions">
          {/* 이름 검색: '+ 추가' 옆 같은 높이의 작은 둥근 칸 */}
          {state.players.length > 0 && (
            <label className="search-pill">
              <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" aria-hidden="true"><circle cx="11" cy="11" r="6.5" /><path d="M16 16l4 4" /></svg>
              <input type="search" aria-label="이름 검색" value={filter.q} onChange={e => setFilter({ ...filter, q: e.target.value })} />
            </label>
          )}
          <button type="button" className="add-pill" aria-label="회원 추가" onClick={() => openModal(<PlayerFormModal />)}>
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" aria-hidden="true"><path d="M12 5v14M5 12h14" /></svg>
            추가
          </button>
        </div>
      </div>
      {state.players.length > 0 && (
        <div className="settings-grid member-filters" style={{ marginBottom: 14 }}>
          {filterSelect('gender', '성별', [['M', '남성'], ['F', '여성']])}
          {filterSelect('level', '급수', LEVEL_OPTIONS.map(l => [l, l]))}
          {filterSelect('role', '역할', ROLE_OPTIONS)}
          {filterActive && <button className="btn btn-ghost btn-sm" onClick={() => setFilter(EMPTY_FILTER)}>{q ? '검색·필터 초기화' : '필터 초기화'}</button>}
        </div>
      )}
      {state.players.length === 0 ? <EmptyHint>아직 등록된 회원이 없어요. 오른쪽 위 "추가"로 시작하세요.</EmptyHint> :
        filtered.length === 0 ? <EmptyHint>{q ? `"${q}"(이)가 들어간 회원이 없어요.` : '조건에 맞는 회원이 없어요.'}</EmptyHint> : (
          // 표로 한 줄에 한 명. 남녀는 셔틀콕·순위표처럼 이름 앞 점으로. 누르면 수정 창.
          // 최근 참석이 오래됐거나 기록이 없으면 누적 기록처럼 빨간색.
          <div style={{ overflowX: 'auto' }}>
            <table className="member-table">
              <thead><tr><th>이름</th><th>역할</th><th>급수</th><th>최근 참석</th></tr></thead>
              <tbody>
                {filtered.map(p => { const days = lastSeen.get(p.id); return (
                  <tr key={p.id} className="clickable-row" onClick={() => openModal(<PlayerFormModal playerId={p.id} />)}>
                    <td><span className={`gender-dot ${p.gender === 'M' ? 'male' : 'female'}`} />{p.name}</td>
                    <td>{roleOf(p) !== 'member' && <span className={`role-text ${roleOf(p)}`}>{roleLabel(roleOf(p))}</span>}</td>
                    <td className="member-level">{p.level}</td>
                    <td className={days == null || days >= LONG_ABSENT_DAYS ? 'absent-long' : ''}>{agoLabel(days)}</td>
                  </tr>
                ); })}
              </tbody>
            </table>
          </div>
        )}
    </div>
  );
}
