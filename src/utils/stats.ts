/**
 * Pure stat formula helpers used by the dashboard and tests.
 * Keep these free of React / Supabase imports so they can be unit-tested.
 */

export interface ShootingLine {
  /** 2-point field goals attempted */
  twoA: number;
  /** 2-point field goals made */
  twoM: number;
  /** 3-point field goals attempted */
  threeA: number;
  /** 3-point field goals made */
  threeM: number;
  /** Free throws attempted */
  ftA: number;
  /** Free throws made */
  ftM: number;
}

export const totalPoints = (l: ShootingLine): number =>
  l.twoM * 2 + l.threeM * 3 + l.ftM;

export const fga = (l: ShootingLine): number => l.twoA + l.threeA;
export const fgm = (l: ShootingLine): number => l.twoM + l.threeM;

/**
 * Effective Field Goal % rounded to integer.
 * eFG% = (FGM + 0.5 × 3PM) / FGA
 * Returns 0 when FGA = 0.
 */
export function effectiveFgPct(l: ShootingLine): number {
  const attempts = fga(l);
  if (attempts <= 0) return 0;
  const made = fgm(l);
  return Math.round(((made + 0.5 * l.threeM) / attempts) * 100);
}

/**
 * True Shooting % rounded to integer.
 * TS% = PTS / (2 × (FGA + 0.44 × FTA))
 * Returns 0 when there are no scoring attempts.
 */
export function trueShootingPct(l: ShootingLine): number {
  const denom = 2 * (fga(l) + 0.44 * l.ftA);
  if (denom <= 0) return 0;
  return Math.round((totalPoints(l) / denom) * 100);
}
