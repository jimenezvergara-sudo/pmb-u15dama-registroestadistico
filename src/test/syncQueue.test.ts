import { describe, it, expect, beforeEach, vi } from 'vitest';
import type { Game } from '@/types/basketball';

// Mock Supabase client BEFORE importing syncQueue.
const updateMock = vi.fn();
const insertMock = vi.fn();
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: vi.fn(() => ({
      update: (...args: unknown[]) => {
        updateMock(...args);
        return { eq: vi.fn().mockResolvedValue({ error: null }) };
      },
      insert: (...args: unknown[]) => {
        insertMock(...args);
        return Promise.resolve({ error: null });
      },
    })),
  },
}));

// Helper to build a minimal valid Game.
const makeGame = (id: string): Game => ({
  id,
  opponentName: 'Rival',
  date: '2026-05-01',
  roster: [],
  shots: [],
  opponentScores: [],
  actions: [],
  substitutions: [],
  currentQuarter: 'Q1',
  category: 'U15',
  onCourtPlayerIds: [],
  courtTimeMs: {},
});

const QUEUE_KEY = 'basqest_sync_queue_v1';

describe('syncQueue: cola offline', () => {
  beforeEach(() => {
    localStorage.clear();
    updateMock.mockClear();
    insertMock.mockClear();
    vi.resetModules();
  });

  it('Encola una actualización y la persiste en localStorage', async () => {
    const { enqueue, getPendingCount } = await import('@/utils/syncQueue');
    enqueue({ kind: 'updateGame', game: makeGame('g1'), queuedAt: Date.now() });
    expect(getPendingCount()).toBe(1);

    const raw = localStorage.getItem(QUEUE_KEY);
    expect(raw).toBeTruthy();
    const parsed = JSON.parse(raw!);
    expect(parsed).toHaveLength(1);
    expect(parsed[0].kind).toBe('updateGame');
    expect(parsed[0].game.id).toBe('g1');
  });

  it('Coalescing: dos updateGame del mismo partido se colapsan en uno', async () => {
    const { enqueue, getPendingCount } = await import('@/utils/syncQueue');
    enqueue({ kind: 'updateGame', game: makeGame('g1'), queuedAt: 1 });
    enqueue({ kind: 'updateGame', game: { ...makeGame('g1'), opponentName: 'Otro' }, queuedAt: 2 });
    expect(getPendingCount()).toBe(1);
    const parsed = JSON.parse(localStorage.getItem(QUEUE_KEY)!);
    expect(parsed[0].game.opponentName).toBe('Otro');
  });

  it('Distintos partidos NO se colapsan', async () => {
    const { enqueue, getPendingCount } = await import('@/utils/syncQueue');
    enqueue({ kind: 'updateGame', game: makeGame('g1'), queuedAt: 1 });
    enqueue({ kind: 'updateGame', game: makeGame('g2'), queuedAt: 2 });
    expect(getPendingCount()).toBe(2);
  });

  it('flushQueue al reconectar envía las operaciones y vacía la cola', async () => {
    const { enqueue, flushQueue, getPendingCount } = await import('@/utils/syncQueue');
    enqueue({ kind: 'updateGame', game: makeGame('g1'), queuedAt: 1 });
    enqueue({
      kind: 'insertGame',
      game: makeGame('g2'),
      clubId: 'club1',
      userId: 'user1',
      queuedAt: 2,
    });
    expect(getPendingCount()).toBe(2);

    await flushQueue();

    expect(updateMock).toHaveBeenCalledTimes(1);
    expect(insertMock).toHaveBeenCalledTimes(1);
    expect(getPendingCount()).toBe(0);
  });
});
