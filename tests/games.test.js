// 경기 시작 / 종료 / 되돌리기 / 취소
import { describe, test, expect } from 'vitest';
import { startGame, endGame, undoEndGame, deleteGame } from '../src/actions';
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
});
