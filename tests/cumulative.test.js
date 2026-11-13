// 누적 기록 (기록 탭 → 누적)
import { describe, test, expect } from 'vitest';
import { cumulativeRows } from '../src/lib/cumulative';

const TODAY = '2026-10-22';

function stateWith() {
  return {
    players: [
      { id: 'a', name: '김민수' },
      { id: 'b', name: '이서연' },
      { id: 'n', name: '안온회원' },
    ],
    sessionHistory: [
      { date: '2026-10-21', participants: [{ id: 'a', name: '김민수', totalGames: 4 }, { id: 'g', name: '홍길동', totalGames: 3 }] },
      { date: '2026-10-08', participants: [{ id: 'a', name: '김민수', totalGames: 3 }, { id: 'b', name: '이서연', totalGames: 2 }] },
      // 예전 기록은 id 없이 이름만 있다
      { date: '2026-09-10', participants: [{ name: '이서연', totalGames: 5 }] },
      { date: '2025-12-20', participants: [{ name: '김민수', totalGames: 1 }] },
    ],
  };
}

const row = (rows, name) => rows.find(r => r.name === name);

describe('누적 기록', () => {
  test('이번 달은 이번 달 모임만 센다', () => {
    const { sessions, rows } = cumulativeRows(stateWith(), 'month', TODAY);
    expect(sessions).toHaveLength(2);
    expect(row(rows, '김민수')).toMatchObject({ attend: 2, games: 7 });
    expect(row(rows, '이서연')).toMatchObject({ attend: 1, games: 2 });
  });

  test('올해 / 전체로 기간을 넓히면 그만큼 더 센다', () => {
    expect(row(cumulativeRows(stateWith(), 'year', TODAY).rows, '이서연').attend).toBe(2);
    expect(row(cumulativeRows(stateWith(), 'all', TODAY).rows, '김민수').attend).toBe(3);
  });

  test('id가 없는 예전 기록은 같은 이름의 회원으로 이어붙인다', () => {
    const r = row(cumulativeRows(stateWith(), 'year', TODAY).rows, '이서연');
    expect(r.games).toBe(7); // 10월 2경기 + 9월 5경기
  });

  test('명단에서 지운 사람(게스트 등)은 나오지 않는다', () => {
    const { rows } = cumulativeRows(stateWith(), 'all', TODAY);
    expect(rows.map(r => r.name)).not.toContain('홍길동');
  });

  test('지운 게스트가 회원과 이름이 같아도 그 회원 기록에 섞이지 않는다', () => {
    const state = stateWith();
    state.sessionHistory.push({ date: '2026-10-15', participants: [{ id: 'g2', name: '김민수', totalGames: 9 }] });
    const r = row(cumulativeRows(state, 'month', TODAY).rows, '김민수');
    expect(r).toMatchObject({ attend: 2, games: 7 });
  });

  test('한 번도 안 온 회원도 0번으로 나오고, 마지막 참석일은 없다', () => {
    const r = row(cumulativeRows(stateWith(), 'all', TODAY).rows, '안온회원');
    expect(r).toMatchObject({ attend: 0, games: 0, last: null, days: null });
  });

  test('마지막 참석일은 기간과 상관없이 가장 최근 모임이고, 며칠 전인지도 계산한다', () => {
    const r = row(cumulativeRows(stateWith(), 'month', TODAY).rows, '이서연');
    expect(r.last).toBe('2026-10-08');
    expect(r.days).toBe(14);
  });

  test('앱 쓰기 전 출석(priorAttend)은 올해와 전체에 더하고, 이번 달에는 안 더한다', () => {
    const state = stateWith();
    state.players[0].priorAttend = 10;
    expect(row(cumulativeRows(state, 'all', TODAY).rows, '김민수').attend).toBe(13);
    expect(row(cumulativeRows(state, 'year', TODAY).rows, '김민수').attend).toBe(12);
    expect(row(cumulativeRows(state, 'month', TODAY).rows, '김민수').attend).toBe(2);
    expect(row(cumulativeRows(state, 'year', '2027-03-01').rows, '김민수').attend).toBe(0); // 내년 '올해'에는 안 더한다
  });
});

describe('순위', () => {
  test('같은 점수는 같은 순위, 그다음은 사람 수만큼 건너뛴다', async () => {
    const { rankOf } = await import('../src/lib/shareImage');
    expect(rankOf([5, 3, 3, 1], (a, b) => a === b)).toEqual([1, 2, 2, 4]);
  });
});
