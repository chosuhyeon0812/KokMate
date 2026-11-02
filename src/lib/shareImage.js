/* 순위표를 사진(PNG)으로 그려서 카톡 등으로 보내거나 휴대폰에 저장한다. (통계·누적 화면의 "공유") */
import logoUrl from '../assets/logo.svg';

const FONT = '"Pretendard","Apple SD Gothic Neo","Malgun Gothic",system-ui,sans-serif';
const COLORS = { bg: '#f3faf5', card: '#ffffff', text: '#10291b', muted: '#5c7365', line: '#dcefe2', primary: '#1aa852', gold: '#c9860f', male: '#2f6fca', female: '#d4407f', unknown: '#b0b8bf' };

// 같은 점수면 같은 순위 (1, 2, 2, 4 …). sorted는 이미 정렬된 목록, same(a, b)는 두 사람이 같은 점수인지.
export function rankOf(sorted, same) {
  const ranks = [];
  sorted.forEach((r, i) => { ranks.push(i > 0 && same(sorted[i - 1], r) ? ranks[i - 1] : i + 1); });
  return ranks;
}

// title: 큰 제목, subtitle: 날짜·기간, columns: 이름 뒤 숫자 칸 이름들
// rows: [{ rank, name, level, gender, values: [...] }]
function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

export async function drawRankImage({ title, subtitle, columns, rows }) {
  const W = 1080, PAD = 56, ROW = 92, HEAD = 250, FOOT = 110;
  const H = HEAD + 70 + rows.length * ROW + FOOT;
  const canvas = document.createElement('canvas');
  canvas.width = W; canvas.height = H;
  const c = canvas.getContext('2d');
  const font = (size, weight = 700) => { c.font = `${weight} ${size}px ${FONT}`; };

  c.fillStyle = COLORS.bg; c.fillRect(0, 0, W, H);
  c.fillStyle = COLORS.primary; c.fillRect(0, 0, W, 18);

  c.textBaseline = 'middle';
  c.fillStyle = COLORS.text; font(64, 900); c.fillText(`🏸 ${title}`, PAD, 110);
  c.fillStyle = COLORS.muted; font(36, 600); c.fillText(subtitle, PAD, 185);

  // 표 칸 위치: 순위 · 이름(급수) · 숫자 칸들(오른쪽 정렬)
  const colX = columns.map((_, i) => W - PAD - (columns.length - 1 - i) * 190);
  const top = HEAD;
  c.fillStyle = COLORS.card; c.fillRect(PAD - 20, top, W - (PAD - 20) * 2, 70 + rows.length * ROW);
  c.fillStyle = COLORS.muted; font(30, 700);
  c.textAlign = 'left'; c.fillText('순위', PAD, top + 36); c.fillText('이름', PAD + 130, top + 36);
  c.textAlign = 'right'; columns.forEach((col, i) => c.fillText(col, colX[i], top + 36));
  c.fillStyle = COLORS.line; c.fillRect(PAD - 20, top + 68, W - (PAD - 20) * 2, 3);

  rows.forEach((r, i) => {
    const y = top + 70 + i * ROW + ROW / 2;
    const medal = ['🥇', '🥈', '🥉'][r.rank - 1];
    c.textAlign = 'left';
    c.fillStyle = r.rank === 1 ? COLORS.gold : COLORS.text;
    font(medal ? 44 : 38, 900); c.fillText(medal || String(r.rank), PAD + 4, y);
    // 남자는 파랑, 여자는 분홍 점 (앱 카드 색과 같게). 성별이 없는 예전 기록은 회색
    c.fillStyle = r.gender === 'M' ? COLORS.male : r.gender === 'F' ? COLORS.female : COLORS.unknown;
    c.beginPath(); c.arc(PAD + 142, y, 10, 0, Math.PI * 2); c.fill();
    c.fillStyle = COLORS.text; font(44, 900); c.fillText(r.name, PAD + 166, y);
    if (r.level) {
      const w = c.measureText(r.name).width;
      c.fillStyle = COLORS.muted; font(30, 700); c.fillText(r.level, PAD + 166 + w + 14, y + 4);
    }
    c.textAlign = 'right'; c.fillStyle = COLORS.text; font(42, 800);
    r.values.forEach((v, j) => c.fillText(String(v), colX[j], y));
    if (i < rows.length - 1) { c.fillStyle = COLORS.line; c.fillRect(PAD, top + 70 + (i + 1) * ROW, W - PAD * 2, 2); }
  });

  // 맨 아래 가운데: 콕메이트 아이콘 + 이름 (아이콘을 못 불러오면 이름만)
  const logo = await loadImage(logoUrl).catch(() => null);
  const ICON = 56, GAP = 16, footY = H - FOOT / 2;
  c.fillStyle = COLORS.text; font(36, 900);
  const nameW = c.measureText('콕메이트').width;
  const left = (W - (logo ? ICON + GAP : 0) - nameW) / 2;
  if (logo) {
    c.save();
    c.beginPath(); c.roundRect(left, footY - ICON / 2, ICON, ICON, 14); c.clip();
    c.drawImage(logo, left, footY - ICON / 2, ICON, ICON);
    c.restore();
  }
  c.textAlign = 'left';
  c.fillText('콕메이트', left + (logo ? ICON + GAP : 0), footY);

  return new Promise(resolve => canvas.toBlob(resolve, 'image/png'));
}

// 휴대폰이 사진 공유를 지원하면 공유 창(카톡 등)을 열고, 아니면 사진 파일로 내려받는다.
// 돌려주는 값: 'shared' | 'saved' | 'cancelled'
export async function shareImage(blob, filename) {
  const file = new File([blob], filename, { type: 'image/png' });
  if (typeof navigator.canShare === 'function' && navigator.canShare({ files: [file] })) {
    try {
      await navigator.share({ files: [file] });
      return 'shared';
    } catch (e) {
      if (e.name === 'AbortError') return 'cancelled';
    }
  }
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = filename;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  return 'saved';
}

// 순위표 사진을 그려서 바로 공유(또는 저장)까지. 돌려주는 값은 shareImage와 같다.
export async function shareRanking({ filename, ...drawOptions }) {
  return shareImage(await drawRankImage(drawOptions), filename);
}
