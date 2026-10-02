import { createContext, useContext } from 'react';

// toast / 모달 / 탭 전환을 어느 화면에서나 쓸 수 있게 해주는 컨텍스트
export const UIContext = createContext(null);

export function useUI() {
  return useContext(UIContext);
}
