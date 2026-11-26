// 경기 시작 / 종료 / 되돌리기 / 취소
import { describe, test, expect } from 'vitest';
import { startGame, endGame, undoEndGame, deleteGame, moveGame, replayGame, undoReplayGame } from '../src/actions';
import { setup, getState, player } from './helpers';

const four = ['a', 'b', 'c', 'd'];
const gamesOf = id => getState().players.find(p => p.id === id).totalGames;
const noResult = { scoreA: null, scoreB: null, winner: null, memo: '' };

function startOne() {
  setup({ players: four.concat('e').map(id => player(id, id)) });
  startGame(1, four);
  return getState().games[0].id;
}

describe('경기', () => {
  test('경기를 시작하면 1번 코트에 4명이 들어간다 (경기 수는 아직 그대로)', () => {
    startOne();
    const g = getState().games[0];
    expect(g.court).toBe(1);
    expect(g.status).toBe('progress');
    expect(g.teamA.concat(g.teamB)).toEqual(four);
    expect(four.map(gamesOf)).toEqual([0, 0, 0, 0]);
  });

  test('경기 종료하면 4명의 경기 수가 1씩 오르고, 안 뛴 사람은 그대로다', () => {
    const id = startOne();
    endGame(id, noResult);
    expect(four.map(gamesOf)).toEqual([1, 1, 1, 1]);
    expect(gamesOf('e')).toBe(0);
    expect(getState().games[0].status).toBe('done');
  });

  test('경기 종료를 되돌리면 경기 수가 원래대로 돌아오고 다시 진행 중이 된다', () => {
    const id = startOne();
    endGame(id, noResult);
    undoEndGame(id);
    expect(four.map(gamesOf)).toEqual([0, 0, 0, 0]);
    expect(getState().games[0].status).toBe('progress');
  });

  test('한 게임 더: 지금 경기는 기록되고(경기 수 +1) 같은 코트·같은 팀으로 새 경기가 시작된다', () => {
    const id = startOne();
    const newId = replayGame(id);
    const [old, next] = getState().games;
    expect(old.status).toBe('done');
    expect(next.id).toBe(newId);
    expect(next.status).toBe('progress');
    expect(next.court).toBe(1);
    expect(next.teamA.concat(next.teamB)).toEqual(four);
    expect(four.map(gamesOf)).toEqual([1, 1, 1, 1]);
  });

  test('한 게임 더를 되돌리면 새 경기는 사라지고 원래 경기가 다시 진행 중, 경기 수도 원래대로', () => {
    const id = startOne();
    const newId = replayGame(id);
    undoReplayGame(id, newId);
    expect(getState().games.map(g => [g.id, g.status])).toEqual([[id, 'progress']]);
    expect(four.map(gamesOf)).toEqual([0, 0, 0, 0]);
  });

  test('진행 중인 경기를 취소하면 기록 없이 사라지고 경기 수도 그대로다', () => {
    const id = startOne();
    deleteGame(id);
    expect(getState().games).toEqual([]);
    expect(four.map(gamesOf)).toEqual([0, 0, 0, 0]);
  });

  test('끝난 경기 기록을 지우면 경기 수에서 1씩 빠진다', () => {
    const id = startOne();
    endGame(id, noResult);
    deleteGame(id);
    expect(four.map(gamesOf)).toEqual([0, 0, 0, 0]);
  });

  test('코트 바꾸기: 빈 코트로는 옮겨지고, 경기 중인 코트로는 안 옮겨진다', () => {
    setup({ players: ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'].map(id => player(id, id)) });
    startGame(3, four);
    startGame(4, ['e', 'f', 'g', 'h']);
    const id = getState().games[0].id;
    moveGame(id, 4);
    expect(getState().games[0].court).toBe(3);
    moveGame(id, 6);
    expect(getState().games[0].court).toBe(6);
  });

  test('모임 밖 사람을 끼워 치면 1~3명만 넣어도 시작되고, 들어간 사람만 경기 수가 오른다', () => {
    setup({ players: four.concat('e').map(id => player(id, id)) });
    startGame(1, ['a', null, 'c', null]);
    const g = getState().games[0];
    expect(g.teamA.concat(g.teamB)).toEqual(['a', 'c']);
    expect(g.gameType).toBe('외부 인원 포함');
    endGame(g.id, noResult);
    expect(four.map(gamesOf)).toEqual([1, 0, 1, 0]);
  });

  test('단식은 2칸으로 시작하고, 한 명씩 다른 팀이 되며 경기 수는 복식처럼 1씩 오른다', () => {
    setup({ players: four.map(id => player(id, id)) });
    startGame(1, ['a', 'b']);
    const g = getState().games[0];
    expect(g.gameType).toBe('단식');
    expect([g.teamA, g.teamB]).toEqual([['a'], ['b']]);
    endGame(g.id, noResult);
    expect(four.map(gamesOf)).toEqual([1, 1, 0, 0]);
  });

  test('단식에 외부를 끼우면 우리 사람만 남고 종목은 단식 그대로다', () => {
    setup({ players: four.map(id => player(id, id)) });
    startGame(1, [null, 'c']);
    const g = getState().games[0];
    expect(g.gameType).toBe('단식');
    expect(g.teamA.concat(g.teamB)).toEqual(['c']);
  });

  test('외부 인원이 낀 조합은 외부를 빼고 별점을 매긴다 (급수 차이 계산이 깨지지 않음)', async () => {
    const { scoreSplit } = await import('../src/lib/matching');
    setup({ players: four.map(id => player(id, id)) });
    expect(scoreSplit(getState(), ['a', 'b'], []).levelDiff).toBe(0);
    expect(scoreSplit(getState(), ['a', 'b'], ['c']).levelDiff).toBe(0);
  });
});

describe('추천 (빈 칸 채우기)', () => {
  test('고른 사람은 두고, 빈 칸에는 경기 수가 적은 사람을 넣는다', async () => {
    const { recommendFill } = await import('../src/lib/matching');
    const ps = ['a', 'b', 'c', 'd', 'e'].map(id => player(id, id));
    ps[1].totalGames = 3; // b는 많이 쳤다
    setup({ players: ps });
    const fill = recommendFill(getState(), ['a', null, null, null], getState().players);
    expect(fill.sort()).toEqual(['c', 'd', 'e']);
  });

  test('단식은 1칸만 채우고, 사람이 모자라면 null', async () => {
    const { recommendFill } = await import('../src/lib/matching');
    setup({ players: ['a', 'b'].map(id => player(id, id)) });
    const st = getState();
    expect(recommendFill(st, ['a', null], st.players)).toEqual(['b']);
    expect(recommendFill(st, [null, null, null, null], st.players)).toBe(null);
  });

  test('추천은 좋은 순서로 여러 조합을 주고, 경기 수 적은 조합이 먼저다', async () => {
    const { rankFills } = await import('../src/lib/matching');
    const ps = ['a', 'b', 'c', 'd', 'e', 'f'].map(id => player(id, id));
    ps[5].totalGames = 2;
    setup({ players: ps });
    const list = rankFills(getState(), ['a', null, null, null], getState().players);
    expect(list.length).toBe(10); // 나머지 5명 중 3명
    expect(list[0]).not.toContain('f');
    expect(list[list.length - 1]).toContain('f');
  });

  test('단식도 누를 때마다 다른 조합이 나온다 (같은 성별 먼저)', async () => {
    const { rankFills } = await import('../src/lib/matching');
    const ps = ['a', 'b', 'c', 'd'].map(id => player(id, id));
    ps[3].gender = 'F';
    setup({ players: ps });
    const one = rankFills(getState(), ['a', null], getState().players);
    expect(one).toEqual([expect.any(Array), expect.any(Array), ['d']]); // 남자 b·c 먼저, 여자 d는 마지막
    const two = rankFills(getState(), [null, null], getState().players);
    expect(new Set(two.map(c => c.slice().sort().join())).size).toBe(6); // 4명 중 2명, 모두 다른 조합
  });
});
