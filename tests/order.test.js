// 쉬는 사람 "다음 차례 순"
import { describe, test, expect } from 'vitest';
import { availablePlayers, fairnessCompare } from '../src/lib/selectors';
import { setup, player, game, MIN } from './helpers';

const now = Date.now();
const order = state => availablePlayers(state).sort(fairnessCompare).map(p => p.name);

describe('쉬는 사람 순서', () => {
  test('경기 수가 적은 사람이 먼저, 같으면 오래 기다린 사람이 먼저다', () => {
    const state = setup({
      players: [
        player('a', '2경기 방금', { totalGames: 2, restSince: now - 1 * MIN }),
        player('b', '1경기 5분', { totalGames: 1, restSince: now - 5 * MIN }),
        player('c', '1경기 20분', { totalGames: 1, restSince: now - 20 * MIN }),
        player('d', '0경기 방금', { totalGames: 0, restSince: now }),
      ],
    });
    expect(order(state)).toEqual(['0경기 방금', '1경기 20분', '1경기 5분', '2경기 방금']);
  });

  test('경기 중인 사람, 대기 코트에 들어간 사람, 휴식 중인 사람, 안 온 사람은 빠진다', () => {
    const state = setup({
      players: [
        ...['p1', 'p2', 'p3', 'p4'].map(id => player(id, '경기중' + id)),
        ...['w1', 'w2', 'w3', 'w4'].map(id => player(id, '대기' + id)),
        player('r', '휴식', { resting: true }),
        player('x', '안옴', { active: false }),
        player('f', '쉬는사람'),
      ],
      games: [game('g1', 1, ['p1', 'p2', 'p3', 'p4'])],
      waitingMatches: [{ id: 'w', teamA: ['w1', 'w2'], teamB: ['w3', 'w4'] }],
    });
    expect(order(state)).toEqual(['쉬는사람']);
  });
});
