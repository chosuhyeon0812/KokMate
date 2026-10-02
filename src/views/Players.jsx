import { useState } from 'react';
import { useAppState } from '../store';
import { useUI } from '../ui';
import * as actions from '../actions';
import { sortByName, LEVEL_OPTIONS } from '../lib/utils';
import { playerById, playingPlayerIds, waitingPlayerIds } from '../lib/selectors';
import { StatusBadge, GenderBadge, EmptyHint } from '../components/cards';
import PlayerFormModal from '../modals/PlayerFormModal';

const EMPTY_FILTER = { gender: '', level: '', active: '' };
// 탭을 옮겨 다녀도 필터가 유지되도록 컴포넌트 밖에 기억해 둔다.
let savedFilter = EMPTY_FILTER;

export default function Players() {
  const state = useAppState();
  const { warn, openModal } = useUI();
  const [filter, setFilterState] = useState(savedFilter);
  const setFilter = f => { savedFilter = f; setFilterState(f); };

  const filtered = sortByName(state.players).filter(p =>
    (!filter.gender || p.gender === filter.gender) &&
    (!filter.level || p.level === filter.level) &&
    (!filter.active || (filter.active === 'active' ? p.active : !p.active))
  );
  const filterActive = filter.gender || filter.level || filter.active;

  const remove = id => {
    if (playingPlayerIds(state).has(id)) { warn('지금 경기 중인 선수는 삭제할 수 없습니다. 경기 종료 후 삭제하세요.'); return; }
    if (waitingPlayerIds(state).has(id)) { warn('대기 코트에 들어가 있는 선수는 삭제할 수 없습니다. 대기 코트에서 먼저 빼주세요.'); return; }
    if (confirm('참가자를 삭제할까요? 관련 경기 기록의 이름 표시는 유지됩니다.')) actions.deletePlayer(id);
  };

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
        <h2 className="mb0">👥 참가자 관리 ({filterActive ? `${filtered.length}/${state.players.length}` : state.players.length}명)</h2>
        <div className="row-actions">
          <button className="btn btn-primary btn-sm" onClick={() => openModal(<PlayerFormModal />)}>참가자 추가</button>
        </div>
      </div>
      {state.players.length > 0 && (
        <div className="settings-grid" style={{ marginBottom: 14 }}>
          {filterSelect('gender', '성별', [['M', '남성'], ['F', '여성']])}
          {filterSelect('level', '등급', LEVEL_OPTIONS.map(l => [l, l]))}
          {filterSelect('active', '당일 참석', [['active', '참석(포함)'], ['inactive', '제외']])}
          {filterActive && <button className="btn btn-ghost btn-sm" onClick={() => setFilter(EMPTY_FILTER)}>필터 초기화</button>}
        </div>
      )}
      {state.players.length === 0 ? <EmptyHint>등록된 참가자가 없습니다. ‘참가자 추가’로 시작하세요.</EmptyHint> :
        filtered.length === 0 ? <EmptyHint>조건에 맞는 참가자가 없습니다.</EmptyHint> : (
          <div style={{ overflowX: 'auto' }}>
            <table>
              <thead><tr><th>이름</th><th>성별</th><th>등급</th><th>경기수</th><th>상태</th><th>관리</th></tr></thead>
              <tbody>
                {filtered.map(p => (
                  <tr key={p.id}>
                    <td>{p.name}</td>
                    <td><GenderBadge gender={p.gender} /></td>
                    <td><span className="badge badge-level">{p.level}</span></td>
                    <td>{p.totalGames}</td>
                    <td><StatusBadge player={p} /></td>
                    <td className="row-actions">
                      <button className="btn btn-outline btn-sm" onClick={() => openModal(<PlayerFormModal player={playerById(state, p.id)} />)}>수정</button>
                      <button className={`btn ${p.resting ? 'btn-primary' : 'btn-ghost'} btn-sm`} onClick={() => actions.toggleRest(p.id)}>{p.resting ? '휴식 해제' : '휴식'}</button>
                      <button className={`btn ${p.active ? 'btn-ghost' : 'btn-primary'} btn-sm`} onClick={() => actions.toggleActive(p.id)}>{p.active ? '당일 제외' : '당일 포함'}</button>
                      <button className="btn btn-danger btn-sm" onClick={() => remove(p.id)}>삭제</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
    </div>
  );
}
