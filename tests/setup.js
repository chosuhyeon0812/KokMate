// 테스트용 가짜 저장소. 앱은 폰의 localStorage에 저장하는데, 테스트에서는 메모리에만 잠깐 두고 버린다.
const mem = new Map();
globalThis.localStorage = {
  getItem: k => (mem.has(k) ? mem.get(k) : null),
  setItem: (k, v) => mem.set(k, String(v)),
  removeItem: k => mem.delete(k),
  clear: () => mem.clear(),
};
