export interface Player {
  id: string;
  name: string;
  number: number;
  photo?: string;
}

export interface Tournament {
  id: string;
  name: string;
  date: string;
}

export interface ShotEvent {
  id: string;
  playerId: string;
  quarterId: QuarterId;
  x: number; // 0-100 percentage on court
  y: number; // 0-100 percentage on court
  made: boolean;
  points: 1 | 2 | 3; // FT, 2pt, 3pt
  timestamp: number;
}

export type QuarterId = 'Q1' | 'Q2' | 'Q3' | 'Q4' | 'OT1' | 'OT2' | 'OT3';

export const QUARTER_LABELS: Record<QuarterId, string> = {
  Q1: '1º',
  Q2: '2º',
  Q3: '3º',
  Q4: '4º',
  OT1: 'OT1',
  OT2: 'OT2',
  OT3: 'OT3',
};

export interface Game {
  id: string;
  tournamentId?: string;
  opponentName: string;
  date: string;
  roster: Player[];
  shots: ShotEvent[];
  currentQuarter: QuarterId;
}
