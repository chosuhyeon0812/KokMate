// 모임 종료 / 깜빡했을 때 다음 날 저장
import { describe, test, expect, beforeEach, afterEach, vi } from 'vitest';
import { endSession, endStaleSession, isSessionStale, resetToday } from '../src/actions';
import { setup, getState, player, game, MIN } from './helpers';

const HOUR = 60 * MIN;

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date(2026, 9, 22, 21, 0)); // 10월 22일 밤 9시에 모임 중
});
afterEach(() => vi.useRealTimers());

function meetingWithGuest() {
  return setup({
    players: [
      player('a', '김민수', { totalGames: 2 }),
      player('b', '이서연', { totalGames: 2 }),
      player('c', '박지훈', { totalGames: 1 }),
      player('g', '홍길동', { totalGames: 1, role: 'guest' }),
      player('x', '안온사람', { active: false }),
    ],
    games: [
      game('g1', 1, ['a', 'b', 'c', 'g'], { status: 'done', endTime: Date.now() - 30 * MIN, memo: '셔틀콕 교체' }),
      game('g2', 2, ['a', 'b', 'c', 'g'], { status: 'done', endTime: Date.now() - 5 * MIN }),
    ],
  });
}

describe('모임 종료', () => {
  test('오늘 기록이 지난 모임으로 저장된다', () => {
    meetingWithGuest();
    endSession();
    const s = getState().sessionHistory[0];
    expect(s.date).toBe('2026-10-22');
    expect(s.totalGames).toBe(2);
    expect(s.usedCourts).toBe(2);
    expect(s.memos).toEqual(['1번 코트 · 셔틀콕 교체']);
    // 경기를 뛴 사람만 참가자로 남는다 (안 온 사람 제외)
    expect(s.participants.map(p => p.name).sort()).toEqual(['김민수', '박지훈', '이서연', '홍길동'].sort());
  });

  test('경기·경기 수·참석자·코트가 다음 모임을 위해 초기화된다', () => {
    meetingWithGuest();
    endSession();
    const st = getState();
    expect(st.games).toEqual([]);
    expect(st.settings.courts).toEqual([]);
    expect(st.players.every(p => p.totalGames === 0 && !p.active && !p.resting)).toBe(true);
  });

  test('게스트는 명단에서 빠지고, 지난 모임 기록에는 이름이 남는다', () => {
    meetingWithGuest();
    endSession();
    const st = getState();
    expect(st.players.map(p => p.name)).not.toContain('홍길동');
    expect(st.players).toHaveLength(4); // 회원 4명은 그대로 (안 온 사람 포함)
    expect(st.sessionHistory[0].participants.map(p => p.name)).toContain('홍길동');
  });

  test('끝난 경기 없이 "모임 초기화"해도 게스트와 코트는 비워진다', () => {
    setup({ players: [player('a', '김민수'), player('g', '홍길동', { role: 'guest' })] });
    resetToday({ endOfSession: true });
    expect(getState().players.map(p => p.name)).toEqual(['김민수']);
    expect(getState().settings.courts).toEqual([]);
  });
});

describe('모임 종료를 깜빡했을 때 (다음 날 저장)', () => {
  test('날짜가 바뀌고 마지막 경기 후 6시간이 지나면 저장 대상이다', () => {
    meetingWithGuest();
    vi.setSystemTime(new Date(2026, 9, 23, 9, 0)); // 다음 날 아침 9시
    expect(isSessionStale(getState())).toBe(true);
  });

  test('자정을 넘겨 계속 치는 중이면 (6시간 안 지남) 저장 대상이 아니다', () => {
    meetingWithGuest();
    vi.setSystemTime(new Date(2026, 9, 23, 0, 30)); // 다음 날 새벽 0시 30분
    expect(isSessionStale(getState())).toBe(false);
  });

  test('같은 날이면 아무리 오래 지나도 저장 대상이 아니다', () => {
    vi.setSystemTime(new Date(2026, 9, 22, 7, 0));
    meetingWithGuest();
    vi.setSystemTime(new Date(2026, 9, 22, 23, 0)); // 같은 날 16시간 뒤
    expect(isSessionStale(getState())).toBe(false);
  });

  test('"경기 종료"를 안 누른 경기도 친 경기로 쳐서 함께 저장한다', () => {
    setup({
      players: ['a', 'b', 'c', 'd'].map(id => player(id, id)),
      games: [game('g1', 1, ['a', 'b', 'c', 'd'])], // 진행 중인 채로 남은 경기
    });
    vi.setSystemTime(Date.now() + 12 * HOUR + 24 * HOUR);
    expect(endStaleSession()).toBe(true);
    const s = getState().sessionHistory[0];
    expect(s.totalGames).toBe(1);
    expect(s.participants.every(p => p.totalGames === 1)).toBe(true);
  });

  test('두 번 눌러도 기록은 한 번만 저장된다', () => {
    meetingWithGuest();
    vi.setSystemTime(new Date(2026, 9, 23, 9, 0));
    expect(endStaleSession()).toBe(true);
    expect(endStaleSession()).toBe(false);
    expect(getState().sessionHistory).toHaveLength(1);
  });

  test('다음 날 저장해도 날짜는 모임한 날로 남는다', () => {
    meetingWithGuest();
    vi.setSystemTime(new Date(2026, 9, 23, 9, 0));
    endStaleSession();
    expect(getState().sessionHistory[0].date).toBe('2026-10-22');
  });
});
