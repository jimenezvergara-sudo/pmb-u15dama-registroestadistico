import React from 'react';
import { BarChart3, Users, Plus, Trophy, Home, Shield, ShieldAlert, UserCog } from 'lucide-react';
import { usePermissions } from '@/hooks/usePermissions';
import { TabId } from '@/components/BottomNav';
import logoBasqest from '@/assets/logo-basqest.png';

interface Props {
  activeTab: TabId;
  onTabChange: (tab: TabId) => void;
  hasActiveGame: boolean;
}

interface TabDef { id: TabId; icon: React.ReactNode; label: string }

const DesktopSidebar: React.FC<Props> = ({ activeTab, onTabChange, hasActiveGame }) => {
  const {
    canEditGames, canEditRoster, canEditTeams, canEditTournaments,
    canViewAdmin, canViewStaffList,
  } = usePermissions();

  const tabs: TabDef[] = [
    { id: 'home', icon: <Home className="w-5 h-5" />, label: 'Inicio' },
  ];
  if (canEditGames) tabs.push({ id: 'live', icon: <Plus className="w-5 h-5" />, label: 'Partido' });
  if (canEditRoster) tabs.push({ id: 'roster', icon: <Users className="w-5 h-5" />, label: 'Plantilla' });
  if (canEditTeams) tabs.push({ id: 'teams', icon: <Shield className="w-5 h-5" />, label: 'Equipos' });
  if (canEditTournaments) tabs.push({ id: 'tournaments', icon: <Trophy className="w-5 h-5" />, label: 'Torneos' });
  tabs.push({ id: 'dashboard', icon: <BarChart3 className="w-5 h-5" />, label: 'Estadísticas' });
  if (canViewStaffList) tabs.push({ id: 'staff', icon: <UserCog className="w-5 h-5" />, label: 'Staff' });
  if (canViewAdmin) tabs.push({ id: 'admin', icon: <ShieldAlert className="w-5 h-5" />, label: 'Admin' });

  return (
    <aside className="hidden lg:flex flex-col w-[240px] h-screen sticky top-0 border-r border-border bg-card">
      <div className="flex items-center gap-2 px-5 py-4 border-b border-border">
        <img src={logoBasqest} alt="BASQUEST+" className="w-9 h-9" />
        <div className="leading-tight">
          <p className="text-sm font-black text-primary tracking-tight">BASQUEST+</p>
          <p className="text-[10px] text-muted-foreground font-semibold">Inteligencia Deportiva</p>
        </div>
      </div>
      <nav className="flex-1 overflow-y-auto py-3 px-2">
        {tabs.map(tab => {
          const isActive = activeTab === tab.id;
          const isLive = tab.id === 'live' && hasActiveGame;
          return (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-bold tap-feedback transition-colors mb-1 ${
                isActive
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:bg-muted hover:text-foreground'
              }`}
            >
              <span className="relative">
                {tab.icon}
                {isLive && (
                  <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-success rounded-full border-2 border-card" />
                )}
              </span>
              <span>{isLive ? 'En Vivo' : tab.label}</span>
            </button>
          );
        })}
      </nav>
    </aside>
  );
};

export default DesktopSidebar;
