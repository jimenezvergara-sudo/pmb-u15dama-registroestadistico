import React, { useState } from 'react';
import { AppProvider, useApp } from '@/context/AppContext';
import BottomNav, { TabId } from '@/components/BottomNav';
import LiveGame from '@/components/LiveGame';
import NewGame from '@/components/NewGame';
import RosterManager from '@/components/RosterManager';
import Dashboard from '@/components/Dashboard';
import TournamentManager from '@/components/TournamentManager';
import TeamManager from '@/components/TeamManager';
import HomeScreen from '@/components/HomeScreen';
import AdminPanel from '@/components/AdminPanel';
import PostLoginLanding from '@/components/PostLoginLanding';
import { CATEGORIES, Category } from '@/types/basketball';
import logoBasqest from '@/assets/logo-basqest.png';

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
  const [activeModule, setActiveModule] = useState<'landing' | 'stats' | 'ceo'>('landing');

  React.useEffect(() => {
    if (activeGame) setTab('live');
  }, [activeGame?.id]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  // Show landing screen first
  if (activeModule === 'landing') {
    return (
      <PostLoginLanding
        onSelectStats={() => setActiveModule('stats')}
        onSelectCeo={() => setActiveModule('ceo')}
      />
    );
  }

  // CEO module placeholder (future ERP)
  if (activeModule === 'ceo') {
    return (
      <div className="min-h-screen bg-[#0d0a1a] flex flex-col items-center justify-center px-6">
        <h1 className="text-2xl font-black text-white mb-2">CEO Sports</h1>
        <p className="text-sm text-white/50 mb-8">Módulo en construcción</p>
        <button
          onClick={() => setActiveModule('landing')}
          className="text-sm font-bold text-[#FFC300] bg-[#FFC300]/10 px-5 py-2.5 rounded-xl hover:bg-[#FFC300]/20 transition-colors"
        >
          ← Volver al inicio
        </button>
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
    <div className="min-h-screen max-w-md mx-auto flex flex-col pb-16">
      
      {tab === 'home' && <HomeScreen onCategoryPress={() => setShowCategoryPicker(true)} />}
      {tab === 'live' && (activeGame ? <LiveGame /> : <NewGame />)}
      {tab === 'roster' && <RosterManager />}
      {tab === 'teams' && <TeamManager />}
      {tab === 'dashboard' && <Dashboard />}
      {tab === 'tournaments' && <TournamentManager />}
      {tab === 'admin' && <AdminPanel />}
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
