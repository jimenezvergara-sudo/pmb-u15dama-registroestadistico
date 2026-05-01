/**
 * Helper de género inclusivo para BASQUEST+.
 *
 * La rama del equipo (femenino / masculino / mixto) se almacena por categoría en
 * la tabla `club_categories`. Este módulo centraliza los textos para no
 * hardcodear "jugadora" en toda la app.
 *
 * Uso:
 *   const t = getRamaTerms('masculino');
 *   t.player          // 'jugador'
 *   t.players         // 'jugadores'
 *   t.playerCap       // 'Jugador'
 *   t.playersCap      // 'Jugadores'
 *   t.athletes        // 'jugadores' | 'jugadoras' | 'deportistas'
 */

export type Rama = 'femenino' | 'masculino' | 'mixto';

export interface RamaTerms {
  rama: Rama;
  /** Singular minúscula: 'jugadora' | 'jugador' | 'deportista' */
  player: string;
  /** Plural minúscula: 'jugadoras' | 'jugadores' | 'deportistas' */
  players: string;
  /** Singular capitalizado: 'Jugadora' | 'Jugador' | 'Deportista' */
  playerCap: string;
  /** Plural capitalizado: 'Jugadoras' | 'Jugadores' | 'Deportistas' */
  playersCap: string;
  /** Artículo definido femenino/masculino/neutral: 'la' | 'el' | 'la/el' */
  the: string;
  /** Artículo plural: 'las' | 'los' | 'las/los' */
  thePl: string;
  /** Determinante "otra/otro": 'otra' | 'otro' | 'otro/a' */
  another: string;
  /** Pronombre "destacada/o" para listas de mejores: 'destacada' | 'destacado' | 'destacado/a' */
  highlighted: string;
}

const TERMS: Record<Rama, RamaTerms> = {
  femenino: {
    rama: 'femenino',
    player: 'jugadora',
    players: 'jugadoras',
    playerCap: 'Jugadora',
    playersCap: 'Jugadoras',
    the: 'la',
    thePl: 'las',
    another: 'otra',
    highlighted: 'destacada',
  },
  masculino: {
    rama: 'masculino',
    player: 'jugador',
    players: 'jugadores',
    playerCap: 'Jugador',
    playersCap: 'Jugadores',
    the: 'el',
    thePl: 'los',
    another: 'otro',
    highlighted: 'destacado',
  },
  mixto: {
    rama: 'mixto',
    player: 'deportista',
    players: 'deportistas',
    playerCap: 'Deportista',
    playersCap: 'Deportistas',
    the: 'la/el',
    thePl: 'las/los',
    another: 'otro/a',
    highlighted: 'destacado/a',
  },
};

export const getRamaTerms = (rama?: Rama | null): RamaTerms =>
  TERMS[rama ?? 'femenino'] ?? TERMS.femenino;

/**
 * Frase para inyectar en system prompts de IA. Le indica al modelo el género
 * correcto a usar en su respuesta.
 */
export const ramaPromptInstruction = (rama: Rama): string => {
  switch (rama) {
    case 'masculino':
      return 'IMPORTANTE: Este es un equipo masculino. Usa siempre "jugador/jugadores", "el equipo", masculino genérico. Nunca uses "jugadora" ni femenino.';
    case 'mixto':
      return 'IMPORTANTE: Este es un equipo mixto. Usa lenguaje neutral: "deportistas", "el equipo". Evita marcar género específico.';
    case 'femenino':
    default:
      return 'IMPORTANTE: Este es un equipo femenino. Usa siempre "jugadora/jugadoras", femenino genérico. Nunca uses "jugador" ni masculino.';
  }
};
