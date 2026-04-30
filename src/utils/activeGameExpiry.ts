import type { Game } from '@/types/basketball';

export const LINEUP_IDLE_TIMEOUT_MS = 15 * 60 * 1000;
export const RETURN_TO_ROSTER_KEY = 'basqest_return_to_roster';
export const LINEUP_RETURN_EVENT = 'basqest:return-to-roster';

export const isPendingLineupGame = (game: Game) => {
  const hasLineup = (game.onCourtPlayerIds || []).length > 0;
  const hasActivity =
    (game.shots || []).length > 0 ||
    (game.actions || []).length > 0 ||
    (game.opponentScores || []).length > 0 ||
    (game.substitutions || []).length > 0;

  return !game.gameStartTimestamp && !hasLineup && !hasActivity;
};

export const getPendingLineupAge = (game: Game, now = Date.now()) => {
  const createdAt = Date.parse(game.date);
  return Number.isFinite(createdAt) ? now - createdAt : 0;
};

export const shouldExpirePendingLineup = (game: Game, now = Date.now()) =>
  isPendingLineupGame(game) && getPendingLineupAge(game, now) >= LINEUP_IDLE_TIMEOUT_MS;

export const requestRosterReturn = () => {
  try {
    localStorage.setItem(RETURN_TO_ROSTER_KEY, '1');
    window.dispatchEvent(new CustomEvent(LINEUP_RETURN_EVENT));
  } catch {
    // Ignore storage/event failures; the active game cleanup is still the important part.
  }
};

export const consumeRosterReturnRequest = () => {
  try {
    const shouldReturn = localStorage.getItem(RETURN_TO_ROSTER_KEY) === '1';
    if (shouldReturn) localStorage.removeItem(RETURN_TO_ROSTER_KEY);
    return shouldReturn;
  } catch {
    return false;
  }
};