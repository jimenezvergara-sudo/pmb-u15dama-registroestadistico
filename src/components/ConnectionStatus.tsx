import React, { useEffect, useState } from 'react';
import { useOnlineStatus } from '@/hooks/useOnlineStatus';
import { subscribeSync, SyncStatus, flushQueue } from '@/utils/syncQueue';
import { Wifi, WifiOff, CloudCheck, CloudUpload, RefreshCw } from 'lucide-react';

const ConnectionStatus: React.FC = () => {
  const online = useOnlineStatus();
  const [status, setStatus] = useState<SyncStatus>('idle');
  const [pending, setPending] = useState(0);
  const [showSynced, setShowSynced] = useState(false);
  const [wasOffline, setWasOffline] = useState(false);

  useEffect(() => {
    return subscribeSync((s, p) => {
      setStatus(s);
      setPending(p);
    });
  }, []);

  // Track offline → online transition to show "Sincronizado ✅" briefly
  useEffect(() => {
    if (!online) {
      setWasOffline(true);
      return;
    }
    if (online && wasOffline && pending === 0 && status === 'idle') {
      setShowSynced(true);
      const t = setTimeout(() => {
        setShowSynced(false);
        setWasOffline(false);
      }, 3000);
      return () => clearTimeout(t);
    }
  }, [online, wasOffline, pending, status]);

  // Trigger sync when reconnecting
  useEffect(() => {
    if (online && pending > 0) {
      flushQueue();
    }
  }, [online, pending]);

  // Don't render anything when fully idle and no recent transition
  if (online && status === 'idle' && pending === 0 && !showSynced) return null;

  let bg = 'bg-amber-500/95';
  let icon = <CloudUpload className="h-3.5 w-3.5" />;
  let text = '';

  if (!online) {
    bg = 'bg-destructive/95';
    icon = <WifiOff className="h-3.5 w-3.5" />;
    text = pending > 0
      ? `Sin conexión — ${pending} cambio${pending === 1 ? '' : 's'} guardado${pending === 1 ? '' : 's'} localmente`
      : 'Sin conexión — guardando localmente';
  } else if (status === 'syncing') {
    bg = 'bg-primary/95';
    icon = <RefreshCw className="h-3.5 w-3.5 animate-spin" />;
    text = `Sincronizando ${pending} cambio${pending === 1 ? '' : 's'}...`;
  } else if (status === 'pending' && pending > 0) {
    bg = 'bg-amber-500/95';
    icon = <CloudUpload className="h-3.5 w-3.5" />;
    text = `${pending} cambio${pending === 1 ? '' : 's'} pendiente${pending === 1 ? '' : 's'} de sincronizar`;
  } else if (status === 'error') {
    bg = 'bg-destructive/95';
    text = 'Error al sincronizar — reintentando...';
  } else if (showSynced) {
    bg = 'bg-emerald-600/95';
    icon = <CloudCheck className="h-3.5 w-3.5" />;
    text = 'Sincronizado ✅';
  } else if (online) {
    bg = 'bg-emerald-600/95';
    icon = <Wifi className="h-3.5 w-3.5" />;
    text = 'Conectado';
  }

  return (
    <div
      className={`fixed top-2 left-1/2 -translate-x-1/2 z-[100] ${bg} text-white px-3 py-1.5 rounded-full shadow-lg backdrop-blur-sm flex items-center gap-2 text-xs font-bold animate-in fade-in slide-in-from-top-2`}
      role="status"
      aria-live="polite"
    >
      {icon}
      <span>{text}</span>
    </div>
  );
};

export default ConnectionStatus;
