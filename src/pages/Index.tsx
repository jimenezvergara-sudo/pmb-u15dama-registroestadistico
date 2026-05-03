import React, { useState } from 'react';
import { AppProvider, useApp } from '@/context/AppContext';
import { RosterProvider, DashboardProvider, ActiveGameProvider } from '@/context/contexts';
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
import NikitaChat from '@/components/NikitaChat';
import ReadOnlyBanner from '@/components/ReadOnlyBanner';
import DesktopSidebar from '@/components/DesktopSidebar';
import { CATEGORIES, Category } from '@/types/basketball';
import { consumeRosterReturnRequest, LINEUP_RETURN_EVENT } from '@/utils/activeGameExpiry';
import { usePermissions } from '@/hooks/usePermissions';
import { useIsLandscape } from '@/hooks/useOrientation';
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
  const perms = usePermissions();
  const isLandscape = useIsLandscape();
  const [tab, setTab] = useState<TabId>('home');
  const [showCategoryPicker, setShowCategoryPicker] = useState(false);

  React.useEffect(() => {
    if (activeGame && perms.canEditGames) setTab('live');
  }, [activeGame?.id, perms.canEditGames]);

  // Defense-in-depth: if a tab is rendered but the user doesn't have permission, fall back to home.
  const allowedTab: TabId = (() => {
    if (tab === 'live' && !perms.canEditGames) return 'home';
    if (tab === 'roster' && !perms.canEditRoster) return 'home';
    if (tab === 'teams' && !perms.canEditTeams) return 'home';
    if (tab === 'tournaments' && !perms.canEditTournaments) return 'home';
    if (tab === 'staff' && !perms.canViewStaffList) return 'home';
    if (tab === 'admin' && !perms.canViewAdmin) return 'home';
    return tab;
  })();

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

  // Hide BottomNav (and remove bottom padding) when actively tracking a live
  // game in landscape — maximizes screen real estate for in-game tracking.
  const liveLandscape = isLandscape && allowedTab === 'live' && !!activeGame;

  // Live game landscape on phone takes the full screen — bypass any shell.
  if (liveLandscape) {
    return (
      <div className="min-h-screen w-full relative">
        <ReadOnlyBanner />
        <LiveGameErrorBoundary>
          <LiveGame />
        </LiveGameErrorBoundary>
      </div>
    );
  }

  const content = (
    <>
      <ReadOnlyBanner />
      {allowedTab === 'home' && <HomeScreen onCategoryPress={() => setShowCategoryPicker(true)} />}
      {allowedTab === 'live' && (activeGame ? (
        <LiveGameErrorBoundary>
          <LiveGame />
        </LiveGameErrorBoundary>
      ) : <NewGame />)}
      {allowedTab === 'roster' && <RosterManager />}
      {allowedTab === 'teams' && <TeamManager />}
      {allowedTab === 'dashboard' && <Dashboard />}
      {allowedTab === 'tournaments' && <TournamentManager />}
      {allowedTab === 'admin' && <AdminPanel />}
      {allowedTab === 'staff' && <ClubStaffManager />}
      {perms.canRunAI && (allowedTab === 'home' || allowedTab === 'dashboard') && <NikitaChat floating />}
    </>
  );

  return (
    <div className="min-h-screen w-full lg:flex">
      {/* Desktop sidebar (≥1024px) */}
      <DesktopSidebar activeTab={allowedTab} onTabChange={setTab} hasActiveGame={!!activeGame} />

      {/* Main column: mobile keeps max-w-md, tablet max-w-2xl, desktop fluid */}
      <div className="flex-1 min-w-0 flex flex-col">
        <div className="mx-auto w-full max-w-md md:max-w-2xl lg:max-w-none flex flex-col relative pb-16 lg:pb-0 min-h-screen">
          {content}
        </div>
        {/* BottomNav only on <lg */}
        <div className="lg:hidden">
          <BottomNav activeTab={allowedTab} onTabChange={setTab} hasActiveGame={!!activeGame} />
        </div>
      </div>
    </div>
  );
};

const Index = () => (
  // Order: Auth (already provided by App.tsx) → AppProvider (single store)
  // → Roster → Dashboard → ActiveGame (innermost = most frequent updates).
  <AppProvider>
    <RosterProvider>
      <DashboardProvider>
        <ActiveGameProvider>
          <AppContent />
        </ActiveGameProvider>
      </DashboardProvider>
    </RosterProvider>
  </AppProvider>
);

export default Index;
