
-- Add team branding to profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS my_team_name text NOT NULL DEFAULT '';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS my_team_logo text NOT NULL DEFAULT '';

-- Players table
CREATE TABLE public.club_players (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  club_id uuid NOT NULL,
  user_id uuid NOT NULL,
  name text NOT NULL,
  number integer NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.club_players ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own club players" ON public.club_players FOR SELECT TO authenticated USING (club_id = get_user_club_id(auth.uid()));
CREATE POLICY "Users can insert own club players" ON public.club_players FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "Users can delete own club players" ON public.club_players FOR DELETE TO authenticated USING (club_id = get_user_club_id(auth.uid()));

-- Rival teams table
CREATE TABLE public.club_rival_teams (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  club_id uuid NOT NULL,
  user_id uuid NOT NULL,
  club_name text NOT NULL,
  city text NOT NULL DEFAULT '',
  region text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.club_rival_teams ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own club rival teams" ON public.club_rival_teams FOR SELECT TO authenticated USING (club_id = get_user_club_id(auth.uid()));
CREATE POLICY "Users can insert own club rival teams" ON public.club_rival_teams FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "Users can delete own club rival teams" ON public.club_rival_teams FOR DELETE TO authenticated USING (club_id = get_user_club_id(auth.uid()));

-- Tournaments table
CREATE TABLE public.club_tournaments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  club_id uuid NOT NULL,
  user_id uuid NOT NULL,
  name text NOT NULL,
  date text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.club_tournaments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own club tournaments" ON public.club_tournaments FOR SELECT TO authenticated USING (club_id = get_user_club_id(auth.uid()));
CREATE POLICY "Users can insert own club tournaments" ON public.club_tournaments FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "Users can delete own club tournaments" ON public.club_tournaments FOR DELETE TO authenticated USING (club_id = get_user_club_id(auth.uid()));

-- Games table (completed games with JSONB for detailed sub-data)
CREATE TABLE public.club_games (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  club_id uuid NOT NULL,
  user_id uuid NOT NULL,
  opponent_name text NOT NULL,
  date timestamptz NOT NULL DEFAULT now(),
  category text NOT NULL DEFAULT 'U15',
  roster jsonb NOT NULL DEFAULT '[]',
  shots jsonb NOT NULL DEFAULT '[]',
  actions jsonb NOT NULL DEFAULT '[]',
  substitutions jsonb NOT NULL DEFAULT '[]',
  opponent_scores jsonb NOT NULL DEFAULT '[]',
  on_court_player_ids jsonb NOT NULL DEFAULT '[]',
  court_time_ms jsonb NOT NULL DEFAULT '{}',
  current_quarter text NOT NULL DEFAULT 'Q1',
  tournament_id text,
  opponent_team_id text,
  leg text,
  is_home boolean,
  game_start_timestamp bigint,
  last_timer_snapshot bigint,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.club_games ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own club games" ON public.club_games FOR SELECT TO authenticated USING (club_id = get_user_club_id(auth.uid()));
CREATE POLICY "Users can insert own club games" ON public.club_games FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "Users can update own club games" ON public.club_games FOR UPDATE TO authenticated USING (club_id = get_user_club_id(auth.uid()));
CREATE POLICY "Users can delete own club games" ON public.club_games FOR DELETE TO authenticated USING (club_id = get_user_club_id(auth.uid()));
