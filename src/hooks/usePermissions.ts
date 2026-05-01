import { useAuth } from '@/context/AuthContext';
import type { Enums } from '@/integrations/supabase/types';

type Role = Enums<'app_role'>;

const GLOBAL_ROLES: Role[] = ['super_admin', 'system_operator'];
const CLUB_ADMIN_ROLES: Role[] = ['club_admin', 'club_admin_pro', 'club_admin_elite'];
const EDITOR_ROLES: Role[] = [...CLUB_ADMIN_ROLES, 'coach', 'club_staff'];

/**
 * Centralized permission booleans. Add a new role here once and the entire
 * frontend updates. Use the `effectiveRoles` (respects super_admin impersonation).
 *
 * RLS in the database is the source of truth — these flags only drive UI gating.
 */
export interface Permissions {
  isFan: boolean;
  isCoachOrStaff: boolean;
  isClubAdmin: boolean;
  isGlobalRole: boolean;
  /** Can create/edit/delete games (within their category if restricted). */
  canEditGames: boolean;
  /** Can edit roster (players). */
  canEditRoster: boolean;
  /** Can edit rival teams. */
  canEditTeams: boolean;
  /** Can edit tournaments. */
  canEditTournaments: boolean;
  /** Can run AI tactical analysis (consumes credits). */
  canRunAI: boolean;
  /** Can see the global Admin panel. */
  canViewAdmin: boolean;
  /** Can see the club Staff manager. */
  canViewStaffList: boolean;
}

export function usePermissions(): Permissions {
  const { effectiveRoles } = useAuth();

  const has = (list: Role[]) => effectiveRoles.some(r => list.includes(r));

  const isGlobalRole = has(GLOBAL_ROLES);
  const isClubAdmin = has(CLUB_ADMIN_ROLES);
  const isCoachOrStaff = has(['coach', 'club_staff']);
  // Fan = either explicit fan role OR an authenticated user with no editor role at all.
  const hasAnyEditorRole = isGlobalRole || isClubAdmin || isCoachOrStaff;
  const isFan = effectiveRoles.includes('fan') || (effectiveRoles.length > 0 && !hasAnyEditorRole);

  const canEdit = isGlobalRole || isClubAdmin || isCoachOrStaff;

  return {
    isFan,
    isCoachOrStaff,
    isClubAdmin,
    isGlobalRole,
    canEditGames: canEdit && !isFan,
    canEditRoster: canEdit && !isFan,
    canEditTeams: canEdit && !isFan,
    canEditTournaments: canEdit && !isFan,
    canRunAI: canEdit && !isFan,
    canViewAdmin: isGlobalRole,
    canViewStaffList: isClubAdmin || isGlobalRole,
  };
}
