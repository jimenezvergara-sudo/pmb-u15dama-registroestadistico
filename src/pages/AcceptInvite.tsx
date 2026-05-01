import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import logoBasqest from '@/assets/logo-basqest.png';

const ROLE_LABELS: Record<string, string> = {
  coach: 'Entrenador',
  club_staff: 'Staff Club',
  fan: 'Fan',
  club_admin: 'Admin Club',
  club_admin_pro: 'Admin Pro',
  club_admin_elite: 'Admin Elite',
};

const AcceptInvite: React.FC = () => {
  const navigate = useNavigate();
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);
  const [ready, setReady] = useState(false);
  const [meta, setMeta] = useState<{
    role?: string;
    category?: string;
    invitedBy?: string;
    clubName?: string;
    email?: string;
  }>({});

  useEffect(() => {
    const apply = (session: any) => {
      if (!session?.user) return;
      setReady(true);
      const m = session.user.user_metadata || {};
      setMeta({
        role: m.invited_role,
        category: m.invited_category,
        invitedBy: m.invited_by_name,
        clubName: m.club_name,
        email: session.user.email,
      });
    };

    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => apply(session));
    supabase.auth.getSession().then(({ data: { session } }) => apply(session));
    return () => sub.subscription.unsubscribe();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 6) {
      toast.error('La contraseña debe tener al menos 6 caracteres');
      return;
    }
    if (password !== confirm) {
      toast.error('Las contraseñas no coinciden');
      return;
    }
    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password });
    setLoading(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success('¡Listo! Bienvenido a BASQUEST+');
    navigate('/');
  };

  const roleLabel = meta.role ? (ROLE_LABELS[meta.role] || meta.role) : '';
  const clubName = meta.clubName || 'tu club';

  return (
    <div className="min-h-screen relative flex items-center justify-center bg-[hsl(268,50%,10%)] px-6 py-10">
      <div className="w-full max-w-md bg-[hsl(268,40%,14%)] border border-[hsl(268,30%,22%)] rounded-2xl p-8 shadow-2xl">
        <div className="flex justify-center mb-5">
          <div className="bg-white/95 rounded-2xl p-3">
            <img src={logoBasqest} alt="BASQUEST+" className="w-16 h-16 object-contain" />
          </div>
        </div>

        {!ready ? (
          <p className="text-center text-[hsl(250,20%,65%)] text-sm">
            Validando tu invitación...
          </p>
        ) : (
          <>
            <h1 className="text-white text-2xl font-extrabold text-center leading-tight">
              ¡Bienvenido a {clubName}!
            </h1>
            <p className="text-[hsl(250,20%,72%)] text-sm text-center mt-2">
              {meta.invitedBy ? `${meta.invitedBy} te invitó` : 'Te invitaron'}
              {roleLabel && <> a unirte como <span className="text-[hsl(45,100%,60%)] font-bold">{roleLabel}</span></>}
              {meta.category && <> en <span className="text-[hsl(45,100%,60%)] font-bold">{meta.category}</span></>}.
            </p>
            {meta.email && (
              <p className="text-[hsl(250,20%,55%)] text-xs text-center mt-1 mb-5">{meta.email}</p>
            )}

            <p className="text-[hsl(250,20%,72%)] text-xs text-center mb-5">
              Definí tu contraseña para acceder a las estadísticas de tu categoría.
            </p>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="text-xs font-bold text-[hsl(250,20%,70%)] uppercase tracking-wider mb-1.5 block">
                  Contraseña
                </label>
                <Input
                  type="password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  minLength={6}
                  className="bg-[hsl(268,40%,16%)] border-[hsl(268,30%,28%)] text-white placeholder:text-[hsl(250,15%,40%)] focus-visible:ring-[hsl(45,100%,50%)]"
                />
              </div>
              <div>
                <label className="text-xs font-bold text-[hsl(250,20%,70%)] uppercase tracking-wider mb-1.5 block">
                  Repetir contraseña
                </label>
                <Input
                  type="password"
                  value={confirm}
                  onChange={e => setConfirm(e.target.value)}
                  placeholder="••••••••"
                  required
                  minLength={6}
                  className="bg-[hsl(268,40%,16%)] border-[hsl(268,30%,28%)] text-white placeholder:text-[hsl(250,15%,40%)] focus-visible:ring-[hsl(45,100%,50%)]"
                />
              </div>
              <Button
                type="submit"
                disabled={loading}
                className="w-full h-12 font-bold text-base bg-gradient-to-r from-primary to-[hsl(280,70%,55%)] hover:from-[hsl(268,76%,58%)] hover:to-[hsl(280,70%,60%)] text-primary-foreground shadow-xl shadow-primary/30"
              >
                {loading ? 'Guardando...' : 'Aceptar invitación'}
              </Button>
            </form>
          </>
        )}
      </div>
    </div>
  );
};

export default AcceptInvite;
