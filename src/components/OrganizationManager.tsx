import React, { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Building2, Plus, Trash2, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

interface Organization {
  id: string;
  name: string;
  plan: string;
  max_staff: number;
  logo_url: string;
  created_at: string;
}

const planLabels: Record<string, string> = {
  free: 'Free (3 staff)',
  pro: 'Pro (6 staff)',
  elite: 'Elite (9 staff)',
};

const planBadge: Record<string, 'outline' | 'secondary' | 'default'> = {
  free: 'outline',
  pro: 'secondary',
  elite: 'default',
};

const OrganizationManager: React.FC = () => {
  const { roles } = useAuth();
  const [orgs, setOrgs] = useState<Organization[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [open, setOpen] = useState(false);

  // Form state
  const [orgName, setOrgName] = useState('');
  const [plan, setPlan] = useState('free');
  const [adminName, setAdminName] = useState('');
  const [adminEmail, setAdminEmail] = useState('');
  const [adminPassword, setAdminPassword] = useState('');

  const isSuperAdmin = roles.includes('super_admin');

  const fetchOrgs = async () => {
    setLoading(true);
    const { data } = await supabase.functions.invoke('manage-organization', {
      body: { action: 'list_organizations' },
    });
    if (data?.organizations) setOrgs(data.organizations);
    setLoading(false);
  };

  useEffect(() => {
    if (isSuperAdmin) fetchOrgs();
  }, [isSuperAdmin]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!orgName.trim() || !adminEmail.trim() || !adminPassword.trim() || !adminName.trim()) {
      toast.error('Completa todos los campos');
      return;
    }
    if (adminPassword.length < 6) {
      toast.error('La contraseña debe tener al menos 6 caracteres');
      return;
    }

    setCreating(true);
    const { data, error } = await supabase.functions.invoke('manage-organization', {
      body: {
        action: 'create_organization',
        name: orgName.trim(),
        plan,
        admin_name: adminName.trim(),
        admin_email: adminEmail.trim().toLowerCase(),
        admin_password: adminPassword,
      },
    });

    if (error || data?.error) {
      toast.error(data?.error || error?.message || 'Error al crear organización');
    } else {
      toast.success(`Organización "${orgName}" creada con éxito`);
      setOpen(false);
      resetForm();
      fetchOrgs();
    }
    setCreating(false);
  };

  const handleDelete = async (orgId: string, orgName: string) => {
    if (!confirm(`¿Eliminar la organización "${orgName}"? Esta acción no se puede deshacer.`)) return;
    const { data, error } = await supabase.functions.invoke('manage-organization', {
      body: { action: 'delete_organization', org_id: orgId },
    });
    if (error || data?.error) {
      toast.error(data?.error || 'Error al eliminar');
    } else {
      toast.success('Organización eliminada');
      fetchOrgs();
    }
  };

  const resetForm = () => {
    setOrgName('');
    setPlan('free');
    setAdminName('');
    setAdminEmail('');
    setAdminPassword('');
  };

  if (!isSuperAdmin) return null;

  return (
    <Card className="border-border">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-extrabold flex items-center gap-2">
            <Building2 className="w-4 h-4 text-primary" />
            Organizaciones (Clubes)
          </CardTitle>
          <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) resetForm(); }}>
            <DialogTrigger asChild>
              <Button size="sm" className="h-8 text-xs gap-1">
                <Plus className="w-3 h-3" /> Crear Club
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-sm">
              <DialogHeader>
                <DialogTitle className="text-base font-extrabold">Nuevo Club</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleCreate} className="space-y-3 mt-2">
                <div>
                  <label className="text-xs font-bold text-muted-foreground block mb-1">Nombre del Club</label>
                  <Input value={orgName} onChange={e => setOrgName(e.target.value)} placeholder="Ej: Club Deportivo XYZ" />
                </div>
                <div>
                  <label className="text-xs font-bold text-muted-foreground block mb-1">Plan</label>
                  <Select value={plan} onValueChange={setPlan}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="free">Free — 3 staff</SelectItem>
                      <SelectItem value="pro">Pro — 6 staff</SelectItem>
                      <SelectItem value="elite">Elite — 9 staff</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="border-t pt-3">
                  <p className="text-xs font-bold text-foreground mb-2">Admin del Club</p>
                  <div className="space-y-2">
                    <Input value={adminName} onChange={e => setAdminName(e.target.value)} placeholder="Nombre completo" />
                    <Input type="email" value={adminEmail} onChange={e => setAdminEmail(e.target.value)} placeholder="correo@club.com" />
                    <Input type="password" value={adminPassword} onChange={e => setAdminPassword(e.target.value)} placeholder="Contraseña (mín. 6 chars)" minLength={6} />
                  </div>
                </div>
                <Button type="submit" disabled={creating} className="w-full">
                  {creating ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Crear Club + Admin'}
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
          </div>
        ) : orgs.length === 0 ? (
          <p className="text-xs text-muted-foreground text-center py-6">No hay organizaciones creadas</p>
        ) : (
          <div className="overflow-x-auto -mx-4 px-4">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="h-8 px-2 text-[11px]">Club</TableHead>
                  <TableHead className="h-8 px-2 text-[11px]">Plan</TableHead>
                  <TableHead className="h-8 px-2 text-[11px]">Staff</TableHead>
                  <TableHead className="h-8 px-2 text-[11px]">Creado</TableHead>
                  <TableHead className="h-8 px-2 text-[11px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {orgs.map(org => (
                  <TableRow key={org.id}>
                    <TableCell className="p-2 text-xs font-semibold">{org.name}</TableCell>
                    <TableCell className="p-2">
                      <Badge variant={planBadge[org.plan] || 'outline'} className="text-[10px]">
                        {planLabels[org.plan] || org.plan}
                      </Badge>
                    </TableCell>
                    <TableCell className="p-2 text-xs">{org.max_staff}</TableCell>
                    <TableCell className="p-2 text-xs text-muted-foreground">
                      {new Date(org.created_at).toLocaleDateString()}
                    </TableCell>
                    <TableCell className="p-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
                        onClick={() => handleDelete(org.id, org.name)}
                      >
                        <Trash2 className="w-3.5 h-3.5 text-destructive" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default OrganizationManager;
