import React from 'react';
import { BarChart3, Users, Plus, Trophy, Home, Shield } from 'lucide-react';

export type TabId = 'home' | 'live' | 'roster' | 'dashboard' | 'tournaments' | 'teams';

interface Props {
  activeTab: TabId;
  onTabChange: (tab: TabId) => void;
  hasActiveGame: boolean;
}

const tabs: { id: TabId; icon: React.ReactNode; label: string }[] = [
  { id: 'home', icon: <Home className="w-5 h-5" />, label: 'Inicio' },
  { id: 'live', icon: <Plus className="w-5 h-5" />, label: 'Partido' },
  { id: 'roster', icon: <Users className="w-5 h-5" />, label: 'Plantilla' },
  { id: 'teams', icon: <Shield className="w-5 h-5" />, label: 'Equipos' },
  { id: 'tournaments', icon: <Trophy className="w-5 h-5" />, label: 'Torneos' },
  { id: 'dashboard', icon: <BarChart3 className="w-5 h-5" />, label: 'Stats' },
];

const BottomNav: React.FC<Props> = ({ activeTab, onTabChange, hasActiveGame }) => {
  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-background border-t border-border safe-bottom z-50">
      <div className="flex justify-around max-w-md mx-auto">
        {tabs.map(tab => {
          const isActive = activeTab === tab.id;
          const isLive = tab.id === 'live' && hasActiveGame;
          return (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              className={`flex flex-col items-center py-2 px-2 tap-feedback transition-colors min-w-[52px] ${
                isActive ? 'text-primary' : 'text-muted-foreground'
              }`}
            >
              <div className="relative">
                {tab.icon}
                {isLive && (
                  <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-success rounded-full border-2 border-background" />
                )}
              </div>
              <span className="text-[9px] font-semibold mt-0.5">{isLive ? 'En Vivo' : tab.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};

export default BottomNav;
