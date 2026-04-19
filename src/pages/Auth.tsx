import React, { useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { Shield, Users, ClipboardList, Eye } from 'lucide-react';
import logoBasqest from '@/assets/logo-basqest-new.png';

const ROLE_INFO = [
  {
    icon: Shield,
    title: 'Administrador',
    desc: 'Gestión total del club, staff y suscripción',
  },
  {
    icon: ClipboardList,
    title: 'Entrenador / Staff',
    desc: 'Registro en vivo, plantilla y estadísticas',
  },
  {
    icon: Users,
    title: 'Cuerpo Técnico',
    desc: 'Análisis táctico e informes post-partido',
  },
  {
    icon: Eye,
    title: 'Fan / Público',
    desc: 'Estadísticas compartidas vía enlace público',
  },
];

const Auth: React.FC = () => {
  const { signIn, signUp } = useAuth();
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [loading, setLoading] = useState(false);

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
        {/* Gold glow */}
        <div className="absolute top-1/3 -left-20 w-96 h-96 bg-[hsl(45,100%,50%)] opacity-10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 right-0 w-80 h-80 bg-[hsl(280,70%,55%)] opacity-20 rounded-full blur-3xl pointer-events-none" />

        {/* Logo */}
        <div className="relative z-10">
          <div className="inline-block bg-white/95 backdrop-blur rounded-2xl p-3 shadow-2xl">
            <img src={logoBasqest} alt="BASQUEST+" className="w-20 h-20 lg:w-24 lg:h-24 object-contain" />
          </div>
          <p className="mt-3 text-[hsl(45,100%,65%)] text-xs font-bold tracking-[0.2em] uppercase">
            Plataforma de Inteligencia Deportiva
          </p>
        </div>

        {/* Tagline */}
        <div className="relative z-10 my-10 lg:my-0">
          <h1 className="text-white text-3xl lg:text-5xl font-black leading-tight tracking-tight">
            Estadística avanzada<br />
            <span className="text-[hsl(45,100%,65%)]">con propósito.</span>
          </h1>
          <p className="mt-4 text-[hsl(250,30%,80%)] text-base lg:text-lg max-w-md leading-relaxed">
            Registra, analiza y comparte el rendimiento de tu equipo en tiempo real.
          </p>
        </div>

        {/* Footer */}
        <p className="relative z-10 text-[hsl(250,20%,60%)] text-xs">
          © 2026 BASQUEST+ · Chile
        </p>
      </div>

      {/* RIGHT PANEL — Auth */}
      <div className="lg:w-1/2 flex flex-col justify-center px-6 py-10 lg:p-14 bg-[hsl(268,50%,10%)]">
        <div className="w-full max-w-md mx-auto">
          <h2 className="text-white text-2xl lg:text-3xl font-bold">
            {isLogin ? 'Ingresa a tu cuenta' : 'Crea tu cuenta'}
          </h2>
          <p className="text-[hsl(250,20%,65%)] text-sm mt-1">
            {isLogin
              ? 'Tu acceso se adapta automáticamente según tu rol asignado.'
              : 'Tu administrador de club te asignará el rol correspondiente.'}
          </p>

          {/* Tabs */}
          <div className="flex rounded-lg bg-[hsl(268,40%,16%)] p-1 mt-6 mb-5">
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

          {/* Form */}
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

          {/* Roles preview */}
          <div className="mt-8">
            <p className="text-[hsl(250,20%,55%)] text-xs uppercase tracking-wider font-bold mb-3">
              Tipos de acceso
            </p>
            <div className="grid grid-cols-2 gap-2">
              {ROLE_INFO.map(({ icon: Icon, title, desc }) => (
                <div
                  key={title}
                  className="bg-[hsl(268,40%,14%)] border border-[hsl(268,30%,22%)] rounded-xl p-3 hover:border-[hsl(45,100%,50%)]/40 transition-colors"
                >
                  <div className="w-8 h-8 rounded-lg bg-[hsl(268,76%,25%)] flex items-center justify-center mb-2">
                    <Icon className="w-4 h-4 text-[hsl(45,100%,65%)]" />
                  </div>
                  <p className="text-white text-xs font-bold leading-tight">{title}</p>
                  <p className="text-[hsl(250,20%,55%)] text-[10px] mt-0.5 leading-snug">{desc}</p>
                </div>
              ))}
            </div>
          </div>

          <p className="text-center text-[hsl(250,15%,45%)] text-[11px] mt-6">
            Acceso seguro multi-tenant. El rol se valida en el servidor.
          </p>
        </div>
      </div>
    </div>
  );
};

export default Auth;
