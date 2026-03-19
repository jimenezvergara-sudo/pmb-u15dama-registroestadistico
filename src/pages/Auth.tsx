import React, { useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { toast } from 'sonner';
import logoBasqest from '@/assets/logo-basqest.png';

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
      if (error) {
        toast.error(error.message);
      }
    } else {
      if (!fullName.trim()) {
        toast.error('Ingresa tu nombre completo');
        setLoading(false);
        return;
      }
      const { error } = await signUp(email, password, fullName);
      if (error) {
        toast.error(error.message);
      } else {
        toast.success('¡Cuenta creada! Revisa tu correo para confirmar.');
      }
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[hsl(268,76%,15%)] via-[hsl(268,76%,25%)] to-[hsl(268,76%,10%)] px-4">
      {/* Gold accent glow */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-96 h-96 bg-[hsl(45,100%,50%)] opacity-10 rounded-full blur-3xl pointer-events-none" />
      
      <Card className="w-full max-w-sm border-[hsl(268,76%,35%)] bg-[hsl(268,50%,12%)]/90 backdrop-blur-xl shadow-2xl shadow-[hsl(268,76%,20%)]/40">
        <CardHeader className="text-center space-y-3 pb-2">
          <div className="mx-auto w-20 h-20 rounded-2xl bg-gradient-to-br from-primary to-[hsl(45,100%,50%)] p-0.5">
            <div className="w-full h-full rounded-2xl bg-[hsl(268,50%,12%)] flex items-center justify-center overflow-hidden">
              <img src={logoBasqest} alt="BASQEST+" className="w-14 h-14 object-contain" />
            </div>
          </div>
          <div>
            <CardTitle className="text-2xl font-black tracking-tight bg-gradient-to-r from-[hsl(0,0%,100%)] to-[hsl(45,100%,70%)] bg-clip-text text-transparent">
              BASQEST+
            </CardTitle>
            <CardDescription className="text-[hsl(45,100%,65%)] font-semibold text-xs tracking-widest uppercase mt-1">
              Inteligencia Deportiva
            </CardDescription>
          </div>
        </CardHeader>

        <CardContent className="pt-2">
          <div className="flex rounded-lg bg-[hsl(268,40%,18%)] p-1 mb-6">
            <button
              type="button"
              onClick={() => setIsLogin(true)}
              className={`flex-1 py-2 text-sm font-bold rounded-md transition-all ${
                isLogin
                  ? 'bg-gradient-to-r from-primary to-[hsl(280,70%,55%)] text-primary-foreground shadow-lg'
                  : 'text-[hsl(250,20%,65%)] hover:text-[hsl(250,20%,80%)]'
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
                  : 'text-[hsl(250,20%,65%)] hover:text-[hsl(250,20%,80%)]'
              }`}
            >
              Registrarse
            </button>
          </div>

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
                  className="bg-[hsl(268,40%,18%)] border-[hsl(268,30%,30%)] text-[hsl(0,0%,95%)] placeholder:text-[hsl(250,15%,40%)] focus-visible:ring-[hsl(45,100%,50%)]"
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
                className="bg-[hsl(268,40%,18%)] border-[hsl(268,30%,30%)] text-[hsl(0,0%,95%)] placeholder:text-[hsl(250,15%,40%)] focus-visible:ring-[hsl(45,100%,50%)]"
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
                className="bg-[hsl(268,40%,18%)] border-[hsl(268,30%,30%)] text-[hsl(0,0%,95%)] placeholder:text-[hsl(250,15%,40%)] focus-visible:ring-[hsl(45,100%,50%)]"
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
              {loading ? '...' : isLogin ? 'Entrar' : 'Crear Cuenta'}
            </Button>
          </form>

          <p className="text-center text-[hsl(250,15%,45%)] text-xs mt-6">
            {isLogin ? '¿No tienes cuenta? ' : '¿Ya tienes cuenta? '}
            <button
              type="button"
              onClick={() => setIsLogin(!isLogin)}
              className="text-[hsl(45,100%,65%)] font-bold hover:underline"
            >
              {isLogin ? 'Regístrate' : 'Inicia Sesión'}
            </button>
          </p>
        </CardContent>
      </Card>
    </div>
  );
};

export default Auth;
