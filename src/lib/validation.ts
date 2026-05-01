import { z } from 'zod';
import { CATEGORIES } from '@/types/basketball';

/**
 * Zod schemas centralizados para los formularios críticos de BASQUEST+.
 * Todos los mensajes están en español.
 */

// ==========================================================================
// Plantilla — agregar/editar jugadora
// ==========================================================================

export const playerSchema = z.object({
  firstName: z
    .string()
    .trim()
    .min(2, 'El nombre debe tener al menos 2 caracteres')
    .max(40, 'El nombre no puede superar 40 caracteres'),
  lastName: z
    .string()
    .trim()
    .min(2, 'El apellido debe tener al menos 2 caracteres')
    .max(40, 'El apellido no puede superar 40 caracteres'),
  number: z
    .number({ invalid_type_error: 'Ingresa un número válido' })
    .int('El número debe ser entero')
    .min(0, 'El número no puede ser negativo')
    .max(99, 'El número máximo de camiseta es 99'),
});

export type PlayerInput = z.infer<typeof playerSchema>;

// ==========================================================================
// Equipo rival (NewOpponent)
// ==========================================================================

export const opponentTeamSchema = z.object({
  clubName: z
    .string()
    .trim()
    .min(2, 'El nombre del club debe tener al menos 2 caracteres')
    .max(60, 'El nombre del club no puede superar 60 caracteres'),
  city: z
    .string()
    .trim()
    .max(40, 'La ciudad no puede superar 40 caracteres')
    .optional()
    .or(z.literal('')),
  region: z
    .string()
    .trim()
    .max(40, 'La región no puede superar 40 caracteres')
    .optional()
    .or(z.literal('')),
});

export type OpponentTeamInput = z.infer<typeof opponentTeamSchema>;

// ==========================================================================
// Torneo (NewTournament)
// ==========================================================================

export const tournamentSchema = z.object({
  name: z
    .string()
    .trim()
    .min(3, 'El nombre del torneo debe tener al menos 3 caracteres')
    .max(60, 'El nombre del torneo no puede superar 60 caracteres'),
});

export type TournamentInput = z.infer<typeof tournamentSchema>;

// ==========================================================================
// Nuevo partido (NewGame) — rival, categoría, leg, local/visita
// ==========================================================================

export const newGameSchema = z.object({
  opponentName: z
    .string()
    .trim()
    .min(2, 'El nombre del rival debe tener al menos 2 caracteres')
    .max(60, 'El nombre del rival no puede superar 60 caracteres'),
  category: z.enum(CATEGORIES as [string, ...string[]], {
    errorMap: () => ({ message: 'Selecciona una categoría válida' }),
  }).optional(),
  leg: z.enum(['ida', 'vuelta']).optional(),
  isHome: z.boolean().optional(),
  rosterSize: z
    .number()
    .int()
    .min(1, 'Selecciona al menos un jugador/a para el roster'),
});

export type NewGameInput = z.infer<typeof newGameSchema>;

// ==========================================================================
// Helper: convierte ZodError en un mapa { campo -> mensaje }
// ==========================================================================

export function zodErrorsToMap(error: z.ZodError): Record<string, string> {
  const map: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = issue.path.join('.') || '_root';
    if (!map[key]) map[key] = issue.message;
  }
  return map;
}
