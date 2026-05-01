import React, { useState } from 'react';
import { AppProvider, useApp } from '@/context/AppContext';
import BottomNav, { TabId } from '@/components/BottomNav';
import LiveGame from '@/components/LiveGame';
import LiveGameErrorBoundary from '@/components/LiveGameErrorBoundary';
import NewGame from '@/components/NewGame';
import RosterManager from '@/components/RosterManager';
import Dashboard from '@/components/Dashboard';
import TournamentManager from '@/components/TournamentManager';
import TeamManager from '@/components/TeamManager';
import HomeScreen from '@/components/HomeScreen';
import AdminPanel from '@/components/AdminPanel';
import ClubStaffManager from '@/components/ClubStaffManager';
import ReadOnlyBanner from '@/components/ReadOnlyBanner';
import { CATEGORIES, Category } from '@/types/basketball';
import { consumeRosterReturnRequest, LINEUP_RETURN_EVENT } from '@/utils/activeGameExpiry';
import logoBasqest from '@/assets/logo-basqest-new.webp';

const CategorySelector: React.FC<{ onSelect: (c: Category) => void }> = ({ onSelect }) => (
  <div className="min-h-screen flex flex-col items-center justify-center bg-background px-6">
    <img src={logoBasqest} alt="BASQUEST+" className="w-24 h-24 mb-4" />
    <h1 className="text-3xl font-black text-primary tracking-tight mb-1">BASQUEST+</h1>
    <p className="text-sm text-muted-foreground font-semibold mb-8">Inteligencia Deportiva</p>
    <p className="text-sm font-bold text-foreground mb-4">Selecciona la categoría</p>
    <div className="grid grid-cols-2 gap-3 w-full max-w-xs">
      {CATEGORIES.map(c => (
        <button
          key={c}
          onClick={() => onSelect(c)}
          className="bg-primary text-primary-foreground font-bold text-lg py-4 rounded-xl tap-feedback hover:opacity-90 transition-opacity shadow-lg shadow-primary/30"
        >
          {c}
        </button>
      ))}
    </div>
  </div>
);

const AppContent: React.FC = () => {
  const { activeGame, activeCategory, setActiveCategory, loading } = useApp();
  const [tab, setTab] = useState<TabId>('home');
  const [showCategoryPicker, setShowCategoryPicker] = useState(false);

  React.useEffect(() => {
    if (activeGame) setTab('live');
  }, [activeGame?.id]);

  React.useEffect(() => {
    const returnToRoster = () => {
      if (consumeRosterReturnRequest()) setTab('roster');
    };
    returnToRoster();
    window.addEventListener(LINEUP_RETURN_EVENT, returnToRoster);
    return () => window.removeEventListener(LINEUP_RETURN_EVENT, returnToRoster);
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  if (showCategoryPicker) {
    return (
      <CategorySelector onSelect={(c) => {
        setActiveCategory(c);
        setShowCategoryPicker(false);
      }} />
    );
  }

  return (
    <div className="min-h-screen max-w-md mx-auto flex flex-col pb-16 relative">
      <ReadOnlyBanner />
      
      {tab === 'home' && <HomeScreen onCategoryPress={() => setShowCategoryPicker(true)} />}
      {tab === 'live' && (activeGame ? <LiveGame /> : <NewGame />)}
      {tab === 'roster' && <RosterManager />}
      {tab === 'teams' && <TeamManager />}
      {tab === 'dashboard' && <Dashboard />}
      {tab === 'tournaments' && <TournamentManager />}
      {tab === 'admin' && <AdminPanel />}
      {tab === 'staff' && <ClubStaffManager />}
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
