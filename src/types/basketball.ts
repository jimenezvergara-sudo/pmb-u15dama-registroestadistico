export interface Player {
  id: string;
  name: string;
  number: number;
  photo?: string;
}

export interface Team {
  id: string;
  clubName: string;
  city: string;
  region: string;
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
  x: number;
  y: number;
  made: boolean;
  points: 1 | 2 | 3;
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

export interface OpponentScore {
  id: string;
  points: 1 | 2 | 3;
  quarterId: QuarterId;
  timestamp: number;
}

export type GameLeg = 'ida' | 'vuelta';

export interface Game {
  id: string;
  tournamentId?: string;
  opponentTeamId?: string;
  opponentName: string;
  date: string;
  roster: Player[];
  shots: ShotEvent[];
  opponentScores: OpponentScore[];
  currentQuarter: QuarterId;
  leg?: GameLeg;
}
