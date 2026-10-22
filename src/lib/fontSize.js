/* 글자 크기 설정. 폰마다 다르게 쓰도록 팀 데이터가 아니라 이 기기에만 저장한다. */
const KEY = 'bm-font-scale';
export const FONT_SIZES = [['0.9', '작게'], ['1', '보통'], ['1.15', '크게'], ['1.3', '아주 크게']];

export function readFontScale() {
  try { return localStorage.getItem(KEY) || '1'; } catch (e) { return '1'; }
}

// 글자 크기가 대부분 rem 이라, 기준 글자 크기에 곱할 배율(--font-scale)만 바꾸면 화면 전체가 같이 커진다.
export function applyFontScale(scale) {
  document.documentElement.style.setProperty('--font-scale', scale);
}

export function saveFontScale(scale) {
  applyFontScale(scale);
  try { localStorage.setItem(KEY, scale); } catch (e) { /* 저장 못 해도 이번엔 바뀐다 */ }
}
