import { useState } from 'react';
import { useAppState } from '../store';
import { useUI } from '../ui';
import * as actions from '../actions';
import { activeGameOnCourt, availablePlayers, playingPlayerIds, waitingPlayerIds, fairnessCompare, waitLabel, LONG_REST_MS } from '../lib/selectors';
import { MAX_WAITING } from '../lib/utils';
import { LiveCourtCard, WaitingCard, EmptyHint, GuestTag } from '../components/cards';
import RestManagerModal from '../modals/RestManagerModal';
import PlayerPicker from '../modals/PlayerPicker';

export default function Courts() {
  const state = useAppState();
  const { openModal, warn } = useUI();
  const courts = state.settings.courts;

  return (
    <>
      <div className="card">
        <div className="section-row">
          <h2 className="mb0">코트 현황</h2>
        </div>
        <div className="court-grid">
          {courts.map(c => {
            const g = activeGameOnCourt(state, c);
            if (g) return <LiveCourtCard key={c} game={g} />;
            return (
              <div className="court-card empty" key={c}>
                <div className="court-title"><span>{c}번 코트</span><button type="button" className="court-remove" aria-label={`${c}번 코트 빼기`} title="코트 빼기" onClick={() => actions.removeCourt(c)}>✕</button></div>
                <button className="btn btn-primary btn-sm btn-block" style={{ marginTop: 10 }} onClick={() => openModal(<PlayerPicker mode="manual" presetCourt={c} />, { wide: true })}>경기 만들기</button>
              </div>
            );
          })}
          <AddCourtTile courts={courts} warn={warn} />
        </div>
      </div>
      <div className="card">
        <div className="section-row">
          <h2 className="mb0">대기 코트 <span className="muted" style={{ fontSize: '.8rem', fontWeight: 600 }}>{state.waitingMatches.length}/{MAX_WAITING}</span></h2>
          <button className="btn btn-outline btn-sm" disabled={state.waitingMatches.length >= MAX_WAITING} onClick={() => openModal(<PlayerPicker mode="waiting" />, { wide: true })}>대기 코트 추가</button>
        </div>
        {state.waitingMatches.length === 0 ? <EmptyHint>코트가 다 찼을 때 다음 경기 멤버를 미리 정해둘 수 있어요.</EmptyHint> : (
          <div className="court-grid">{state.waitingMatches.map((w, i) => <WaitingCard key={w.id} match={w} no={i + 1} />)}</div>
        )}
      </div>
      <Bench />
    </>
  );
}

// 코트 목록 맨 끝의 점선 '+ 코트' 칸. 누르면 그 자리에서 번호를 적는 칸으로 바뀐다.
// 체육관에서 코트를 여러 개 한꺼번에 받으니까, 추가해도 닫지 않고 다음 번호를 바로 적게 한다. (✕로 닫기)
// 체육관에서 배정받은 코트 번호를 그대로 등록한다. (1번부터 순서대로 쓰는 게 아니라서)
function AddCourtTile({ courts, warn }) {
  const [open, setOpen] = useState(false);
  const [value, setValue] = useState('');
  const close = () => { setOpen(false); setValue(''); };

  const submit = e => {
    e.preventDefault();
    const n = Number(value);
    if (!value.trim() || !Number.isInteger(n) || n < 1 || n > 99) { warn('코트 번호를 숫자로 적어 주세요. (1~99)'); return; }
    if (courts.includes(n)) { warn(`${n}번 코트는 이미 등록되어 있어요.`); return; }
    actions.addCourt(n);
    setValue('');
  };

  if (!open) {
    return (
      <button type="button" className="court-card court-add-tile" onClick={() => setOpen(true)}>
        <span className="court-add-plus" aria-hidden="true">+</span>
        <span>코트 추가</span>
      </button>
    );
  }
  return (
    <form className="court-card court-add-tile open" onSubmit={submit} onKeyDown={e => { if (e.key === 'Escape') close(); }}>
      <div className="court-title"><span>코트 추가</span><button type="button" className="court-remove" onClick={close} aria-label="닫기">✕</button></div>
      <div className="court-add">
        <input type="number" min="1" max="99" inputMode="numeric" placeholder="번호" aria-label="코트 번호" autoFocus value={value} onChange={e => setValue(e.target.value)} />
        <span>번</span>
        <button className="btn btn-primary btn-sm" type="submit">추가</button>
      </div>
    </form>
  );
}

// 지금 코트에도 대기 코트에도 없는 사람들. 다음에 넣을 사람을 고르기 쉽게 경기 수가 적고 오래 쉰 순서로 보여준다.
function Bench() {
  const state = useAppState();
  const { toast, openModal } = useUI();
  const attending = state.players.filter(p => p.active);
  const bench = availablePlayers(state).sort(fairnessCompare);
  const playing = playingPlayerIds(state).size;
  const waiting = waitingPlayerIds(state).size;
  const restingPlayers = attending.filter(p => p.resting);
  const resting = restingPlayers.length;

  return (
    <div className="card">
      <div className="section-row">
        <h2 className="mb0">쉬는 사람 <span className="muted" style={{ fontSize: '.8rem', fontWeight: 600 }}>{bench.length}명 · 다음 차례 순</span></h2>
        <button className="btn btn-outline btn-sm" onClick={() => openModal(<RestManagerModal />)}>휴식 관리</button>
      </div>
      {attending.length > 0 && (
        <div className="headcount">참석 {attending.length} · 경기 중 {playing} · 대기 코트 {waiting} · 휴식 {resting}</div>
      )}
      {attending.length === 0 ? <EmptyHint>"오늘 참석자 선택"에서 오늘 온 사람을 먼저 체크하세요.</EmptyHint> :
        bench.length === 0 ? <EmptyHint>지금 쉬는 사람이 없어요.</EmptyHint> : (
          <div className="bench">
            {bench.map(p => {
              const long = p.restSince && Date.now() - p.restSince >= LONG_REST_MS;
              return (
                <div key={p.id} className={`bench-chip ${p.gender === 'M' ? 'male' : 'female'}`}>
                  <span className="bench-games">{p.totalGames}경기</span>
                  <span className="bench-name">{p.name} <span className="bench-level">/ {p.level}</span><GuestTag player={p} /></span>
                  <span className={`bench-wait${long ? ' rest-long' : ''}`}>{waitLabel(p)}</span>
                </div>
              );
            })}
          </div>
        )}
      {/* 오늘 왔지만 '휴식'으로 빼둔 사람. 경기 배정 대상은 아니라서 아래에 흐리게 따로 보여준다. */}
      {resting > 0 && (
        <div className="bench-resting">
          <div className="bench-resting-title">휴식 {resting}명 <span style={{ fontWeight: 500 }}>· 이름을 누르면 복귀</span></div>
          <div className="bench">
            {restingPlayers.map(p => (
              <button type="button" key={p.id} className={`bench-chip resting ${p.gender === 'M' ? 'male' : 'female'}`} title="눌러서 휴식 끝내기"
                onClick={() => { actions.toggleRest(p.id); toast(`${p.name}님 휴식을 끝냈어요.`); }}>
                <span className="bench-games">{p.totalGames}경기</span>
                <span className="bench-name">{p.name} <span className="bench-level">/ {p.level}</span><GuestTag player={p} /></span>
                <span className="bench-wait">휴식</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
