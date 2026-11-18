import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { Analytics } from '@vercel/analytics/react';
import App from './App';
import { startSync } from './lib/sync';
import { applyFontScale, readFontScale } from './lib/fontSize';
import './style.css';

applyFontScale(readFontScale()); // 화면을 그리기 전에 이 폰에서 고른 글자 크기부터
startSync();

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
    {/* Vercel 방문자 수 세기 (몇 명이 쓰는지 보려고). 초대 링크 주소(?team=팀코드)가 같이 넘어가지 않게 ? 뒤는 지운다. */}
    <Analytics beforeSend={e => ({ ...e, url: e.url.split('?')[0] })} />
  </StrictMode>
);
