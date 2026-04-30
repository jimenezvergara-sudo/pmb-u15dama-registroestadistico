import React, { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ShieldAlert, Loader2, UserPlus, Trash2, Users } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { z } from 'zod';

interface ClubUser {
  user_id: string;
  email: string;
  full_name: string | null;
  club_id: string | null;
  role: string;
  assigned_category: string | null;
  created_at: string;
  last_sign_in_at: string | null;
  email_confirmed_at: string | null;
}

const ASSIGNABLE_ROLES = [
  { value: 'coach', label: 'Entrenador' },
  { value: 'club_staff', label: 'Staff Club' },
  { value: 'fan', label: 'Fan' },
] as const;

const CATEGORY_OPTIONS = ['U13', 'U15', 'U17', 'U19', 'Adulto'] as const;

type AssignableRole = typeof ASSIGNABLE_ROLES[number]['value'];

const roleLabels: Record<string, string> = {
  super_admin: 'Super Admin',
  system_operator: 'Operador',
  club_admin_elite: 'Admin Elite',
  club_admin_pro: 'Admin Pro',
  club_admin: 'Admin Club',
  club_staff: 'Staff Club',
  coach: 'Entrenador',
  fan: 'Fan',
};

const roleBadgeVariant = (role: string) => {
  if (role.startsWith('club_admin')) return 'default';
  if (role === 'club_staff' || role === 'coach') return 'secondary';
  return 'outline';
};

const inviteSchema = z.object({
  email: z.string().trim().email({ message: 'Email inválido' }).max(255),
  role: z.enum(['coach', 'club_staff', 'fan']),
  category: z.string().optional(),
});

const ClubStaffManager: React.FC = () => {
  const { user, roles } = useAuth();
  const [users, setUsers] = useState<ClubUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<AssignableRole>('coach');
  const [category, setCategory] = useState<string>('U15');
  const [submitting, setSubmitting] = useState(false);

  const isClubAdmin = roles.some(r =>
    ['club_admin', 'club_admin_pro', 'club_admin_elite'].includes(r)
  );

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase.rpc('club_list_users');
    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } else if (data) {
      setUsers(data as ClubUser[]);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    if (isClubAdmin) fetchUsers();
  }, [isClubAdmin, fetchUsers]);

  if (!isClubAdmin) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] px-6 text-center">
        <ShieldAlert className="w-12 h-12 text-destructive mb-4" />
        <h2 className="text-lg font-bold text-foreground mb-2">Acceso restringido</h2>
        <p className="text-sm text-muted-foreground">
          Solo los administradores del club pueden gestionar usuarios.
        </p>
      </div>
    );
  }

  const handleAssign = async () => {
    const parsed = inviteSchema.safeParse({ email, role, category });
    if (!parsed.success) {
      toast({
        title: 'Datos inválidos',
        description: parsed.error.issues[0]?.message ?? 'Revisá los campos',
        variant: 'destructive',
      });
      return;
    }
    setSubmitting(true);
    const { error } = await supabase.rpc('club_assign_user', {
      _email: parsed.data.email,
      _role: parsed.data.role,
      _category: parsed.data.category || null,
    } as any);
    setSubmitting(false);
    if (error) {
      toast({ title: 'No se pudo asignar', description: error.message, variant: 'destructive' });
      return;
    }
    toast({ title: 'Usuario asignado', description: `${parsed.data.email} → ${roleLabels[parsed.data.role]} (${parsed.data.category || 'sin categoría'})` });
    setEmail('');
    fetchUsers();
  };

  const handleRemove = async (targetId: string, targetName: string) => {
    const { error } = await supabase.rpc('club_remove_user', { _target_user_id: targetId });
    if (error) {
      toast({ title: 'No se pudo remover', description: error.message, variant: 'destructive' });
      return;
    }
    toast({ title: 'Usuario removido', description: `${targetName} ya no tiene acceso al club` });
    fetchUsers();
  };

  return (
    <div className="flex flex-col min-h-screen bg-background">
      <div className="bg-primary px-5 pt-6 pb-6 rounded-b-3xl">
        <div className="flex items-center gap-2">
          <Users className="w-5 h-5 text-primary-foreground" />
          <h1 className="text-xl font-black text-primary-foreground tracking-tight">Gestión de Staff</h1>
        </div>
        <p className="text-xs text-primary-foreground/70 font-semibold mt-0.5">
          Administrá los usuarios de tu club
        </p>
      </div>

      {/* Invite form */}
      <div className="mx-4 mt-4 p-4 rounded-xl border border-border bg-card">
        <div className="flex items-center gap-2 mb-3">
          <UserPlus className="w-4 h-4 text-primary" />
          <h2 className="text-sm font-extrabold text-foreground">Asignar usuario al club</h2>
        </div>
        <p className="text-[11px] text-muted-foreground mb-3">
          Ingresá el email de un usuario ya registrado. Será movido a tu club con el rol elegido.
        </p>
        <div className="flex flex-col gap-3">
          <div className="flex flex-col gap-1">
            <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Email</label>
            <Input
              type="email"
              placeholder="email@ejemplo.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              maxLength={255}
              className="h-10 text-sm"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Rol</label>
            <Select value={role} onValueChange={(v) => setRole(v as AssignableRole)}>
              <SelectTrigger className="h-10 text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {ASSIGNABLE_ROLES.map(r => (
                  <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
              Categoría asignada <span className="text-primary">*</span>
            </label>
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger className="h-10 text-sm border-2 border-primary/30">
                <SelectValue placeholder="Seleccionar categoría" />
              </SelectTrigger>
              <SelectContent>
                {CATEGORY_OPTIONS.map(c => (
                  <SelectItem key={c} value={c}>{c}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-[10px] text-muted-foreground mt-1">
              El usuario solo podrá editar datos de esta categoría.
            </p>
          </div>
          <Button
            onClick={handleAssign}
            disabled={submitting || !email.trim()}
            className="h-11 w-full font-bold"
          >
            {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Asignar al club'}
          </Button>
        </div>
      </div>

      {/* Users table */}
      <div className="px-4 mt-6 flex-1 mb-8">
        <h2 className="text-sm font-extrabold text-foreground mb-3">
          Usuarios del club ({users.length})
        </h2>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        ) : users.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-8">No hay usuarios en el club</p>
        ) : (
          <div className="overflow-x-auto -mx-4 px-4">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="h-8 px-2 text-[11px]">Nombre</TableHead>
                  <TableHead className="h-8 px-2 text-[11px]">Email</TableHead>
                  <TableHead className="h-8 px-2 text-[11px]">Rol</TableHead>
                  <TableHead className="h-8 px-2 text-[11px] text-right">Acción</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.map(u => {
                  const isSelf = u.user_id === user?.id;
                  return (
                    <TableRow key={`${u.user_id}-${u.role}`}>
                      <TableCell className="p-2 text-xs font-semibold">
                        {u.full_name || '—'}
                        {isSelf && <span className="ml-1 text-[10px] text-primary">(vos)</span>}
                      </TableCell>
                      <TableCell className="p-2 text-xs truncate max-w-[140px]">
                        {u.email}
                      </TableCell>
                      <TableCell className="p-2">
                        <Badge variant={roleBadgeVariant(u.role)} className="text-[10px]">
                          {roleLabels[u.role] || u.role}
                        </Badge>
                        {u.assigned_category && (
                          <span className="ml-1 text-[10px] font-bold text-primary">{u.assigned_category}</span>
                        )}
                      </TableCell>
                      <TableCell className="p-2 text-right">
                        {!isSelf && !u.role.startsWith('club_admin') && u.role !== 'super_admin' && u.role !== 'system_operator' && (
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive hover:bg-destructive/10">
                                <Trash2 className="w-3.5 h-3.5" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>¿Quitar del club?</AlertDialogTitle>
                                <AlertDialogDescription>
                                  {u.full_name || u.email} perderá acceso a todos los datos del club. La cuenta seguirá existiendo pero quedará sin club asignado.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                <AlertDialogAction
                                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                  onClick={() => handleRemove(u.user_id, u.full_name || u.email)}
                                >
                                  Quitar acceso
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </div>
    </div>
  );
};

export default ClubStaffManager;
