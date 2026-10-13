import { useState } from 'react';
import { useAppState } from '../store';
import { useUI } from '../ui';
import * as actions from '../actions';
import { activeGameOnCourt } from '../lib/selectors';
import { MAX_WAITING } from '../lib/utils';
import { LiveCourtCard, WaitingCard, EmptyHint } from '../components/cards';
import RestManagerModal from '../modals/RestManagerModal';
import PlayerPicker from '../modals/PlayerPicker';

export default function Courts() {
  const state = useAppState();
  const { openModal, warn } = useUI();
  const [courtInput, setCourtInput] = useState('');
  const courts = state.settings.courts;

  // 체육관에서 배정받은 코트 번호를 그대로 등록한다. (1번부터 순서대로 쓰는 게 아니라서)
  const addCourt = e => {
    e.preventDefault();
    const n = Number(courtInput);
    if (!Number.isInteger(n) || n < 1 || n > 99) { warn('코트 번호를 숫자로 입력하세요. (1~99)'); return; }
    if (courts.includes(n)) { warn(`${n}번 코트는 이미 등록되어 있어요.`); return; }
    actions.addCourt(n);
    setCourtInput('');
  };

  return (
    <>
      <div className="card">
        <div className="section-row">
          <h2 className="mb0">코트 현황</h2>
          <button className="btn btn-outline btn-sm" onClick={() => openModal(<RestManagerModal />)}>휴식 관리</button>
        </div>
        {courts.length === 0 ? <EmptyHint>오늘 쓰는 코트 번호를 아래에서 등록하세요. (예: 3번, 5번)</EmptyHint> : (
          <div className="court-grid">
            {courts.map(c => {
              const g = activeGameOnCourt(state, c);
              if (g) return <LiveCourtCard key={c} game={g} />;
              return (
                <div className="court-card empty" key={c}>
                  <div className="court-title"><span>{c}번 코트</span><button type="button" className="court-remove" onClick={() => actions.removeCourt(c)}>코트 빼기</button></div>
                  <div className="muted center" style={{ padding: '10px 0' }}>비어 있음</div>
                  <button className="btn btn-primary btn-sm btn-block" onClick={() => openModal(<PlayerPicker mode="manual" presetCourt={c} />, { wide: true })}>이 코트에서 경기 만들기</button>
                </div>
              );
            })}
          </div>
        )}
        <form className="court-add" onSubmit={addCourt}>
          <label htmlFor="court-add">코트 번호</label>
          <input id="court-add" type="number" min="1" max="99" inputMode="numeric" placeholder="예: 3" value={courtInput} onChange={e => setCourtInput(e.target.value)} />
          <button className="btn btn-ghost" type="submit">코트 추가</button>
        </form>
      </div>
      <div className="card">
        <div className="section-row">
          <h2 className="mb0">대기 코트 <span className="muted" style={{ fontSize: '.8rem', fontWeight: 600 }}>{state.waitingMatches.length}/{MAX_WAITING}</span></h2>
          <button className="btn btn-outline btn-sm" disabled={state.waitingMatches.length >= MAX_WAITING} onClick={() => openModal(<PlayerPicker mode="waiting" />, { wide: true })}>대기 코트 추가</button>
        </div>
        {state.waitingMatches.length === 0 ? <EmptyHint>코트가 다 찼을 때 다음 경기 멤버를 미리 정해둘 수 있어요.</EmptyHint> : (
          <div className="court-grid">{state.waitingMatches.map(w => <WaitingCard key={w.id} match={w} />)}</div>
        )}
      </div>
    </>
  );
}
