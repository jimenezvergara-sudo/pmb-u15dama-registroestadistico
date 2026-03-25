import React from 'react';
import { useAuth } from '@/context/AuthContext';
import { BarChart3, Briefcase, ChevronRight, Lock } from 'lucide-react';
import logoBasqest from '@/assets/logo-basqest-new.png';

interface PostLoginLandingProps {
  onSelectStats: () => void;
  onSelectCeo: () => void;
}

const PostLoginLanding: React.FC<PostLoginLandingProps> = ({ onSelectStats, onSelectCeo }) => {
  const { profile, effectiveRoles } = useAuth();

  const firstName = profile?.full_name?.split(' ')[0] || 'Usuario';

  // Roles that can access CEO Sports card
  const ceoRoles = ['super_admin', 'system_operator', 'club_admin', 'club_admin_elite', 'club_admin_pro'];
  const canAccessCeo = effectiveRoles.some(r => ceoRoles.includes(r));

  // club_staff (estadístico) can only access stats
  const canAccessStats = true; // everyone can access stats

  return (
    <div className="min-h-screen bg-[#0d0a1a] flex flex-col items-center px-5 py-8">
      {/* Logo */}
      <div className="mb-6">
        <img src={logoBasqest} alt="BASQUEST+" className="w-20 h-20 rounded-2xl shadow-lg shadow-[#7A26E1]/30" />
      </div>

      {/* Welcome */}
      <h1 className="text-2xl font-black text-white tracking-tight text-center">
        ¡Bienvenido, <span className="text-[#7A26E1]">{firstName}</span>!
      </h1>
      <p className="text-sm text-white/50 font-medium mt-1 mb-10 text-center">
        Selecciona tu módulo de trabajo
      </p>

      {/* Cards */}
      <div className="w-full max-w-sm space-y-5">
        {/* Card 1: Gestión Deportiva */}
        {canAccessStats && (
          <button
            onClick={onSelectStats}
            className="group w-full text-left rounded-2xl border border-[#7A26E1]/30 bg-gradient-to-br from-[#7A26E1]/15 to-[#7A26E1]/5 p-5 transition-all duration-300 hover:border-[#7A26E1]/60 hover:shadow-xl hover:shadow-[#7A26E1]/20 hover:scale-[1.02] active:scale-[0.98]"
          >
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-xl bg-[#7A26E1]/20 flex items-center justify-center shrink-0 group-hover:bg-[#7A26E1]/30 transition-colors">
                <BarChart3 className="w-6 h-6 text-[#7A26E1]" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-bold text-white">Gestión Deportiva</h2>
                  <ChevronRight className="w-5 h-5 text-[#7A26E1]/60 group-hover:text-[#7A26E1] transition-colors" />
                </div>
                <p className="text-xs text-white/40 mt-1 leading-relaxed">
                  Marcador en vivo · Reportes IA · Registro de partidos · Categorías U13–U18
                </p>
              </div>
            </div>
            <div className="flex gap-2 mt-4">
              {['Estadísticas', 'Plantilla', 'Torneos'].map(tag => (
                <span key={tag} className="text-[9px] font-bold text-[#7A26E1]/80 bg-[#7A26E1]/10 px-2 py-0.5 rounded-full uppercase tracking-wider">
                  {tag}
                </span>
              ))}
            </div>
          </button>
        )}

        {/* Card 2: CEO Sports */}
        <button
          onClick={canAccessCeo ? onSelectCeo : undefined}
          disabled={!canAccessCeo}
          className={`group w-full text-left rounded-2xl border p-5 transition-all duration-300 ${
            canAccessCeo
              ? 'border-[#FFC300]/30 bg-gradient-to-br from-[#FFC300]/10 to-[#FFC300]/5 hover:border-[#FFC300]/60 hover:shadow-xl hover:shadow-[#FFC300]/15 hover:scale-[1.02] active:scale-[0.98]'
              : 'border-white/10 bg-white/5 opacity-50 cursor-not-allowed'
          }`}
        >
          <div className="flex items-start gap-4">
            <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 transition-colors ${
              canAccessCeo ? 'bg-[#FFC300]/15 group-hover:bg-[#FFC300]/25' : 'bg-white/10'
            }`}>
              {canAccessCeo
                ? <Briefcase className="w-6 h-6 text-[#FFC300]" />
                : <Lock className="w-6 h-6 text-white/30" />
              }
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between">
                <h2 className={`text-lg font-bold ${canAccessCeo ? 'text-white' : 'text-white/40'}`}>
                  CEO Sports
                </h2>
                {canAccessCeo && (
                  <ChevronRight className="w-5 h-5 text-[#FFC300]/60 group-hover:text-[#FFC300] transition-colors" />
                )}
              </div>
              <p className={`text-xs mt-1 leading-relaxed ${canAccessCeo ? 'text-white/40' : 'text-white/20'}`}>
                {canAccessCeo
                  ? 'ERP Finanzas · Gestión de Staff · Proyectos · Documentación del Club'
                  : 'Acceso restringido — contacta al administrador del club'}
              </p>
            </div>
          </div>
          {canAccessCeo && (
            <div className="flex gap-2 mt-4">
              {['Finanzas', 'Staff', 'Proyectos'].map(tag => (
                <span key={tag} className="text-[9px] font-bold text-[#FFC300]/80 bg-[#FFC300]/10 px-2 py-0.5 rounded-full uppercase tracking-wider">
                  {tag}
                </span>
              ))}
            </div>
          )}
        </button>
      </div>

      {/* Footer */}
      <p className="text-[10px] text-white/20 font-semibold uppercase tracking-widest mt-auto pt-10">
        BASQUEST+ · Inteligencia Deportiva
      </p>
    </div>
  );
};

export default PostLoginLanding;
