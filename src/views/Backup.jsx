/* 공유·백업 탭: 팀 공유, 전체 데이터를 파일로 저장(카톡 등으로 보내기 포함), 백업 파일 불러오기 */
import { useRef, useState } from 'react';
import { useAppState, getState, replaceState, update } from '../store';
import { useUI } from '../ui';
import { todayStr, timeStr } from '../lib/utils';
import { syncEnabled, useSync } from '../lib/sync';
import TeamCard from '../components/TeamCard';

const BACKUP_APP = 'badminton-matcher';

function backupFile() {
  const now = Date.now();
  // 불러온 뒤에도 "마지막 백업" 시각이 맞게 나오도록 파일 안에도 넣어둔다.
  const data = { app: BACKUP_APP, version: 1, exportedAt: now, state: { ...getState(), lastBackupAt: now } };
  const blob = new Blob([JSON.stringify(data)], { type: 'application/json' });
  return new File([blob], `배드민턴-백업-${todayStr()}.json`, { type: 'application/json' });
}

function markBackedUp() {
  update(d => { d.lastBackupAt = Date.now(); });
}

// 백업 파일 내용을 확인한다. 이상하면 이유를 담은 Error 를 던진다.
function parseBackup(text) {
  let data;
  try { data = JSON.parse(text); } catch (e) { throw new Error('백업 파일을 읽을 수 없어요. 이 앱에서 만든 .json 파일인지 확인해 주세요.'); }
  if (!data || data.app !== BACKUP_APP || !data.state) throw new Error('이 앱에서 만든 백업 파일이 아니에요.');
  const s = data.state;
  if (!Array.isArray(s.players) || !Array.isArray(s.games)) throw new Error('백업 파일 내용이 올바르지 않아요.');
  return data;
}

function dateTimeStr(ts) {
  return `${todayStr(ts)} ${timeStr(ts)}`;
}

export default function Backup() {
  const state = useAppState();
  const { toast, warn } = useUI();
  const fileInput = useRef();
  const [pending, setPending] = useState(null); // 불러오기 전에 확인할 백업 내용
  const { team } = useSync();
  const canShare = typeof navigator.canShare === 'function' && navigator.canShare({ files: [backupFile()] });

  const download = () => {
    const file = backupFile();
    const url = URL.createObjectURL(file);
    const a = document.createElement('a');
    a.href = url;
    a.download = file.name;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    markBackedUp();
    toast(`${file.name} 파일로 저장했어요.`);
  };

  const share = async () => {
    try {
      await navigator.share({ files: [backupFile()], title: '배드민턴 매칭 백업' });
      markBackedUp();
    } catch (e) {
      if (e.name !== 'AbortError') warn('보내기에 실패했어요. "파일로 저장"을 이용해 주세요.');
    }
  };

  const pick = async e => {
    const file = e.target.files[0];
    e.target.value = ''; // 같은 파일을 다시 골라도 동작하도록
    if (!file) return;
    try {
      setPending(parseBackup(await file.text()));
    } catch (err) {
      warn(err.message);
    }
  };

  const restore = () => {
    replaceState(pending.state);
    setPending(null);
    toast('백업 파일로 데이터를 바꿨어요.');
  };

  const s = pending?.state;
  return (
    <>
      {syncEnabled && <TeamCard />}
      <div className="card">
        <h2>백업 파일 만들기</h2>
        <p className="muted backup-desc">회원 명단, 오늘 경기, 지난 모임 기록, 콕 기록이 모두 파일 하나에 담겨요. 휴대폰을 바꾸거나 브라우저 기록을 지우기 전, 다른 운영진에게 넘길 때 써주세요.</p>
        <div className="backup-last">
          마지막 백업: {state.lastBackupAt ? dateTimeStr(state.lastBackupAt) : '아직 없음'}
        </div>
        <div className="row-actions">
          {canShare && <button className="btn btn-primary" onClick={share}>카톡 등으로 보내기</button>}
          <button className={`btn ${canShare ? 'btn-outline' : 'btn-primary'}`} onClick={download}>파일로 저장</button>
        </div>
      </div>

      <div className="card">
        <h2>백업 불러오기</h2>
        <p className="muted backup-desc">불러오면 지금 이 기기의 데이터가 <b>모두 백업 파일 내용으로 바뀌어요.</b> 지금 데이터가 필요하면 먼저 백업 파일을 만들어 두세요.{team && <> 지금 팀 공유 중이라 <b>팀원 모두의 데이터가</b> 함께 바뀌어요.</>}</p>
        <input ref={fileInput} type="file" accept=".json,application/json" style={{ display: 'none' }} onChange={pick} />
        {!pending ? (
          <button className="btn btn-outline" onClick={() => fileInput.current.click()}>백업 파일 고르기</button>
        ) : (
          <div className="backup-confirm">
            <div className="backup-confirm-title">이 백업으로 바꿀까요?</div>
            <div>백업한 때: <b>{dateTimeStr(pending.exportedAt)}</b></div>
            <div>회원 {s.players.length}명 · 오늘 경기 {s.games.length}개 · 지난 모임 {(s.sessionHistory || []).length}개</div>
            <div className="row-actions" style={{ marginTop: 10 }}>
              <button className="btn btn-ghost" onClick={() => setPending(null)}>취소</button>
              <button className="btn btn-danger" onClick={restore}>이 백업으로 바꾸기</button>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
