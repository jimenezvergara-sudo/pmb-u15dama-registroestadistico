import { describe, it, expect, vi } from 'vitest';
import { renderHook } from '@testing-library/react';
import type { Enums } from '@/integrations/supabase/types';

type Role = Enums<'app_role'>;

// Mock the AuthContext so we can drive `effectiveRoles` per test.
let mockRoles: Role[] = [];
let mockAssignedCategory: string | null = null;
vi.mock('@/context/AuthContext', () => ({
  useAuth: () => ({
    effectiveRoles: mockRoles,
    assignedCategory: mockAssignedCategory,
    canModifyAnyCategory: mockAssignedCategory === null,
    canModifyCategory: (c?: string | null) =>
      mockAssignedCategory === null ? true : c === mockAssignedCategory,
  }),
}));

import { usePermissions } from '@/hooks/usePermissions';

const setUser = (roles: Role[], category: string | null = null) => {
  mockRoles = roles;
  mockAssignedCategory = category;
};

describe('usePermissions: fan', () => {
  it('Fan no puede editar partidos ni correr IA', () => {
    setUser(['fan']);
    const { result } = renderHook(() => usePermissions());
    expect(result.current.isFan).toBe(true);
    expect(result.current.canEditGames).toBe(false);
    expect(result.current.canEditRoster).toBe(false);
    expect(result.current.canRunAI).toBe(false);
    expect(result.current.canViewAdmin).toBe(false);
  });
});

describe('usePermissions: coach con categoría asignada', () => {
  it('Puede editar partidos en general (UI), gating por categoría se hace aparte', () => {
    setUser(['coach'], 'U15');
    const { result } = renderHook(() => usePermissions());
    expect(result.current.isCoachOrStaff).toBe(true);
    expect(result.current.canEditGames).toBe(true);
    expect(result.current.canEditRoster).toBe(true);
    expect(result.current.canRunAI).toBe(true);
    expect(result.current.canViewAdmin).toBe(false);
    expect(result.current.canViewStaffList).toBe(false);
  });
});

describe('usePermissions: club_admin_elite', () => {
  it('Tiene todos los permisos de edición y ve el staff', () => {
    setUser(['club_admin_elite']);
    const { result } = renderHook(() => usePermissions());
    expect(result.current.isClubAdmin).toBe(true);
    expect(result.current.canEditGames).toBe(true);
    expect(result.current.canEditRoster).toBe(true);
    expect(result.current.canEditTeams).toBe(true);
    expect(result.current.canEditTournaments).toBe(true);
    expect(result.current.canRunAI).toBe(true);
    expect(result.current.canViewStaffList).toBe(true);
    expect(result.current.canViewAdmin).toBe(false); // only super_admin
  });
});

describe('usePermissions: super_admin', () => {
  it('Tiene todos los flags en true', () => {
    setUser(['super_admin']);
    const { result } = renderHook(() => usePermissions());
    expect(result.current.isGlobalRole).toBe(true);
    expect(result.current.canEditGames).toBe(true);
    expect(result.current.canRunAI).toBe(true);
    expect(result.current.canViewAdmin).toBe(true);
    expect(result.current.canViewStaffList).toBe(true);
  });
});
