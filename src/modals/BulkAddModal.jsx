/* 여러 명 추가: "민수 남 A" 처럼 한 줄에 한 명씩 붙여넣으면 한 번에 등록한다. */
import { useState } from 'react';
import { useAppState } from '../store';
import { useUI } from '../ui';
import * as actions from '../actions';
import { LEVEL_OPTIONS } from '../lib/utils';

const GENDER_WORDS = { '남': 'M', '남자': 'M', '남성': 'M', 'm': 'M', '여': 'F', '여자': 'F', '여성': 'F', 'f': 'F' };

// 한 줄을 { name, gender, level } 로 해석한다. 칸은 띄어쓰기·탭(엑셀 복사)·쉼표 모두 허용, 이름 다음 성별/급수 순서는 상관없음.
function parseLine(line) {
  const [name, ...rest] = line.split(/[\s,]+/).filter(Boolean);
  let gender = null, level = null;
  for (const t of rest) {
    const g = GENDER_WORDS[t.toLowerCase()];
    if (g) gender = g;
    else if (LEVEL_OPTIONS.includes(t.toUpperCase())) level = t.toUpperCase();
  }
  if (!gender) return { error: '성별(남/여)이 없어요' };
  if (!level) return { error: '급수(A~F)가 없어요' };
  return { name, gender, level };
}

export function parseBulk(text, existingNames) {
  const seen = new Set(existingNames);
  const ok = [], skipped = [], errors = [];
  text.split('\n').map(l => l.trim()).filter(Boolean).forEach(line => {
    const r = parseLine(line);
    if (r.error) errors.push(`${line} → ${r.error}`);
    else if (seen.has(r.name)) skipped.push(r.name);
    else { seen.add(r.name); ok.push(r); }
  });
  return { ok, skipped, errors };
}

export default function BulkAddModal() {
  const state = useAppState();
  const { toast, warn, closeModal } = useUI();
  const [text, setText] = useState('');
  const { ok, skipped, errors } = parseBulk(text, state.players.map(p => p.name));

  const save = () => {
    if (ok.length === 0) { warn('추가할 사람이 없어요. 형식을 확인해 주세요.'); return; }
    actions.addPlayers(ok);
    closeModal();
    toast(`${ok.length}명을 등록했어요. "오늘 참석자 선택"에서 오늘 온 사람을 체크하세요.`);
  };

  return (
    <>
      <h3>여러 명 추가</h3>
      <p className="muted" style={{ marginTop: -6, fontSize: '.82rem' }}>한 줄에 한 명씩 <b>이름 성별 급수</b> 순서로 적어주세요. 엑셀에서 복사해 붙여넣어도 돼요.</p>
      <textarea className="bulk-input" rows={9} placeholder={'민수 남 A\n영희 여 B\n철수 남 C'} value={text} onChange={e => setText(e.target.value)} />
      {text.trim() && (
        <div className="bulk-preview">
          <div className="bulk-ok">✓ {ok.length}명 추가돼요{ok.length > 0 && <span className="muted"> · {ok.map(p => p.name).join(', ')}</span>}</div>
          {skipped.length > 0 && <div className="muted">이미 있거나 중복된 이름이라 건너뜀: {skipped.join(', ')}</div>}
          {errors.length > 0 && (
            <div className="bulk-errors">
              <div>확인이 필요한 줄 {errors.length}개 (추가 안 됨)</div>
              {errors.map((e, i) => <div key={i}>· {e}</div>)}
            </div>
          )}
        </div>
      )}
      <div className="modal-actions">
        <button className="btn btn-ghost" onClick={closeModal}>취소</button>
        <button className="btn btn-primary" disabled={ok.length === 0} onClick={save}>{ok.length > 0 ? `${ok.length}명 추가` : '추가'}</button>
      </div>
    </>
  );
}
