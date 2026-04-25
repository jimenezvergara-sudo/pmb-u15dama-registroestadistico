import React, { useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { Shield, Users, ClipboardList, Eye, ArrowLeft, ArrowRight } from 'lucide-react';
import logoBasqest from '@/assets/logo-basqest-new.png';

type RoleKey = 'admin' | 'staff' | 'coach' | 'fan';

const ROLE_INFO: { key: RoleKey; icon: typeof Shield; title: string; desc: string }[] = [
  { key: 'admin', icon: Shield, title: 'Administrador', desc: 'Gestión total del club, staff y suscripción' },
  { key: 'staff', icon: ClipboardList, title: 'Entrenador / Staff', desc: 'Registro en vivo, plantilla y estadísticas' },
  { key: 'coach', icon: Users, title: 'Cuerpo Técnico', desc: 'Análisis táctico e informes post-partido' },
  { key: 'fan', icon: Eye, title: 'Fan / Público', desc: 'Estadísticas compartidas vía enlace público' },
];

const Auth: React.FC = () => {
  const { signIn, signUp } = useAuth();
  const [selectedRole, setSelectedRole] = useState<RoleKey | null>(null);
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [loading, setLoading] = useState(false);
  const [forgotMode, setForgotMode] = useState(false);

  const role = ROLE_INFO.find(r => r.key === selectedRole);

  const handleForgotPassword = async () => {
    if (!email.trim()) {
      toast.error('Ingresa tu correo electrónico');
      return;
    }
    setLoading(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    setLoading(false);
    if (error) {
      toast.error(error.message);
    } else {
      toast.success('Te enviamos un correo con el enlace para restablecer tu contraseña.');
      setForgotMode(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    if (isLogin) {
      const { error } = await signIn(email, password);
      if (error) toast.error(error.message);
    } else {
      if (!fullName.trim()) {
        toast.error('Ingresa tu nombre completo');
        setLoading(false);
        return;
      }
      const { error } = await signUp(email, password, fullName);
      if (error) toast.error(error.message);
      else toast.success('¡Cuenta creada! Revisa tu correo para confirmar.');
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen flex flex-col lg:flex-row bg-[hsl(268,50%,10%)]">
      {/* LEFT PANEL — Brand */}
      <div className="relative lg:w-1/2 bg-gradient-to-br from-[hsl(268,76%,25%)] via-[hsl(268,76%,18%)] to-[hsl(280,70%,12%)] px-8 py-10 lg:p-14 flex flex-col justify-between overflow-hidden">
        <div className="absolute top-1/3 -left-20 w-96 h-96 bg-[hsl(45,100%,50%)] opacity-10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 right-0 w-80 h-80 bg-[hsl(280,70%,55%)] opacity-20 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10">
          <div className="inline-block bg-white/95 backdrop-blur rounded-2xl p-3 shadow-2xl">
            <img src={logoBasqest} alt="BASQUEST+" className="w-20 h-20 lg:w-24 lg:h-24 object-contain" />
          </div>
          <p className="mt-3 text-[hsl(45,100%,65%)] text-xs font-bold tracking-[0.2em] uppercase">
            Plataforma de Inteligencia Deportiva
          </p>
        </div>

        <div className="relative z-10 my-10 lg:my-0">
          <h1 className="text-white text-3xl lg:text-5xl font-black leading-tight tracking-tight">
            Estadística avanzada<br />
            <span className="text-[hsl(45,100%,65%)]">con propósito.</span>
          </h1>
          <p className="mt-4 text-[hsl(250,30%,80%)] text-base lg:text-lg max-w-md leading-relaxed">
            Registra, analiza y comparte el rendimiento de tu equipo en tiempo real.
          </p>
        </div>

        <p className="relative z-10 text-[hsl(250,20%,60%)] text-xs">© 2026 BASQUEST+ · Chile</p>
      </div>

      {/* RIGHT PANEL */}
      <div className="lg:w-1/2 flex flex-col justify-center px-6 py-10 lg:p-14 bg-[hsl(268,50%,10%)]">
        <div className="w-full max-w-md mx-auto">
          {!selectedRole ? (
            <>
              <h2 className="text-white text-2xl lg:text-3xl font-bold">Ingresa a tu cuenta</h2>
              <p className="text-[hsl(250,20%,65%)] text-sm mt-1">
                Selecciona tu tipo de acceso para continuar.
              </p>

              <div className="mt-6 space-y-3">
                {ROLE_INFO.map(({ key, icon: Icon, title, desc }) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setSelectedRole(key)}
                    className="w-full text-left bg-[hsl(268,40%,14%)] hover:bg-[hsl(268,40%,18%)] border border-[hsl(268,30%,22%)] hover:border-[hsl(45,100%,50%)]/50 rounded-2xl p-4 transition-all group flex items-center gap-4"
                  >
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[hsl(268,76%,30%)] to-[hsl(268,76%,20%)] flex items-center justify-center shrink-0 group-hover:from-[hsl(45,100%,45%)] group-hover:to-[hsl(35,100%,40%)] transition-all">
                      <Icon className="w-5 h-5 text-[hsl(45,100%,65%)] group-hover:text-[hsl(268,50%,12%)] transition-colors" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-white text-sm font-bold">{title}</p>
                      <p className="text-[hsl(250,20%,60%)] text-xs mt-0.5 leading-snug">{desc}</p>
                    </div>
                    <span className="text-[hsl(250,20%,55%)] group-hover:text-[hsl(45,100%,65%)] text-sm font-bold flex items-center gap-1 transition-colors">
                      Entrar <ArrowRight className="w-4 h-4" />
                    </span>
                  </button>
                ))}
              </div>

              <p className="text-center text-[hsl(250,15%,45%)] text-[11px] mt-6">
                Acceso seguro multi-tenant. El rol se valida en el servidor.
              </p>
            </>
          ) : (
            <>
              <button
                type="button"
                onClick={() => { setSelectedRole(null); setEmail(''); setPassword(''); setFullName(''); }}
                className="text-[hsl(250,20%,65%)] hover:text-white text-sm flex items-center gap-1.5 mb-4 transition-colors"
              >
                <ArrowLeft className="w-4 h-4" /> Cambiar tipo de acceso
              </button>

              <div className="flex items-center gap-3 mb-5">
                {role && (
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[hsl(45,100%,45%)] to-[hsl(35,100%,40%)] flex items-center justify-center shrink-0">
                    <role.icon className="w-5 h-5 text-[hsl(268,50%,12%)]" />
                  </div>
                )}
                <div>
                  <h2 className="text-white text-xl lg:text-2xl font-bold">{role?.title}</h2>
                  <p className="text-[hsl(250,20%,65%)] text-xs">{role?.desc}</p>
                </div>
              </div>

              {!forgotMode && (
                <div className="flex rounded-lg bg-[hsl(268,40%,16%)] p-1 mb-5">
                  <button
                    type="button"
                    onClick={() => setIsLogin(true)}
                    className={`flex-1 py-2 text-sm font-bold rounded-md transition-all ${
                      isLogin
                        ? 'bg-gradient-to-r from-primary to-[hsl(280,70%,55%)] text-primary-foreground shadow-lg'
                        : 'text-[hsl(250,20%,65%)] hover:text-white'
                    }`}
                  >
                    Iniciar Sesión
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsLogin(false)}
                    className={`flex-1 py-2 text-sm font-bold rounded-md transition-all ${
                      !isLogin
                        ? 'bg-gradient-to-r from-[hsl(45,100%,45%)] to-[hsl(35,100%,50%)] text-[hsl(268,50%,12%)] shadow-lg'
                        : 'text-[hsl(250,20%,65%)] hover:text-white'
                    }`}
                  >
                    Registrarse
                  </button>
                </div>
              )}

              {forgotMode ? (
                <div className="space-y-4">
                  <div>
                    <h3 className="text-white text-lg font-bold mb-1">Recuperar contraseña</h3>
                    <p className="text-[hsl(250,20%,65%)] text-xs">
                      Te enviaremos un enlace a tu correo para crear una nueva contraseña.
                    </p>
                  </div>
                  <div>
                    <label className="text-xs font-bold text-[hsl(250,20%,70%)] uppercase tracking-wider mb-1.5 block">
                      Correo Electrónico
                    </label>
                    <Input
                      type="email"
                      value={email}
                      onChange={e => setEmail(e.target.value)}
                      placeholder="tu@correo.com"
                      className="bg-[hsl(268,40%,16%)] border-[hsl(268,30%,28%)] text-white placeholder:text-[hsl(250,15%,40%)] focus-visible:ring-[hsl(45,100%,50%)]"
                    />
                  </div>
                  <Button
                    type="button"
                    onClick={handleForgotPassword}
                    disabled={loading}
                    className="w-full h-12 font-bold text-base bg-gradient-to-r from-primary to-[hsl(280,70%,55%)] hover:from-[hsl(268,76%,58%)] hover:to-[hsl(280,70%,60%)] text-primary-foreground shadow-xl shadow-primary/30"
                  >
                    {loading ? 'Enviando...' : 'Enviar enlace'}
                  </Button>
                  <button
                    type="button"
                    onClick={() => setForgotMode(false)}
                    className="w-full text-center text-[hsl(250,20%,65%)] hover:text-white text-sm transition-colors"
                  >
                    ← Volver a iniciar sesión
                  </button>
                </div>
              ) : (

              <form onSubmit={handleSubmit} className="space-y-4">
                {!isLogin && (
                  <div>
                    <label className="text-xs font-bold text-[hsl(250,20%,70%)] uppercase tracking-wider mb-1.5 block">
                      Nombre Completo
                    </label>
                    <Input
                      value={fullName}
                      onChange={e => setFullName(e.target.value)}
                      placeholder="Juan Pérez"
                      className="bg-[hsl(268,40%,16%)] border-[hsl(268,30%,28%)] text-white placeholder:text-[hsl(250,15%,40%)] focus-visible:ring-[hsl(45,100%,50%)]"
                    />
                  </div>
                )}

                <div>
                  <label className="text-xs font-bold text-[hsl(250,20%,70%)] uppercase tracking-wider mb-1.5 block">
                    Correo Electrónico
                  </label>
                  <Input
                    type="email"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    placeholder="tu@correo.com"
                    required
                    className="bg-[hsl(268,40%,16%)] border-[hsl(268,30%,28%)] text-white placeholder:text-[hsl(250,15%,40%)] focus-visible:ring-[hsl(45,100%,50%)]"
                  />
                </div>

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

                <Button
                  type="submit"
                  disabled={loading}
                  className={`w-full h-12 font-bold text-base shadow-xl transition-all ${
                    isLogin
                      ? 'bg-gradient-to-r from-primary to-[hsl(280,70%,55%)] hover:from-[hsl(268,76%,58%)] hover:to-[hsl(280,70%,60%)] text-primary-foreground shadow-primary/30'
                      : 'bg-gradient-to-r from-[hsl(45,100%,45%)] to-[hsl(35,100%,50%)] hover:from-[hsl(45,100%,50%)] hover:to-[hsl(35,100%,55%)] text-[hsl(268,50%,12%)] shadow-[hsl(45,100%,50%)]/30'
                  }`}
                >
                  {loading ? '...' : isLogin ? 'Entrar →' : 'Crear Cuenta →'}
                </Button>
              </form>

              <p className="text-center text-[hsl(250,15%,45%)] text-[11px] mt-6">
                Tu rol real se valida en el servidor tras iniciar sesión.
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default Auth;
