import React, { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ShieldAlert, Loader2, Eye, EyeOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Constants } from '@/integrations/supabase/types';
import type { Enums } from '@/integrations/supabase/types';

interface AdminUser {
  user_id: string;
  email: string;
  full_name: string | null;
  club_id: string | null;
  role: string;
  created_at: string;
  last_sign_in_at: string | null;
  email_confirmed_at: string | null;
}

const roleBadgeVariant = (role: string) => {
  switch (role) {
    case 'super_admin': return 'destructive';
    case 'system_operator': return 'destructive';
    case 'club_admin_elite': return 'default';
    case 'club_admin_pro': return 'default';
    case 'club_staff': return 'secondary';
    case 'fan': return 'outline';
    default: return 'outline';
  }
};

const roleLabels: Record<string, string> = {
  super_admin: 'Super Admin',
  system_operator: 'Operador Sistema',
  club_admin_elite: 'Admin Elite',
  club_admin_pro: 'Admin Pro',
  club_staff: 'Staff Club',
  fan: 'Fan',
  coach: 'Entrenador',
  club_admin: 'Admin Club',
};

const AdminPanel: React.FC = () => {
  const { roles, impersonatedRole, setImpersonatedRole } = useAuth();
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);

  const isGlobalRole = roles.includes('super_admin') || roles.includes('system_operator');
  const isSuperAdmin = roles.includes('super_admin');

  useEffect(() => {
    if (!isGlobalRole) return;
    const fetchUsers = async () => {
      setLoading(true);
      const { data, error } = await supabase.rpc('admin_list_users');
      if (!error && data) setUsers(data as AdminUser[]);
      setLoading(false);
    };
    fetchUsers();
  }, [isGlobalRole]);

  if (!isGlobalRole) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] px-6 text-center">
        <ShieldAlert className="w-12 h-12 text-destructive mb-4" />
        <h2 className="text-lg font-bold text-foreground mb-2">Acceso restringido</h2>
        <p className="text-sm text-muted-foreground">
          Solo los super administradores pueden acceder a este panel.
        </p>
      </div>
    );
  }

  const clientRoles = Constants.public.Enums.app_role.filter(
    r => !['super_admin', 'system_operator'].includes(r)
  );

  return (
    <div className="flex flex-col min-h-screen bg-background">
      <div className="bg-destructive px-5 pt-6 pb-6 rounded-b-3xl">
        <h1 className="text-xl font-black text-destructive-foreground tracking-tight">Panel de Administración</h1>
        <p className="text-xs text-destructive-foreground/60 font-semibold mt-0.5">
          Gestión de usuarios y roles
        </p>
      </div>

      {/* Impersonation bar — super_admin only */}
      {isSuperAdmin && (
        <div className="mx-4 mt-4 p-3 rounded-xl border border-border bg-muted/50">
          <div className="flex items-center gap-2 mb-2">
            {impersonatedRole ? (
              <Eye className="w-4 h-4 text-primary" />
            ) : (
              <EyeOff className="w-4 h-4 text-muted-foreground" />
            )}
            <span className="text-xs font-bold text-foreground">Ver como otro rol</span>
          </div>
          <div className="flex items-center gap-2">
            <Select
              value={impersonatedRole ?? 'none'}
              onValueChange={(v) => setImpersonatedRole(v === 'none' ? null : v as Enums<'app_role'>)}
            >
              <SelectTrigger className="flex-1 h-9 text-xs">
                <SelectValue placeholder="Seleccionar rol" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">
                  <span className="font-semibold">Mi rol real (Super Admin)</span>
                </SelectItem>
                {clientRoles.map(r => (
                  <SelectItem key={r} value={r}>
                    {roleLabels[r] || r}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {impersonatedRole && (
              <Button
                variant="outline"
                size="sm"
                className="text-xs h-9"
                onClick={() => setImpersonatedRole(null)}
              >
                Restaurar
              </Button>
            )}
          </div>
          {impersonatedRole && (
            <p className="text-[10px] text-primary font-semibold mt-2">
              👁 Estás viendo la app como: <span className="font-black">{roleLabels[impersonatedRole] || impersonatedRole}</span>
            </p>
          )}
        </div>
      )}

      <div className="px-4 mt-4 flex-1">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-extrabold text-foreground">
            Usuarios registrados ({users.length})
          </h2>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        ) : users.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-8">No hay usuarios registrados</p>
        ) : (
          <div className="overflow-x-auto -mx-4 px-4">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="h-8 px-2 text-[11px]">Nombre</TableHead>
                  <TableHead className="h-8 px-2 text-[11px]">Email</TableHead>
                  <TableHead className="h-8 px-2 text-[11px]">Rol</TableHead>
                  <TableHead className="h-8 px-2 text-[11px]">Verificado</TableHead>
                  <TableHead className="h-8 px-2 text-[11px]">Último acceso</TableHead>
                  <TableHead className="h-8 px-2 text-[11px]">Registro</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.map(u => (
                  <TableRow key={`${u.user_id}-${u.role}`}>
                    <TableCell className="p-2 text-xs font-semibold">
                      {u.full_name || '—'}
                    </TableCell>
                    <TableCell className="p-2 text-xs truncate max-w-[140px]">
                      {u.email}
                    </TableCell>
                    <TableCell className="p-2">
                      <Badge variant={roleBadgeVariant(u.role)} className="text-[10px]">
                        {roleLabels[u.role] || u.role}
                      </Badge>
                    </TableCell>
                    <TableCell className="p-2 text-xs">
                      {u.email_confirmed_at ? '✅' : '❌'}
                    </TableCell>
                    <TableCell className="p-2 text-xs text-muted-foreground">
                      {u.last_sign_in_at
                        ? new Date(u.last_sign_in_at).toLocaleDateString()
                        : '—'}
                    </TableCell>
                    <TableCell className="p-2 text-xs text-muted-foreground">
                      {new Date(u.created_at).toLocaleDateString()}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminPanel;
