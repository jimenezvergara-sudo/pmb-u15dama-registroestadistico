import React, { createContext, useContext, useState, useCallback, useEffect, useRef } from 'react';
import { Player, ShotEvent, Game, QuarterId, Tournament, OpponentScore, Team, GameLeg, Category, ActionType, GameAction, SubstitutionEvent } from '@/types/basketball';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/integrations/supabase/client';

interface AppState {
  players: Player[];
  tournaments: Tournament[];
  teams: Team[];
  games: Game[];
  activeGame: Game | null;
  activeCategory: Category;
  myTeamName: string;
  myTeamLogo: string;
  loading: boolean;
}

interface AppContextValue extends Omit<AppState, 'loading'> {
  loading: boolean;
  addPlayer: (p: Omit<Player, 'id'>) => void;
  removePlayer: (id: string) => void;
  removeGame: (id: string) => void;
  updateGame: (game: Game) => void;
  addTournament: (t: Omit<Tournament, 'id'>) => void;
  removeTournament: (id: string) => void;
  addTeam: (t: Omit<Team, 'id'>) => void;
  removeTeam: (id: string) => void;
  startGame: (opponentName: string, roster: Player[], tournamentId?: string, opponentTeamId?: string, leg?: GameLeg, isHome?: boolean) => void;
  endGame: () => void;
  setQuarter: (q: QuarterId) => void;
  recordShot: (shot: Omit<ShotEvent, 'id' | 'timestamp' | 'quarterId'>) => void;
  undoLastShot: () => void;
  setActiveGame: (game: Game) => void;
  recordOpponentScore: (points: 1 | 2 | 3) => void;
  undoLastOpponentScore: () => void;
  setActiveCategory: (c: Category) => void;
  recordAction: (playerId: string, type: ActionType) => void;
  deleteShot: (shotId: string) => void;
  deleteAction: (actionId: string) => void;
  deleteOpponentScore: (scoreId: string) => void;
  toggleShotResult: (shotId: string) => void;
  setOnCourtPlayers: (playerIds: string[]) => void;
  recordSubstitution: (playerIn: string, playerOut: string) => void;
  snapshotCourtTime: () => void;
  startGameTimer: () => void;
  setMyTeamName: (name: string) => void;
  setMyTeamLogo: (logo: string) => void;
  mergePlayers: (keepId: string, removeId: string, keepNumber: number, keepName: string) => Promise<void>;
}

const AppContext = createContext<AppContextValue | null>(null);

const genId = () => Math.random().toString(36).slice(2, 10);

const CATEGORY_KEY = 'basqest_category';
const ACTIVE_GAME_KEY = 'basqest_active_game';
const OLD_STORAGE_KEY = 'basqest';
const OLDER_STORAGE_KEY = 'hoopstats';

/** Flush accumulated court-time for on-court players */
const flushCourtTime = (game: Game): Game => {
  const now = Date.now();
  const last = game.lastTimerSnapshot || game.gameStartTimestamp || now;
  const elapsed = now - last;
  if (elapsed <= 0) return { ...game, lastTimerSnapshot: now };
  const courtTimeMs = { ...game.courtTimeMs };
  game.onCourtPlayerIds.forEach(pid => {
    courtTimeMs[pid] = (courtTimeMs[pid] || 0) + elapsed;
  });
  return { ...game, courtTimeMs, lastTimerSnapshot: now };
};

const loadActiveGame = (): Game | null => {
  try {
    const raw = localStorage.getItem(ACTIVE_GAME_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
};

const saveActiveGame = (game: Game | null) => {
  if (game) {
    localStorage.setItem(ACTIVE_GAME_KEY, JSON.stringify(game));
  } else {
    localStorage.removeItem(ACTIVE_GAME_KEY);
  }
};

/** Migrate old localStorage data to cloud */
const migrateLocalData = async (userId: string, clubId: string) => {
  let raw = localStorage.getItem(OLD_STORAGE_KEY) || localStorage.getItem(OLDER_STORAGE_KEY);
  if (!raw) return;

  try {
    const data = JSON.parse(raw);
    const players: any[] = data.players || [];
    const teams: any[] = data.teams || [];
    const tournaments: any[] = data.tournaments || [];
    const games: any[] = data.games || [];

    // Migrate players
    if (players.length > 0) {
      const rows = players.map(p => ({
        club_id: clubId,
        user_id: userId,
        name: p.name,
        number: p.number,
      }));
      await supabase.from('club_players' as any).insert(rows);
    }

    // Migrate rival teams
    if (teams.length > 0) {
      const rows = teams.map(t => ({
        club_id: clubId,
        user_id: userId,
        club_name: t.clubName,
        city: t.city || '',
        region: t.region || '',
      }));
      await supabase.from('club_rival_teams' as any).insert(rows);
    }

    // Migrate tournaments
    if (tournaments.length > 0) {
      const rows = tournaments.map(t => ({
        club_id: clubId,
        user_id: userId,
        name: t.name,
        date: t.date || '',
      }));
      await supabase.from('club_tournaments' as any).insert(rows);
    }

    // Migrate games
    if (games.length > 0) {
      const rows = games.map(g => ({
        club_id: clubId,
        user_id: userId,
        opponent_name: g.opponentName,
        date: g.date,
        category: g.category || 'U15',
        roster: g.roster || [],
        shots: g.shots || [],
        actions: g.actions || [],
        substitutions: g.substitutions || [],
        opponent_scores: g.opponentScores || [],
        on_court_player_ids: g.onCourtPlayerIds || [],
        court_time_ms: g.courtTimeMs || {},
        current_quarter: g.currentQuarter || 'Q1',
        tournament_id: g.tournamentId || null,
        opponent_team_id: g.opponentTeamId || null,
        leg: g.leg || null,
        is_home: g.isHome ?? null,
        game_start_timestamp: g.gameStartTimestamp || null,
        last_timer_snapshot: g.lastTimerSnapshot || null,
      }));
      await supabase.from('club_games' as any).insert(rows);
    }

    // Migrate my team config
    if (data.myTeamName || data.myTeamLogo) {
      await supabase.from('profiles').update({
        my_team_name: data.myTeamName || '',
        my_team_logo: data.myTeamLogo || '',
      } as any).eq('user_id', userId);
    }

    // Clear old localStorage
    localStorage.removeItem(OLD_STORAGE_KEY);
    localStorage.removeItem(OLDER_STORAGE_KEY);
    console.log('[BASQEST] Migrated localStorage data to cloud');
  } catch (err) {
    console.error('[BASQEST] Migration error:', err);
  }
};

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, profile } = useAuth();
  const userId = user?.id;
  const clubId = profile?.club_id;

  const [state, setState] = useState<AppState>({
    players: [],
    tournaments: [],
    teams: [],
    games: [],
    activeGame: loadActiveGame(),
    activeCategory: (localStorage.getItem(CATEGORY_KEY) as Category) || 'U15',
    myTeamName: '',
    myTeamLogo: '',
    loading: true,
  });

  const hasMigrated = useRef(false);

  // Fetch all data from cloud
  useEffect(() => {
    if (!userId || !clubId) return;

    const fetchAll = async () => {
      // Check if migration needed
      if (!hasMigrated.current) {
        const hasLocal = localStorage.getItem(OLD_STORAGE_KEY) || localStorage.getItem(OLDER_STORAGE_KEY);
        if (hasLocal) {
          await migrateLocalData(userId, clubId);
          hasMigrated.current = true;
        }
      }

      const [playersRes, teamsRes, tournamentsRes, gamesRes, profileRes] = await Promise.all([
        supabase.from('club_players' as any).select('*').order('created_at'),
        supabase.from('club_rival_teams' as any).select('*').order('created_at'),
        supabase.from('club_tournaments' as any).select('*').order('created_at'),
        supabase.from('club_games' as any).select('*').order('date', { ascending: false }),
        supabase.from('profiles').select('*').eq('user_id', userId).single(),
      ]);

      const players: Player[] = ((playersRes.data as any[]) || []).map(p => ({
        id: p.id,
        name: p.name,
        number: p.number,
      }));

      const teams: Team[] = ((teamsRes.data as any[]) || []).map(t => ({
        id: t.id,
        clubName: t.club_name,
        city: t.city,
        region: t.region,
      }));

      const tournaments: Tournament[] = ((tournamentsRes.data as any[]) || []).map(t => ({
        id: t.id,
        name: t.name,
        date: t.date,
      }));

      const games: Game[] = ((gamesRes.data as any[]) || []).map(g => ({
        id: g.id,
        opponentName: g.opponent_name,
        date: g.date,
        category: g.category,
        roster: g.roster || [],
        shots: g.shots || [],
        actions: g.actions || [],
        substitutions: g.substitutions || [],
        opponentScores: g.opponent_scores || [],
        currentQuarter: g.current_quarter || 'Q1',
        onCourtPlayerIds: g.on_court_player_ids || [],
        courtTimeMs: g.court_time_ms || {},
        tournamentId: g.tournament_id,
        opponentTeamId: g.opponent_team_id,
        leg: g.leg,
        isHome: g.is_home,
        gameStartTimestamp: g.game_start_timestamp,
        lastTimerSnapshot: g.last_timer_snapshot,
      }));

      const prof = profileRes.data as any;

      setState(prev => ({
        ...prev,
        players,
        teams,
        tournaments,
        games,
        myTeamName: prof?.my_team_name || '',
        myTeamLogo: prof?.my_team_logo || '',
        loading: false,
      }));
    };

    fetchAll();
  }, [userId, clubId]);

  // Persist active game to localStorage on change
  useEffect(() => {
    saveActiveGame(state.activeGame);
  }, [state.activeGame]);

  const addPlayer = useCallback(async (p: Omit<Player, 'id'>) => {
    if (!userId || !clubId) return;
    const { data, error } = await supabase.from('club_players' as any).insert({
      club_id: clubId, user_id: userId, name: p.name, number: p.number,
    }).select().single();
    if (error || !data) { console.error(error); return; }
    const row = data as any;
    setState(s => ({ ...s, players: [...s.players, { id: row.id, name: row.name, number: row.number }] }));
  }, [userId, clubId]);

  const removePlayer = useCallback(async (id: string) => {
    await supabase.from('club_players' as any).delete().eq('id', id);
    setState(s => ({ ...s, players: s.players.filter(p => p.id !== id) }));
  }, []);

  const removeGame = useCallback(async (id: string) => {
    await supabase.from('club_games' as any).delete().eq('id', id);
    setState(s => ({ ...s, games: s.games.filter(g => g.id !== id) }));
  }, []);

  const updateGame = useCallback(async (game: Game) => {
    await supabase.from('club_games' as any).update({
      opponent_name: game.opponentName,
      date: game.date,
      category: game.category,
      roster: game.roster as any,
      shots: game.shots as any,
      actions: game.actions as any,
      substitutions: game.substitutions as any,
      opponent_scores: game.opponentScores as any,
      on_court_player_ids: game.onCourtPlayerIds as any,
      court_time_ms: game.courtTimeMs as any,
      current_quarter: game.currentQuarter,
      tournament_id: game.tournamentId || null,
      opponent_team_id: game.opponentTeamId || null,
      leg: game.leg || null,
      is_home: game.isHome ?? null,
    }).eq('id', game.id);
    setState(s => ({ ...s, games: s.games.map(g => g.id === game.id ? game : g) }));
  }, []);

  const addTournament = useCallback(async (t: Omit<Tournament, 'id'>) => {
    if (!userId || !clubId) return;
    const { data, error } = await supabase.from('club_tournaments' as any).insert({
      club_id: clubId, user_id: userId, name: t.name, date: t.date,
    }).select().single();
    if (error || !data) { console.error(error); return; }
    const row = data as any;
    setState(s => ({ ...s, tournaments: [...s.tournaments, { id: row.id, name: row.name, date: row.date }] }));
  }, [userId, clubId]);

  const removeTournament = useCallback(async (id: string) => {
    await supabase.from('club_tournaments' as any).delete().eq('id', id);
    setState(s => ({ ...s, tournaments: s.tournaments.filter(t => t.id !== id) }));
  }, []);

  const addTeam = useCallback(async (t: Omit<Team, 'id'>) => {
    if (!userId || !clubId) return;
    const { data, error } = await supabase.from('club_rival_teams' as any).insert({
      club_id: clubId, user_id: userId, club_name: t.clubName, city: t.city, region: t.region,
    }).select().single();
    if (error || !data) { console.error(error); return; }
    const row = data as any;
    setState(s => ({ ...s, teams: [...s.teams, { id: row.id, clubName: row.club_name, city: row.city, region: row.region }] }));
  }, [userId, clubId]);

  const removeTeam = useCallback(async (id: string) => {
    await supabase.from('club_rival_teams' as any).delete().eq('id', id);
    setState(s => ({ ...s, teams: s.teams.filter(t => t.id !== id) }));
  }, []);

  // Active game operations (local only, saved to cloud on endGame)
  const startGame = useCallback((opponentName: string, roster: Player[], tournamentId?: string, opponentTeamId?: string, leg?: GameLeg, isHome?: boolean) => {
    const game: Game = {
      id: genId(),
      opponentName,
      date: new Date().toISOString(),
      roster,
      shots: [],
      opponentScores: [],
      actions: [],
      substitutions: [],
      currentQuarter: 'Q1',
      tournamentId,
      opponentTeamId,
      leg,
      isHome,
      category: state.activeCategory,
      onCourtPlayerIds: [],
      courtTimeMs: {},
    };
    setState(s => ({ ...s, activeGame: game }));
  }, [state.activeCategory]);

  const endGame = useCallback(async () => {
    setState(s => {
      if (!s.activeGame) return s;
      const flushed = flushCourtTime(s.activeGame);

      // Save to cloud asynchronously
      if (userId && clubId) {
        supabase.from('club_games' as any).insert({
          club_id: clubId,
          user_id: userId,
          opponent_name: flushed.opponentName,
          date: flushed.date,
          category: flushed.category || 'U15',
          roster: flushed.roster as any,
          shots: flushed.shots as any,
          actions: flushed.actions as any,
          substitutions: flushed.substitutions as any,
          opponent_scores: flushed.opponentScores as any,
          on_court_player_ids: flushed.onCourtPlayerIds as any,
          court_time_ms: flushed.courtTimeMs as any,
          current_quarter: flushed.currentQuarter,
          tournament_id: flushed.tournamentId || null,
          opponent_team_id: flushed.opponentTeamId || null,
          leg: flushed.leg || null,
          is_home: flushed.isHome ?? null,
          game_start_timestamp: flushed.gameStartTimestamp || null,
          last_timer_snapshot: flushed.lastTimerSnapshot || null,
        }).select().single().then(({ data }) => {
          if (data) {
            const row = data as any;
            // Update the game in state with the cloud ID
            setState(prev => ({
              ...prev,
              games: [
                {
                  ...flushed,
                  id: row.id,
                },
                ...prev.games,
              ],
            }));
          }
        });
      }

      return { ...s, activeGame: null };
    });
  }, [userId, clubId]);

  const setQuarter = useCallback((q: QuarterId) => {
    setState(s => {
      if (!s.activeGame) return s;
      const flushed = flushCourtTime(s.activeGame);
      return { ...s, activeGame: { ...flushed, currentQuarter: q } };
    });
  }, []);

  const recordShot = useCallback((shot: Omit<ShotEvent, 'id' | 'timestamp' | 'quarterId'>) => {
    setState(s => {
      if (!s.activeGame) return s;
      const event: ShotEvent = {
        ...shot,
        id: genId(),
        timestamp: Date.now(),
        quarterId: s.activeGame.currentQuarter,
      };
      return { ...s, activeGame: { ...s.activeGame, shots: [...s.activeGame.shots, event] } };
    });
  }, []);

  const undoLastShot = useCallback(() => {
    setState(s => {
      if (!s.activeGame || s.activeGame.shots.length === 0) return s;
      return { ...s, activeGame: { ...s.activeGame, shots: s.activeGame.shots.slice(0, -1) } };
    });
  }, []);

  const setActiveGame = useCallback((game: Game) => {
    setState(s => ({ ...s, activeGame: game }));
  }, []);

  const recordOpponentScore = useCallback((points: 1 | 2 | 3) => {
    setState(s => {
      if (!s.activeGame) return s;
      const score: OpponentScore = {
        id: genId(),
        points,
        quarterId: s.activeGame.currentQuarter,
        timestamp: Date.now(),
      };
      return { ...s, activeGame: { ...s.activeGame, opponentScores: [...(s.activeGame.opponentScores || []), score] } };
    });
  }, []);

  const undoLastOpponentScore = useCallback(() => {
    setState(s => {
      if (!s.activeGame || !(s.activeGame.opponentScores || []).length) return s;
      return { ...s, activeGame: { ...s.activeGame, opponentScores: s.activeGame.opponentScores.slice(0, -1) } };
    });
  }, []);

  const setActiveCategory = useCallback((c: Category) => {
    localStorage.setItem(CATEGORY_KEY, c);
    setState(s => ({ ...s, activeCategory: c }));
  }, []);

  const recordAction = useCallback((playerId: string, type: ActionType) => {
    setState(s => {
      if (!s.activeGame) return s;
      const action: GameAction = {
        id: genId(),
        playerId,
        quarterId: s.activeGame.currentQuarter,
        type,
        timestamp: Date.now(),
      };
      return { ...s, activeGame: { ...s.activeGame, actions: [...(s.activeGame.actions || []), action] } };
    });
  }, []);

  const deleteShot = useCallback((shotId: string) => {
    setState(s => {
      if (!s.activeGame) return s;
      return { ...s, activeGame: { ...s.activeGame, shots: s.activeGame.shots.filter(sh => sh.id !== shotId) } };
    });
  }, []);

  const deleteAction = useCallback((actionId: string) => {
    setState(s => {
      if (!s.activeGame) return s;
      return { ...s, activeGame: { ...s.activeGame, actions: (s.activeGame.actions || []).filter(a => a.id !== actionId) } };
    });
  }, []);

  const deleteOpponentScore = useCallback((scoreId: string) => {
    setState(s => {
      if (!s.activeGame) return s;
      return { ...s, activeGame: { ...s.activeGame, opponentScores: (s.activeGame.opponentScores || []).filter(o => o.id !== scoreId) } };
    });
  }, []);

  const toggleShotResult = useCallback((shotId: string) => {
    setState(s => {
      if (!s.activeGame) return s;
      return {
        ...s,
        activeGame: {
          ...s.activeGame,
          shots: s.activeGame.shots.map(sh => sh.id === shotId ? { ...sh, made: !sh.made } : sh),
        },
      };
    });
  }, []);

  const setOnCourtPlayers = useCallback((playerIds: string[]) => {
    setState(s => {
      if (!s.activeGame) return s;
      return { ...s, activeGame: { ...s.activeGame, onCourtPlayerIds: playerIds } };
    });
  }, []);

  const recordSubstitution = useCallback((playerIn: string, playerOut: string) => {
    setState(s => {
      if (!s.activeGame) return s;
      const flushed = flushCourtTime(s.activeGame);
      const sub: SubstitutionEvent = {
        id: genId(),
        playerIn,
        playerOut,
        quarterId: flushed.currentQuarter,
        timestamp: Date.now(),
      };
      const newOnCourt = flushed.onCourtPlayerIds.filter(id => id !== playerOut).concat(playerIn);
      return {
        ...s,
        activeGame: {
          ...flushed,
          substitutions: [...(flushed.substitutions || []), sub],
          onCourtPlayerIds: newOnCourt,
        },
      };
    });
  }, []);

  const snapshotCourtTime = useCallback(() => {
    setState(s => {
      if (!s.activeGame) return s;
      return { ...s, activeGame: flushCourtTime(s.activeGame) };
    });
  }, []);

  const startGameTimer = useCallback(() => {
    setState(s => {
      if (!s.activeGame) return s;
      const now = Date.now();
      return { ...s, activeGame: { ...s.activeGame, gameStartTimestamp: now, lastTimerSnapshot: now } };
    });
  }, []);

  const setMyTeamName = useCallback(async (name: string) => {
    if (userId) {
      await supabase.from('profiles').update({ my_team_name: name } as any).eq('user_id', userId);
    }
    setState(s => ({ ...s, myTeamName: name }));
  }, [userId]);

  const setMyTeamLogo = useCallback(async (logo: string) => {
    if (userId) {
      await supabase.from('profiles').update({ my_team_logo: logo } as any).eq('user_id', userId);
    }
    setState(s => ({ ...s, myTeamLogo: logo }));
  }, [userId]);

  const mergePlayers = useCallback(async (keepId: string, removeId: string, keepNumber: number) => {
    // Update all games: remap removeId → keepId in shots, actions, substitutions, roster, onCourtPlayerIds, courtTimeMs
    const updatedGames = state.games.map(g => {
      const remapId = (id: string) => id === removeId ? keepId : id;
      const newRoster = g.roster.map(p => p.id === removeId ? { ...p, id: keepId, number: keepNumber } : p)
        .filter((p, i, arr) => arr.findIndex(x => x.id === p.id) === i); // deduplicate
      const newShots = g.shots.map(s => ({ ...s, playerId: remapId(s.playerId) }));
      const newActions = (g.actions || []).map(a => ({ ...a, playerId: remapId(a.playerId) }));
      const newSubs = (g.substitutions || []).map(s => ({ ...s, playerIn: remapId(s.playerIn), playerOut: remapId(s.playerOut) }));
      const newOnCourt = g.onCourtPlayerIds.map(remapId).filter((id, i, arr) => arr.indexOf(id) === i);
      const newCourtTime = { ...g.courtTimeMs };
      if (newCourtTime[removeId]) {
        newCourtTime[keepId] = (newCourtTime[keepId] || 0) + newCourtTime[removeId];
        delete newCourtTime[removeId];
      }
      return { ...g, roster: newRoster, shots: newShots, actions: newActions, substitutions: newSubs, onCourtPlayerIds: newOnCourt, courtTimeMs: newCourtTime };
    });

    // Persist each updated game to cloud
    for (const g of updatedGames) {
      await supabase.from('club_games' as any).update({
        roster: g.roster as any,
        shots: g.shots as any,
        actions: g.actions as any,
        substitutions: g.substitutions as any,
        on_court_player_ids: g.onCourtPlayerIds as any,
        court_time_ms: g.courtTimeMs as any,
      }).eq('id', g.id);
    }

    // Delete the removed player from cloud
    await supabase.from('club_players' as any).delete().eq('id', removeId);

    setState(s => ({
      ...s,
      games: updatedGames,
      players: s.players.filter(p => p.id !== removeId).map(p => p.id === keepId ? { ...p, number: keepNumber } : p),
    }));
  }, [state.games]);

  return (
    <AppContext.Provider value={{
      ...state,
      addPlayer, removePlayer, removeGame, updateGame, addTournament, removeTournament,
      addTeam, removeTeam,
      startGame, endGame, setQuarter, recordShot, undoLastShot, setActiveGame,
      recordOpponentScore, undoLastOpponentScore, setActiveCategory, recordAction,
      deleteShot, deleteAction, deleteOpponentScore, toggleShotResult,
      setOnCourtPlayers, recordSubstitution, snapshotCourtTime, startGameTimer, setMyTeamName, setMyTeamLogo,
      mergePlayers,
    }}>
      {children}
    </AppContext.Provider>
  );
};

export const useApp = (): AppContextValue => {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be inside AppProvider');
  return ctx;
};
