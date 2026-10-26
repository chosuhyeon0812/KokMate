// 대기 코트: 한 사람은 대기 코트 3곳까지 들어갈 수 있다.
import { describe, test, expect } from 'vitest';
import { addWaitingMatch } from '../src/actions';
import { waitingModalPlayers } from '../src/lib/selectors';
import { setup, getState, player } from './helpers';

const names = state => waitingModalPlayers(state).map(p => p.id);

describe('대기 코트 중복', () => {
  test('3곳까지는 다시 고를 수 있고, 3곳에 들어가면 목록에서 빠진다', () => {
    setup({ players: ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j'].map(id => player(id, id)) });
    addWaitingMatch(['a', 'b', 'c', 'd']);
    addWaitingMatch(['a', 'e', 'f', 'g']);
    expect(names(getState())).toContain('a');
    addWaitingMatch(['a', 'h', 'i', 'j']);
    expect(names(getState())).not.toContain('a');
    expect(names(getState())).toContain('b');
  });

  test('수정 중인 대기 코트는 빼고 센다', () => {
    setup({ players: ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j'].map(id => player(id, id)) });
    addWaitingMatch(['a', 'b', 'c', 'd']);
    addWaitingMatch(['a', 'e', 'f', 'g']);
    addWaitingMatch(['a', 'h', 'i', 'j']);
    const editing = getState().waitingMatches[2].id;
    expect(waitingModalPlayers(getState(), editing).map(p => p.id)).toContain('a');
  });
});
