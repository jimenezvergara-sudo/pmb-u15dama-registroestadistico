import React from 'react';
import { AlertTriangle, RotateCw, Save, Home } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { enqueue, flushQueue } from '@/utils/syncQueue';
import { Game } from '@/types/basketball';

const ACTIVE_GAME_KEY = 'basqest_active_game';

type RecoveryStatus = 'idle' | 'saving' | 'saved' | 'error' | 'no-data';

interface Props {
  children: React.ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  recovery: RecoveryStatus;
  recoveryMsg: string;
}

class LiveGameErrorBoundary extends React.Component<Props, State> {
  state: State = { hasError: false, error: null, recovery: 'idle', recoveryMsg: '' };

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    // Always log crashes — these are critical
    console.error('[LiveGame crash]', error, info.componentStack);
  }

  private readActiveGame(): Game | null {
    try {
      const raw = localStorage.getItem(ACTIVE_GAME_KEY);
      if (!raw) return null;
      return JSON.parse(raw) as Game;
    } catch {
      return null;
    }
  }

  private handleRetrySave = async () => {
    this.setState({ recovery: 'saving', recoveryMsg: 'Recuperando datos del partido...' });

    const game = this.readActiveGame();
    if (!game) {
      this.setState({ recovery: 'no-data', recoveryMsg: 'No se encontraron datos del partido en este dispositivo.' });
      return;
    }

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        this.setState({ recovery: 'error', recoveryMsg: 'Sesión expirada. Inicia sesión y reintenta.' });
        return;
      }

      const { data: profile, error: profileErr } = await supabase
        .from('profiles')
        .select('club_id')
        .eq('user_id', user.id)
        .maybeSingle();

      if (profileErr || !profile?.club_id) {
        this.setState({ recovery: 'error', recoveryMsg: 'No se pudo identificar tu club. Reintenta.' });
        return;
      }

      enqueue({
        kind: 'insertGame',
        game,
        clubId: profile.club_id,
        userId: user.id,
        queuedAt: Date.now(),
      });

      await flushQueue();

      this.setState({
        recovery: 'saved',
        recoveryMsg: 'Partido guardado en la nube. Ya puedes recargar sin perder datos.',
      });
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Error desconocido';
      this.setState({ recovery: 'error', recoveryMsg: `Error al guardar: ${msg}` });
    }
  };

  private handleReload = () => {
    window.location.reload();
  };

  private handleGoHome = () => {
    window.location.href = '/';
  };

  render() {
    if (!this.state.hasError) return this.props.children;

    const { recovery, recoveryMsg, error } = this.state;
    const hasLocalData = !!localStorage.getItem(ACTIVE_GAME_KEY);

    return (
      <div className="min-h-screen relative flex flex-col items-center justify-center px-6 py-10 bg-background">
        <div className="w-full max-w-md bg-card border-2 border-destructive/40 rounded-2xl p-6 shadow-xl">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 rounded-full bg-destructive/15 flex items-center justify-center flex-shrink-0">
              <AlertTriangle className="w-6 h-6 text-destructive" />
            </div>
            <div>
              <h2 className="text-lg font-extrabold text-foreground leading-tight">
                Error en el partido en vivo
              </h2>
              <p className="text-xs text-muted-foreground font-semibold">
                Tus datos están a salvo en este dispositivo
              </p>
            </div>
          </div>

          <div className="bg-muted/50 rounded-lg p-3 mb-4">
            <p className="text-xs text-muted-foreground font-semibold mb-1">Detalle técnico:</p>
            <p className="text-xs text-foreground/80 font-mono break-words">
              {error?.message || 'Error desconocido'}
            </p>
          </div>

          {hasLocalData ? (
            <p className="text-sm text-foreground mb-4 leading-relaxed">
              Encontramos un partido en curso guardado localmente. Intenta sincronizarlo a la nube
              <strong> antes de recargar</strong> para no perder los datos.
            </p>
          ) : (
            <p className="text-sm text-muted-foreground mb-4">
              No hay un partido activo guardado en este dispositivo.
            </p>
          )}

          {recoveryMsg && (
            <div
              className={`text-xs font-semibold p-3 rounded-lg mb-4 ${
                recovery === 'saved'
                  ? 'bg-primary/15 text-primary border border-primary/30'
                  : recovery === 'error' || recovery === 'no-data'
                  ? 'bg-destructive/15 text-destructive border border-destructive/30'
                  : 'bg-accent/15 text-accent-foreground border border-accent/30'
              }`}
            >
              {recoveryMsg}
            </div>
          )}

          <div className="space-y-2">
            {hasLocalData && recovery !== 'saved' && (
              <button
                onClick={this.handleRetrySave}
                disabled={recovery === 'saving'}
                className="w-full h-12 rounded-xl bg-primary text-primary-foreground font-bold text-sm flex items-center justify-center gap-2 tap-feedback disabled:opacity-60"
              >
                <Save className="w-4 h-4" />
                {recovery === 'saving' ? 'Guardando...' : 'Reintentar guardar partido'}
              </button>
            )}

            <button
              onClick={this.handleReload}
              className="w-full h-11 rounded-xl bg-secondary text-secondary-foreground font-bold text-sm flex items-center justify-center gap-2 tap-feedback"
            >
              <RotateCw className="w-4 h-4" /> Recargar app
            </button>

            <button
              onClick={this.handleGoHome}
              className="w-full h-11 rounded-xl bg-muted text-foreground font-semibold text-sm flex items-center justify-center gap-2 tap-feedback"
            >
              <Home className="w-4 h-4" /> Ir al inicio
            </button>
          </div>

          <p className="text-[10px] text-muted-foreground text-center mt-4 font-semibold">
            BASQUEST+ — Tus datos no se borran al recargar
          </p>
        </div>
      </div>
    );
  }
}

export default LiveGameErrorBoundary;
