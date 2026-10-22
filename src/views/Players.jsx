import { useState } from 'react';
import { useAppState } from '../store';
import { useUI } from '../ui';
import { sortByName, LEVEL_OPTIONS, ROLE_OPTIONS, roleOf, roleLabel } from '../lib/utils';
import { StatusBadge, GenderBadge, EmptyHint } from '../components/cards';
import PlayerFormModal from '../modals/PlayerFormModal';
import BulkAddModal from '../modals/BulkAddModal';

const EMPTY_FILTER = { gender: '', level: '', role: '', active: '' };
// 탭을 옮겨 다녀도 필터가 유지되도록 컴포넌트 밖에 기억해 둔다.
let savedFilter = EMPTY_FILTER;

export default function Players() {
  const state = useAppState();
  const { openModal } = useUI();
  const [filter, setFilterState] = useState(savedFilter);
  const setFilter = f => { savedFilter = f; setFilterState(f); };

  const filtered = sortByName(state.players).filter(p =>
    (!filter.gender || p.gender === filter.gender) &&
    (!filter.level || p.level === filter.level) &&
    (!filter.role || roleOf(p) === filter.role) &&
    (!filter.active || (filter.active === 'active' ? p.active : !p.active))
  );
  const filterActive = filter.gender || filter.level || filter.role || filter.active;

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
          <button className="btn btn-outline btn-sm" onClick={() => openModal(<BulkAddModal />)}>여러 명 추가</button>
          <button className="btn btn-primary btn-sm" onClick={() => openModal(<PlayerFormModal />)}>참가자 추가</button>
        </div>
      </div>
      {state.players.length > 0 && (
        <div className="settings-grid" style={{ marginBottom: 14 }}>
          {filterSelect('gender', '성별', [['M', '남성'], ['F', '여성']])}
          {filterSelect('level', '급수', LEVEL_OPTIONS.map(l => [l, l]))}
          {filterSelect('role', '역할', ROLE_OPTIONS)}
          {filterSelect('active', '당일 참석', [['active', '참석(포함)'], ['inactive', '제외']])}
          {filterActive && <button className="btn btn-ghost btn-sm" onClick={() => setFilter(EMPTY_FILTER)}>필터 초기화</button>}
        </div>
      )}
      {state.players.length === 0 ? <EmptyHint>등록된 참가자가 없습니다. ‘참가자 추가’로 시작하세요.</EmptyHint> :
        filtered.length === 0 ? <EmptyHint>조건에 맞는 참가자가 없습니다.</EmptyHint> : (
          <div style={{ overflowX: 'auto' }}>
            <table>
              <thead><tr><th>이름</th><th>성별</th><th>급수</th><th>경기수</th><th>상태</th><th></th></tr></thead>
              <tbody>
                {filtered.map(p => (
                  <tr key={p.id} className="clickable-row" onClick={() => openModal(<PlayerFormModal playerId={p.id} />)}>
                    <td>{p.name}{roleOf(p) !== 'member' && <> <span className={`badge badge-role-${roleOf(p)}`}>{roleLabel(roleOf(p))}</span></>}</td>
                    <td><GenderBadge gender={p.gender} /></td>
                    <td><span className="badge badge-level">{p.level}</span></td>
                    <td>{p.totalGames}</td>
                    <td><StatusBadge player={p} /></td>
                    <td className="row-chevron">›</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
    </div>
  );
}
