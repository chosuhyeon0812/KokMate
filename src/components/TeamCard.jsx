/* 팀 공유 카드: 팀 만들기 / 팀 코드로 참여 / 참여 중인 팀 상태와 코드 보내기 */
import { useEffect, useState } from 'react';
import { useUI } from '../ui';
import { useAppState } from '../store';
import { FONT_SIZES, readFontScale, saveFontScale } from '../lib/fontSize';
import { preloadKakao, shareTeamInvite } from '../lib/kakao';
import { useSync, createTeam, previewTeam, joinTeam, leaveTeamAndClear, hasUnsyncedChanges, cleanCode, formatCode, inviteLink, renameTeam, previewName } from '../lib/sync';

// 잘 맞춰지고 있을 때는 아무것도 안 보여주고, 문제가 있을 때만 알린다.
function StatusLine({ status }) {
  if (status.phase === 'offline') return <span className="sync-status offline">인터넷 없음 · 연결되면 자동으로 올라가요</span>;
  if (status.phase === 'error') return <span className="sync-status error">연결 문제 · 잠시 뒤 다시 시도해요</span>;
  return null;
}

function JoinedTeam({ team, status }) {
  const { toast, warn, ask } = useUI();
  const [editing, setEditing] = useState(false);
  const [newName, setNewName] = useState(team.name);
  const shown = formatCode(team.code);
  // 링크를 누르면 코드가 미리 들어가서 '참여하기'만 누르면 된다. 링크가 안 열릴 때를 위해 코드도 같이 적는다.
  const message = `콕메이트 "${team.name}" 팀 초대\n아래 링크를 누르고 "참여하기"를 누르세요.\n${inviteLink(team.code)}\n\n(팀 코드: ${shown})`;

  const share = async () => {
    if (navigator.share) {
      try { await navigator.share({ text: message }); } catch (e) { /* 취소 */ }
      return;
    }
    try {
      await navigator.clipboard.writeText(message);
      toast('초대 링크를 복사했어요. 카톡에 붙여넣어 보내세요.');
    } catch (e) {
      warn('복사하지 못했어요. 코드를 직접 적어서 보내주세요.');
    }
  };

  useEffect(() => { preloadKakao(); }, []);

  // 기다리면 휴대폰이 카톡 열기를 막으므로 await 없이 바로 보낸다.
  const shareKakao = () => {
    try {
      if (!shareTeamInvite(team.name, inviteLink(team.code))) warn('카카오톡을 준비하고 있어요. 잠시 뒤 다시 눌러 주세요.');
    } catch (e) {
      warn('카카오톡을 열지 못했어요. 인터넷 연결을 확인하거나 "초대 링크 보내기"를 써 주세요.');
    }
  };

  const saveName = () => {
    const n = newName.trim();
    if (!n) { warn('팀 이름을 적어 주세요.'); return; }
    renameTeam(n);
    setEditing(false);
    toast('팀 이름을 바꿨어요.');
  };

  const leave = async () => {
    const unsynced = hasUnsyncedChanges() ? '\n\n⚠ 아직 팀에 안 올라간 변경이 있어요. 나가면 그 변경은 사라져요. (인터넷이 연결된 곳에서 잠시 기다렸다가 나가세요)' : '';
    if (!(await ask(`이 휴대폰의 팀 데이터는 지워지고 처음 화면으로 돌아가요. 팀 데이터는 팀에 그대로 남아서, 팀 코드로 언제든 다시 들어올 수 있어요.${unsynced}`, { title: `"${team.name}" 팀에서 나갈까요?`, ok: '팀 나가기', danger: true }))) return;
    leaveTeamAndClear();
  };

  return (
    <>
      {/* 팀 이름 / 팀 코드를 같은 모양의 줄로. 팀 이름 줄을 누르면 그 자리에서 고친다 */}
      {editing ? (
        <form className="team-info-row editing" onSubmit={e => { e.preventDefault(); saveName(); }}>
          <span className="team-info-label">팀 이름</span>
          <input type="text" value={newName} onChange={e => setNewName(e.target.value)} placeholder="팀 이름" autoFocus maxLength={30} />
          <button type="button" className="team-info-icon" aria-label="취소" onClick={() => { setEditing(false); setNewName(team.name); }}>✕</button>
          <button type="submit" className="team-info-icon save" aria-label="저장">✓</button>
        </form>
      ) : (
        <button type="button" className="team-info-row clickable" onClick={() => { setNewName(team.name); setEditing(true); }}>
          <span className="team-info-label">팀 이름</span>
          <strong className="team-info-value">{team.name}</strong>
          <span className="team-info-edit" aria-hidden="true">✏️</span>
        </button>
      )}
      <div className="team-info-row">
        <span className="team-info-label">팀 코드</span>
        <strong className="team-info-value team-code">{shown}</strong>
      </div>
      <StatusLine status={status} />
      {status.message && <div className="sync-message">{status.message}</div>}
      <p className="muted backup-desc">이 코드를 아는 사람은 팀 데이터를 보고 바꿀 수 있어요. 팀원에게만 보내주세요.</p>
      {/* 맞추기는 자동(실시간 알림 + 15초마다 + 인터넷 다시 연결될 때)이라 따로 버튼을 두지 않는다 */}
      <div className="row-actions">
        <button className="btn btn-kakao" onClick={shareKakao}>카카오톡으로 초대하기</button>
        <button className="btn btn-outline" onClick={share}>초대 링크 보내기</button>
      </div>
      <div className="team-leave">
        <button className="btn btn-danger" onClick={leave}>팀 나가기</button>
      </div>
    </>
  );
}

// 처음 화면(Welcome)에서도 같은 팀 만들기 / 팀 코드로 참여를 쓴다.
export function NoTeam({ initialCode }) {
  const state = useAppState();
  const { toast, warn } = useUI();
  const [mode, setMode] = useState(initialCode ? 'join' : null); // 'create' | 'join'
  const [name, setName] = useState('');
  const [code, setCode] = useState(initialCode ? formatCode(initialCode) : '');
  const [busy, setBusy] = useState(false);
  const [preview, setPreview] = useState(null); // {code, row}

  const create = async () => {
    if (!name.trim()) { warn('팀 이름을 적어 주세요.'); return; }
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
    if (c.length < 10) { warn('팀 코드 12자리를 적어 주세요.'); return; }
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

  // 초대 링크로 들어왔으면 바로 팀을 확인해서 '참여하기'만 누르면 되게 한다.
  useEffect(() => { if (initialCode) check(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const join = () => {
    joinTeam(preview.code, preview.row);
    toast(`"${previewName(preview.row)}" 팀에 참여했어요.`);
  };

  if (preview) {
    const s = preview.row.state;
    return (
      <div className="backup-confirm">
        <div className="backup-confirm-title">"{previewName(preview.row)}" 팀에 참여할까요?</div>
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

// 글자 크기: 이 폰에서만 바뀐다. (다른 사람 폰은 그대로)
function FontSizeSetting() {
  const [scale, setScale] = useState(readFontScale);
  const pick = v => { setScale(v); saveFontScale(v); };
  return (
    <div className="font-size-setting">
      <div className="team-info-label">글자 크기 <span className="muted">(이 폰에서만)</span></div>
      <div className="pill-toggle">
        {FONT_SIZES.map(([v, label]) => <button key={v} type="button" className={scale === v ? 'on' : ''} onClick={() => pick(v)}>{label}</button>)}
      </div>
    </div>
  );
}

// 오른쪽 위 ⚙️ 설정 버튼을 눌렀을 때 뜨는 창. 팀이 없으면 팀 만들기 / 참여를 보여준다.
export function TeamInfoModal() {
  const { team, status } = useSync();
  const { closeModal } = useUI();
  return (
    <>
      <h3>설정</h3>
      <FontSizeSetting />
      {team ? <JoinedTeam team={team} status={status} /> : <NoTeam />}
      <div className="modal-actions"><button className="btn btn-ghost" onClick={closeModal}>닫기</button></div>
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
