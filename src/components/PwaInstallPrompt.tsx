import React, { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Download, X, Smartphone } from 'lucide-react';
import logoBasqest from '@/assets/logo-basqest.svg';

const VISIT_KEY = 'basqest_visit_count';
const DISMISS_KEY = 'basqest_install_dismissed_at';
const INSTALLED_KEY = 'basqest_installed_at';
const VISITS_TO_PROMPT = 3;
const SNOOZE_DAYS = 7;

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

const isStandalone = (): boolean => {
  if (typeof window === 'undefined') return false;
  // iOS Safari
  // @ts-expect-error - non-standard
  if (window.navigator.standalone === true) return true;
  return window.matchMedia('(display-mode: standalone)').matches;
};

const isIos = (): boolean => {
  if (typeof navigator === 'undefined') return false;
  return /iPad|iPhone|iPod/.test(navigator.userAgent) && !('MSStream' in window);
};

const PwaInstallPrompt: React.FC = () => {
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null);
  const [visible, setVisible] = useState(false);
  const [iosMode, setIosMode] = useState(false);

  useEffect(() => {
    if (isStandalone()) {
      localStorage.setItem(INSTALLED_KEY, String(Date.now()));
      return;
    }
    if (localStorage.getItem(INSTALLED_KEY)) return;

    // Snooze check
    const dismissedAt = Number(localStorage.getItem(DISMISS_KEY) || 0);
    if (dismissedAt && Date.now() - dismissedAt < SNOOZE_DAYS * 24 * 60 * 60 * 1000) {
      return;
    }

    // Increment visit count once per page load
    const count = Number(localStorage.getItem(VISIT_KEY) || 0) + 1;
    localStorage.setItem(VISIT_KEY, String(count));

    const onBeforeInstall = (e: Event) => {
      e.preventDefault();
      setDeferred(e as BeforeInstallPromptEvent);
      if (count >= VISITS_TO_PROMPT) {
        setVisible(true);
      }
    };

    const onAppInstalled = () => {
      localStorage.setItem(INSTALLED_KEY, String(Date.now()));
      setVisible(false);
      setDeferred(null);
    };

    window.addEventListener('beforeinstallprompt', onBeforeInstall);
    window.addEventListener('appinstalled', onAppInstalled);

    // iOS does not fire beforeinstallprompt — show manual instructions
    if (count >= VISITS_TO_PROMPT && isIos()) {
      setIosMode(true);
      setVisible(true);
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', onBeforeInstall);
      window.removeEventListener('appinstalled', onAppInstalled);
    };
  }, []);

  const handleInstall = async () => {
    if (!deferred) return;
    await deferred.prompt();
    const choice = await deferred.userChoice;
    if (choice.outcome === 'accepted') {
      localStorage.setItem(INSTALLED_KEY, String(Date.now()));
    } else {
      localStorage.setItem(DISMISS_KEY, String(Date.now()));
    }
    setDeferred(null);
    setVisible(false);
  };

  const handleDismiss = () => {
    localStorage.setItem(DISMISS_KEY, String(Date.now()));
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <div className="fixed inset-x-0 bottom-0 z-[90] p-3 sm:p-4 pointer-events-none">
      <div className="pointer-events-auto max-w-md mx-auto bg-gradient-to-br from-[hsl(268,76%,25%)] via-[hsl(268,76%,18%)] to-[hsl(280,70%,12%)] border border-[hsl(45,100%,50%)]/30 rounded-2xl shadow-2xl p-4 animate-in slide-in-from-bottom-4 fade-in">
        <div className="flex items-start gap-3">
          <div className="bg-white/95 rounded-xl p-2 shrink-0">
            <img src={logoBasqest} alt="BASQUEST+" className="w-10 h-10 object-contain" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5">
              <Smartphone className="h-3.5 w-3.5 text-[hsl(45,100%,65%)]" />
              <p className="text-[hsl(45,100%,65%)] text-[10px] font-bold tracking-widest uppercase">
                Instalar app
              </p>
            </div>
            <h3 className="text-white font-bold text-sm mt-0.5">
              Lleva BASQUEST+ en tu celular
            </h3>
            <p className="text-[hsl(250,30%,80%)] text-xs mt-1 leading-snug">
              {iosMode
                ? 'Toca el botón Compartir y luego "Añadir a pantalla de inicio".'
                : 'Acceso rápido, sin barra del navegador y modo offline al registrar partidos.'}
            </p>
          </div>
          <button
            onClick={handleDismiss}
            className="text-[hsl(250,20%,65%)] hover:text-white transition-colors shrink-0"
            aria-label="Cerrar"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="flex gap-2 mt-3">
          <Button
            variant="ghost"
            size="sm"
            className="flex-1 h-9 text-xs text-[hsl(250,20%,75%)] hover:text-white hover:bg-white/5"
            onClick={handleDismiss}
          >
            Ahora no
          </Button>
          {!iosMode && deferred && (
            <Button
              size="sm"
              className="flex-1 h-9 text-xs font-bold bg-gradient-to-r from-[hsl(45,100%,45%)] to-[hsl(35,100%,50%)] hover:from-[hsl(45,100%,50%)] hover:to-[hsl(35,100%,55%)] text-[hsl(268,50%,12%)] shadow-lg shadow-[hsl(45,100%,50%)]/30 gap-1.5"
              onClick={handleInstall}
            >
              <Download className="h-3.5 w-3.5" />
              Instalar
            </Button>
          )}
          {iosMode && (
            <Button
              size="sm"
              className="flex-1 h-9 text-xs font-bold bg-gradient-to-r from-[hsl(45,100%,45%)] to-[hsl(35,100%,50%)] text-[hsl(268,50%,12%)]"
              onClick={handleDismiss}
            >
              Entendido
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};

export default PwaInstallPrompt;
