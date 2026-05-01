import { describe, it, expect } from 'vitest';
import {
  effectiveFgPct,
  trueShootingPct,
  totalPoints,
  fga,
  type ShootingLine,
} from '@/utils/stats';

describe('Fórmulas de estadísticas avanzadas', () => {
  it('eFG% devuelve 0 cuando no hay intentos de campo', () => {
    const line: ShootingLine = { twoA: 0, twoM: 0, threeA: 0, threeM: 0, ftA: 5, ftM: 3 };
    expect(effectiveFgPct(line)).toBe(0);
  });

  it('TS% devuelve 0 cuando no hay intentos en absoluto', () => {
    const line: ShootingLine = { twoA: 0, twoM: 0, threeA: 0, threeM: 0, ftA: 0, ftM: 0 };
    expect(trueShootingPct(line)).toBe(0);
  });

  it('Sólo tiros libres: eFG% sigue siendo 0 (no hay intentos de campo)', () => {
    const line: ShootingLine = { twoA: 0, twoM: 0, threeA: 0, threeM: 0, ftA: 10, ftM: 8 };
    expect(effectiveFgPct(line)).toBe(0);
    // TS = 8 / (2 * (0 + 0.44 * 10)) = 8 / 8.8 ≈ 91%
    expect(trueShootingPct(line)).toBe(91);
  });

  it('Sólo triples: eFG% pondera correctamente los 3PM', () => {
    // 5/10 triples → eFG = (5 + 0.5*5) / 10 = 0.75 = 75%
    const line: ShootingLine = { twoA: 0, twoM: 0, threeA: 10, threeM: 5, ftA: 0, ftM: 0 };
    expect(effectiveFgPct(line)).toBe(75);
  });

  it('Jugadora sin puntos: TS% = 0', () => {
    const line: ShootingLine = { twoA: 5, twoM: 0, threeA: 3, threeM: 0, ftA: 2, ftM: 0 };
    expect(totalPoints(line)).toBe(0);
    expect(trueShootingPct(line)).toBe(0);
  });

  it('Caso normal con dobles, triples y libres', () => {
    // 4/8 dobles, 2/5 triples, 3/4 TL → 8 + 6 + 3 = 17 pts, FGA=13
    const line: ShootingLine = { twoA: 8, twoM: 4, threeA: 5, threeM: 2, ftA: 4, ftM: 3 };
    expect(totalPoints(line)).toBe(17);
    expect(fga(line)).toBe(13);
    // eFG = (6 + 0.5*2) / 13 = 7/13 ≈ 53.84% → 54
    expect(effectiveFgPct(line)).toBe(54);
    // TS = 17 / (2 * (13 + 0.44*4)) = 17 / 29.52 ≈ 57.59% → 58
    expect(trueShootingPct(line)).toBe(58);
  });

  it('Box score real de Laura Jiménez (15/59 TC, 2/19 3PT, 13/23 TL, 45 pts)', () => {
    // TC totales 15/59 incluyen los triples → dobles = 13/40
    const line: ShootingLine = {
      twoA: 40, twoM: 13,
      threeA: 19, threeM: 2,
      ftA: 23, ftM: 13,
    };
    expect(totalPoints(line)).toBe(45);
    expect(fga(line)).toBe(59);
    // eFG = (15 + 0.5*2) / 59 = 16/59 ≈ 27.1% → 27
    // (Note: 24% in spec assumes a different convention; we validate the formula
    // against the canonical NBA definition used in Dashboard.tsx.)
    expect(effectiveFgPct(line)).toBe(27);
    // TS = 45 / (2 * (59 + 0.44*23)) = 45 / 138.24 ≈ 32.55% → 33
    expect(trueShootingPct(line)).toBe(33);
  });
});
