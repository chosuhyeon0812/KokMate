import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import { startSync } from './lib/sync';
import { applyFontScale, readFontScale } from './lib/fontSize';
import './style.css';

applyFontScale(readFontScale()); // 화면을 그리기 전에 이 폰에서 고른 글자 크기부터
startSync();

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>
);
