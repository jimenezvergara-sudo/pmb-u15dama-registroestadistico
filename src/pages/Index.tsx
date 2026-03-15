import React, { useState } from 'react';
import { AppProvider, useApp } from '@/context/AppContext';
import BottomNav, { TabId } from '@/components/BottomNav';
import LiveGame from '@/components/LiveGame';
import NewGame from '@/components/NewGame';
import RosterManager from '@/components/RosterManager';
import Dashboard from '@/components/Dashboard';
import TournamentManager from '@/components/TournamentManager';
import HomeScreen from '@/components/HomeScreen';

const AppContent: React.FC = () => {
  const { activeGame } = useApp();
  const [tab, setTab] = useState<TabId>('home');

  // Auto-switch to live when game starts
  React.useEffect(() => {
    if (activeGame) setTab('live');
  }, [activeGame?.id]);

  return (
    <div className="min-h-screen max-w-md mx-auto flex flex-col pb-16">
      {tab === 'live' && (activeGame ? <LiveGame /> : <NewGame />)}
      {tab === 'roster' && <RosterManager />}
      {tab === 'dashboard' && <Dashboard />}
      {tab === 'tournaments' && <TournamentManager />}
      <BottomNav activeTab={tab} onTabChange={setTab} hasActiveGame={!!activeGame} />
    </div>
  );
};

const Index = () => (
  <AppProvider>
    <AppContent />
  </AppProvider>
);

export default Index;
