/**
 * Pure reducer helpers extracted from AppContext for unit testing.
 * They mirror the logic in `src/context/AppContext.tsx` so we can validate
 * shot/sub/undo behaviour without spinning up a React provider.
 */
import type {
  Game,
  ShotEvent,
  SubstitutionEvent,
} from '@/types/basketball';

let counter = 0;
const genId = () => `t_${Date.now()}_${++counter}`;

export function applyRecordShot(
  game: Game,
  shot: Omit<ShotEvent, 'id' | 'timestamp' | 'quarterId'>,
  now: number = Date.now()
): Game {
  const event: ShotEvent = {
    ...shot,
    id: genId(),
    timestamp: now,
    quarterId: game.currentQuarter,
  };
  return { ...game, shots: [...game.shots, event] };
}

export function applyUndoLastShot(game: Game): Game {
  if (game.shots.length === 0) return game;
  return { ...game, shots: game.shots.slice(0, -1) };
}

export function applyRecordSubstitution(
  game: Game,
  playerIn: string,
  playerOut: string,
  now: number = Date.now()
): Game {
  const sub: SubstitutionEvent = {
    id: genId(),
    playerIn,
    playerOut,
    quarterId: game.currentQuarter,
    timestamp: now,
  };
  const newOnCourt = game.onCourtPlayerIds
    .filter(id => id !== playerOut)
    .concat(playerIn);
  return {
    ...game,
    substitutions: [...(game.substitutions || []), sub],
    onCourtPlayerIds: newOnCourt,
  };
}

/** Sum of made-shot points belonging to a single player. */
export function pointsForPlayer(game: Game, playerId: string): number {
  return game.shots
    .filter(s => s.playerId === playerId && s.made)
    .reduce((acc, s) => acc + s.points, 0);
}
