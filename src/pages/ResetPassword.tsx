import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import logoBasqest from '@/assets/logo-basqest.svg';

const ResetPassword: React.FC = () => {
  const navigate = useNavigate();
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    // Supabase parses the recovery token from the URL hash automatically
    // and emits a PASSWORD_RECOVERY event. We just need to confirm we have a session.
    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'PASSWORD_RECOVERY' || session) {
        setReady(true);
      }
    });

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) setReady(true);
    });

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
    } else {
      toast.success('Contraseña actualizada. Iniciá sesión nuevamente.');
      await supabase.auth.signOut();
      navigate('/auth');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[hsl(268,50%,10%)] px-6">
      <div className="w-full max-w-md bg-[hsl(268,40%,14%)] border border-[hsl(268,30%,22%)] rounded-2xl p-8 shadow-2xl">
        <div className="flex justify-center mb-6">
          <div className="bg-white/95 rounded-2xl p-3">
            <img src={logoBasqest} alt="BASQUEST+" className="w-16 h-16 object-contain" />
          </div>
        </div>
        <h1 className="text-white text-2xl font-bold text-center">Nueva contraseña</h1>
        <p className="text-[hsl(250,20%,65%)] text-sm text-center mt-1 mb-6">
          Define tu nueva contraseña para acceder a tu cuenta.
        </p>

        {!ready ? (
          <p className="text-center text-[hsl(250,20%,65%)] text-sm">
            Validando enlace de recuperación...
          </p>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="text-xs font-bold text-[hsl(250,20%,70%)] uppercase tracking-wider mb-1.5 block">
                Nueva contraseña
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
              {loading ? 'Guardando...' : 'Guardar contraseña'}
            </Button>
          </form>
        )}
      </div>
    </div>
  );
};

export default ResetPassword;
