import { describe, it, expect } from 'vitest';
import type { Game, Player } from '@/types/basketball';
import {
  applyRecordShot,
  applyUndoLastShot,
  applyRecordSubstitution,
  pointsForPlayer,
} from '@/utils/gameReducers';

const roster: Player[] = [
  { id: 'p1', name: 'Laura Jiménez', number: 7 },
  { id: 'p2', name: 'María Soto', number: 9 },
  { id: 'p3', name: 'Camila Rojas', number: 12 },
  { id: 'p4', name: 'Sofía Vera', number: 4 },
  { id: 'p5', name: 'Ana López', number: 5 },
  { id: 'p6', name: 'Banca Uno', number: 11 },
];

const baseGame = (): Game => ({
  id: 'g1',
  opponentName: 'Rival FC',
  date: '2026-05-01',
  roster,
  shots: [],
  opponentScores: [],
  actions: [],
  substitutions: [],
  currentQuarter: 'Q1',
  category: 'U15',
  onCourtPlayerIds: ['p1', 'p2', 'p3', 'p4', 'p5'],
  courtTimeMs: {},
});

describe('Reducer: recordShot', () => {
  it('Agrega un tiro de 2 puntos anotado y suma los puntos correctos', () => {
    const g = applyRecordShot(baseGame(), { playerId: 'p1', x: 50, y: 50, made: true, points: 2 });
    expect(g.shots).toHaveLength(1);
    expect(g.shots[0].made).toBe(true);
    expect(g.shots[0].points).toBe(2);
    expect(g.shots[0].quarterId).toBe('Q1');
    expect(pointsForPlayer(g, 'p1')).toBe(2);
  });

  it('Agrega un triple anotado (3 pts)', () => {
    const g = applyRecordShot(baseGame(), { playerId: 'p2', x: 10, y: 90, made: true, points: 3 });
    expect(pointsForPlayer(g, 'p2')).toBe(3);
  });

  it('Tiro libre fallado no suma puntos', () => {
    const g = applyRecordShot(baseGame(), { playerId: 'p1', x: 0, y: 0, made: false, points: 1 });
    expect(g.shots[0].made).toBe(false);
    expect(pointsForPlayer(g, 'p1')).toBe(0);
  });

  it('Tiros acumulados: dos dobles + un triple = 7 pts', () => {
    let g = baseGame();
    g = applyRecordShot(g, { playerId: 'p1', x: 1, y: 1, made: true, points: 2 });
    g = applyRecordShot(g, { playerId: 'p1', x: 2, y: 2, made: true, points: 2 });
    g = applyRecordShot(g, { playerId: 'p1', x: 3, y: 3, made: true, points: 3 });
    expect(g.shots).toHaveLength(3);
    expect(pointsForPlayer(g, 'p1')).toBe(7);
  });
});

describe('Reducer: undoLastShot', () => {
  it('Elimina el último tiro y resta sus puntos', () => {
    let g = baseGame();
    g = applyRecordShot(g, { playerId: 'p1', x: 1, y: 1, made: true, points: 2 });
    g = applyRecordShot(g, { playerId: 'p1', x: 2, y: 2, made: true, points: 3 });
    expect(pointsForPlayer(g, 'p1')).toBe(5);

    g = applyUndoLastShot(g);
    expect(g.shots).toHaveLength(1);
    expect(pointsForPlayer(g, 'p1')).toBe(2);
  });

  it('Si no hay tiros, no cambia el estado', () => {
    const g = baseGame();
    const after = applyUndoLastShot(g);
    expect(after.shots).toEqual([]);
  });
});

describe('Reducer: recordSubstitution', () => {
  it('Intercambia jugadora en cancha: sale p1, entra p6', () => {
    const g = applyRecordSubstitution(baseGame(), 'p6', 'p1');
    expect(g.onCourtPlayerIds).not.toContain('p1');
    expect(g.onCourtPlayerIds).toContain('p6');
    expect(g.onCourtPlayerIds).toHaveLength(5);
    expect(g.substitutions).toHaveLength(1);
    expect(g.substitutions[0].playerIn).toBe('p6');
    expect(g.substitutions[0].playerOut).toBe('p1');
    expect(g.substitutions[0].quarterId).toBe('Q1');
  });

  it('Mantiene el orden de las otras jugadoras en cancha', () => {
    const g = applyRecordSubstitution(baseGame(), 'p6', 'p3');
    // p1, p2, p4, p5 deben seguir; p3 fuera; p6 al final
    expect(g.onCourtPlayerIds.filter(id => id !== 'p6')).toEqual(['p1', 'p2', 'p4', 'p5']);
  });
});
