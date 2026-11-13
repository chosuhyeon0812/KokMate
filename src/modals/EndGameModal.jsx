/* 경기 종료. 팀은 코트에서 가위바위보로 정해서 앱은 승패·점수를 받지 않고, 경기 수만 기록한다.
   useEndGame: 진행 중 코트에서 한 번에 종료(되돌리기 가능). */
import { getState } from '../store';
import { useUI } from '../ui';
import * as actions from '../actions';
import { playerName, playingPlayerIds, activeGameOnCourt } from '../lib/selectors';

export function useEndGame() {
  const { toast, warn } = useUI();

  const undo = gameId => {
    // 되돌리는 사이에 같은 코트나 같은 선수로 새 경기가 시작됐다면 되돌릴 수 없다.
    const now = getState();
    const game = now.games.find(x => x.id === gameId);
    if (!game || game.status !== 'done') return;
    if (activeGameOnCourt(now, game.court)) { warn(`${game.court}번 코트에서 이미 다른 경기가 진행 중이라 되돌릴 수 없어요.`); return; }
    const playing = playingPlayerIds(now);
    const busy = game.teamA.concat(game.teamB).filter(id => playing.has(id));
    if (busy.length) { warn(`다른 경기에 들어간 선수가 있어 되돌릴 수 없어요: ${busy.map(id => playerName(now, id)).join(', ')}`); return; }
    actions.undoEndGame(gameId);
    toast(`${game.court}번 코트 경기를 진행 중으로 되돌렸어요.`);
  };

  return game => {
    actions.endGame(game.id, { scoreA: null, scoreB: null, winner: null, memo: game.memo || '' });
    // 대기 코트는 팝업으로 묻지 않고, 대기 코트 카드에서 빈 코트를 골라 시작한다.
    toast(`${game.court}번 코트 경기를 종료했어요.`, { action: { label: '되돌리기', onClick: () => undo(game.id) } });
  };
}
