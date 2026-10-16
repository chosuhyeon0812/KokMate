/* 팀 공유 카드: 팀 만들기 / 팀 코드로 참여 / 참여 중인 팀 상태와 코드 보내기 */
import { useState } from 'react';
import { useUI } from '../ui';
import { useAppState } from '../store';
import { timeStr } from '../lib/utils';
import { useSync, createTeam, previewTeam, joinTeam, leaveTeam, syncNow, cleanCode, formatCode } from '../lib/sync';

function StatusLine({ status }) {
  if (status.phase === 'saving') return <span className="sync-status saving">올리는 중…</span>;
  if (status.phase === 'offline') return <span className="sync-status offline">인터넷 없음 · 연결되면 자동으로 올라가요</span>;
  if (status.phase === 'error') return <span className="sync-status error">연결 문제 · 잠시 뒤 다시 시도해요</span>;
  return <span className="sync-status ok">팀과 맞춰짐{status.lastSyncedAt ? ` · ${timeStr(status.lastSyncedAt)}` : ''}</span>;
}

function JoinedTeam({ team, status }) {
  const { toast, warn } = useUI();
  const shown = formatCode(team.code);
  const message = `배드민턴 매칭 "${team.name}" 팀 코드: ${shown}\n앱의 기록 > 공유·백업 > "팀 코드로 참여"에 입력하세요.`;

  const share = async () => {
    if (navigator.share) {
      try { await navigator.share({ text: message }); } catch (e) { /* 취소 */ }
      return;
    }
    try {
      await navigator.clipboard.writeText(message);
      toast('팀 코드를 복사했어요. 카톡에 붙여넣어 보내세요.');
    } catch (e) {
      warn('복사하지 못했어요. 코드를 직접 적어서 보내주세요.');
    }
  };

  const leave = () => {
    if (!confirm(`"${team.name}" 팀 공유를 멈출까요? 이 기기의 데이터는 그대로 남고, 팀 코드로 언제든 다시 참여할 수 있어요.`)) return;
    leaveTeam();
    toast('팀 공유를 멈췄어요.');
  };

  return (
    <>
      <div className="team-name-row">
        <span className="team-title">{team.name}</span>
        <StatusLine status={status} />
      </div>
      <div className="team-code-box">
        <span className="muted">팀 코드</span>
        <strong className="team-code">{shown}</strong>
      </div>
      {status.message && <div className="sync-message">{status.message}</div>}
      <p className="muted backup-desc">이 코드를 아는 사람은 팀 데이터를 보고 바꿀 수 있어요. 팀원에게만 보내주세요.</p>
      <div className="row-actions">
        <button className="btn btn-primary" onClick={share}>팀 코드 보내기</button>
        <button className="btn btn-outline" onClick={syncNow}>지금 맞추기</button>
        <button className="btn btn-ghost" onClick={leave}>공유 멈추기</button>
      </div>
    </>
  );
}

function NoTeam() {
  const state = useAppState();
  const { toast, warn } = useUI();
  const [mode, setMode] = useState(null); // 'create' | 'join'
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [preview, setPreview] = useState(null); // {code, row}

  const create = async () => {
    if (!name.trim()) { warn('팀 이름을 입력하세요.'); return; }
    setBusy(true);
    try {
      await createTeam(name.trim());
      toast('팀을 만들었어요. 팀 코드를 팀원에게 보내주세요.');
    } catch (e) {
      warn('팀을 만들지 못했어요. 인터넷 연결을 확인해 주세요.');
    } finally {
      setBusy(false);
    }
  };

  const check = async () => {
    const c = cleanCode(code);
    if (c.length < 10) { warn('팀 코드 12자리를 입력하세요.'); return; }
    setBusy(true);
    try {
      const row = await previewTeam(c);
      if (!row) warn('그 코드의 팀이 없어요. 코드를 다시 확인해 주세요.');
      else setPreview({ code: c, row });
    } catch (e) {
      warn('팀을 확인하지 못했어요. 인터넷 연결을 확인해 주세요.');
    } finally {
      setBusy(false);
    }
  };

  const join = () => {
    joinTeam(preview.code, preview.row);
    toast(`"${preview.row.name}" 팀에 참여했어요.`);
  };

  if (preview) {
    const s = preview.row.state;
    return (
      <div className="backup-confirm">
        <div className="backup-confirm-title">"{preview.row.name}" 팀에 참여할까요?</div>
        <div>회원 {s.players.length}명 · 오늘 경기 {s.games.length}개 · 지난 모임 {(s.sessionHistory || []).length}개</div>
        <div>참여하면 이 기기의 데이터는 <b>팀 데이터로 바뀌어요.</b> (지금 이 기기: 회원 {state.players.length}명 · 경기 {state.games.length}개)</div>
        <div className="row-actions" style={{ marginTop: 10 }}>
          <button className="btn btn-ghost" onClick={() => setPreview(null)}>취소</button>
          <button className="btn btn-danger" onClick={join}>참여하기</button>
        </div>
      </div>
    );
  }

  return (
    <>
      <p className="muted backup-desc">팀을 만들면 이 기기의 데이터가 팀 데이터가 되고, 팀 코드로 참여한 기기끼리 경기·회원·콕 기록이 자동으로 맞춰져요. 인터넷이 없을 때 바꾼 내용은 연결되면 올라가요.</p>
      {mode === 'create' ? (
        <div className="team-form">
          <input type="text" placeholder="팀 이름 (예: 신도림 배드민턴)" value={name} onChange={e => setName(e.target.value)} autoFocus />
          <div className="row-actions">
            <button className="btn btn-ghost" onClick={() => setMode(null)}>취소</button>
            <button className="btn btn-primary" disabled={busy} onClick={create}>{busy ? '만드는 중…' : '이 기기 데이터로 팀 만들기'}</button>
          </div>
        </div>
      ) : mode === 'join' ? (
        <div className="team-form">
          <input type="text" placeholder="팀 코드 (예: ABCD-EFGH-JKLM)" value={code} onChange={e => setCode(e.target.value)} autoFocus autoCapitalize="characters" />
          <div className="row-actions">
            <button className="btn btn-ghost" onClick={() => setMode(null)}>취소</button>
            <button className="btn btn-primary" disabled={busy} onClick={check}>{busy ? '확인 중…' : '팀 확인'}</button>
          </div>
        </div>
      ) : (
        <div className="row-actions">
          <button className="btn btn-primary" onClick={() => setMode('create')}>팀 만들기</button>
          <button className="btn btn-outline" onClick={() => setMode('join')}>팀 코드로 참여</button>
        </div>
      )}
    </>
  );
}

export default function TeamCard() {
  const { team, status } = useSync();
  return (
    <div className="card">
      <h2>팀 공유</h2>
      {team ? <JoinedTeam team={team} status={status} /> : <NoTeam />}
    </div>
  );
}
