// 테스트마다 가짜 회원·경기로 앱 상태를 새로 만든다. (실제 팀 데이터·서버와는 연결되지 않음)
import { replaceState, getState } from '../src/store';

export const MIN = 60000;

export function player(id, name, extra = {}) {
  return { id, name, gender: 'M', level: 'C', memo: '', role: 'member', active: true, resting: false,
    totalGames: 0, wins: 0, losses: 0, shuttleDone: false, shuttleNote: '', restSince: Date.now(), ...extra };
}

export function game(id, court, ids, extra = {}) {
  const today = new Date();
  const pad = n => String(n).padStart(2, '0');
  return { id, round: 1, court, gameType: '남복', teamA: ids.slice(0, 2), teamB: ids.slice(2, 4),
    scoreA: null, scoreB: null, winner: null, startTime: Date.now() - 20 * MIN, endTime: null, memo: '',
    date: `${today.getFullYear()}-${pad(today.getMonth() + 1)}-${pad(today.getDate())}`, status: 'progress', ...extra };
}

export function setup(partial) {
  replaceState({ players: [], games: [], waitingMatches: [], pendingRecs: [], sessionHistory: [],
    settings: { courts: [1, 2] }, lastShortfall: '', formerNames: {}, ...partial });
  return getState();
}

export { getState };
