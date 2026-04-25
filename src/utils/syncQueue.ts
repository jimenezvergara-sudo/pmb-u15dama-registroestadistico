import { Game } from '@/types/basketball';
import { supabase } from '@/integrations/supabase/client';

const QUEUE_KEY = 'basqest_sync_queue_v1';
const STATUS_KEY = 'basqest_sync_status';

export type SyncOp =
  | { kind: 'updateGame'; game: Game; queuedAt: number }
  | { kind: 'insertGame'; game: Game; clubId: string; userId: string; queuedAt: number };

export type SyncStatus = 'idle' | 'syncing' | 'pending' | 'error';

type Listener = (status: SyncStatus, pending: number) => void;
const listeners = new Set<Listener>();

function readQueue(): SyncOp[] {
  try {
    const raw = localStorage.getItem(QUEUE_KEY);
    return raw ? (JSON.parse(raw) as SyncOp[]) : [];
  } catch {
    return [];
  }
}

function writeQueue(ops: SyncOp[]) {
  localStorage.setItem(QUEUE_KEY, JSON.stringify(ops));
  notify();
}

function setStatus(s: SyncStatus) {
  localStorage.setItem(STATUS_KEY, s);
  notify(s);
}

function notify(forced?: SyncStatus) {
  const ops = readQueue();
  const status = forced ?? (localStorage.getItem(STATUS_KEY) as SyncStatus) ?? 'idle';
  listeners.forEach(l => l(status, ops.length));
}

export function subscribeSync(l: Listener): () => void {
  listeners.add(l);
  // Send initial state
  const ops = readQueue();
  const status = (localStorage.getItem(STATUS_KEY) as SyncStatus) ?? 'idle';
  l(status, ops.length);
  return () => listeners.delete(l);
}

export function getPendingCount(): number {
  return readQueue().length;
}

export function enqueue(op: SyncOp) {
  const ops = readQueue();
  // Coalesce: for updateGame, replace any prior update of same game id
  if (op.kind === 'updateGame') {
    const filtered = ops.filter(
      o => !(o.kind === 'updateGame' && o.game.id === op.game.id)
    );
    filtered.push(op);
    writeQueue(filtered);
  } else {
    ops.push(op);
    writeQueue(ops);
  }
  setStatus('pending');
}

async function applyOp(op: SyncOp): Promise<void> {
  if (op.kind === 'updateGame') {
    const g = op.game;
    const { error } = await supabase
      .from('club_games' as any)
      .update({
        opponent_name: g.opponentName,
        date: g.date,
        category: g.category,
        roster: g.roster as any,
        shots: g.shots as any,
        actions: g.actions as any,
        substitutions: g.substitutions as any,
        opponent_scores: g.opponentScores as any,
        on_court_player_ids: g.onCourtPlayerIds as any,
        court_time_ms: g.courtTimeMs as any,
        current_quarter: g.currentQuarter,
        tournament_id: g.tournamentId || null,
        opponent_team_id: g.opponentTeamId || null,
        leg: g.leg || null,
        is_home: g.isHome ?? null,
      })
      .eq('id', g.id);
    if (error) throw error;
  } else if (op.kind === 'insertGame') {
    const g = op.game;
    const { error } = await supabase.from('club_games' as any).insert({
      club_id: op.clubId,
      user_id: op.userId,
      opponent_name: g.opponentName,
      date: g.date,
      category: g.category || 'U15',
      roster: g.roster as any,
      shots: g.shots as any,
      actions: g.actions as any,
      substitutions: g.substitutions as any,
      opponent_scores: g.opponentScores as any,
      on_court_player_ids: g.onCourtPlayerIds as any,
      court_time_ms: g.courtTimeMs as any,
      current_quarter: g.currentQuarter,
      tournament_id: g.tournamentId || null,
      opponent_team_id: g.opponentTeamId || null,
      leg: g.leg || null,
      is_home: g.isHome ?? null,
      game_start_timestamp: g.gameStartTimestamp || null,
      last_timer_snapshot: g.lastTimerSnapshot || null,
    });
    if (error) throw error;
  }
}

let isFlushing = false;

export async function flushQueue(): Promise<void> {
  if (isFlushing) return;
  if (typeof navigator !== 'undefined' && !navigator.onLine) return;
  const ops = readQueue();
  if (ops.length === 0) {
    setStatus('idle');
    return;
  }

  isFlushing = true;
  setStatus('syncing');
  const remaining: SyncOp[] = [];
  let hadError = false;

  for (const op of ops) {
    try {
      await applyOp(op);
    } catch (err) {
      console.error('[syncQueue] failed op', op.kind, err);
      remaining.push(op);
      hadError = true;
    }
  }

  writeQueue(remaining);
  isFlushing = false;
  if (remaining.length === 0) {
    setStatus('idle');
  } else {
    setStatus(hadError ? 'error' : 'pending');
  }
}

// Auto-flush on reconnect
if (typeof window !== 'undefined') {
  window.addEventListener('online', () => {
    flushQueue();
  });
  // Initial flush attempt
  setTimeout(() => flushQueue(), 1000);
}
