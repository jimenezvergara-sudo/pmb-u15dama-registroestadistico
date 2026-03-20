
-- Tournament teams (clubs participating in a tournament)
CREATE TABLE public.tournament_teams (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tournament_id TEXT NOT NULL,
  team_name TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.tournament_teams ENABLE ROW LEVEL SECURITY;

-- Anyone authenticated can view
CREATE POLICY "Authenticated can view tournament teams"
  ON public.tournament_teams FOR SELECT TO authenticated
  USING (true);

-- Only global roles can manage
CREATE POLICY "Global roles can insert tournament teams"
  ON public.tournament_teams FOR INSERT TO authenticated
  WITH CHECK (is_global_role(auth.uid()));

CREATE POLICY "Global roles can delete tournament teams"
  ON public.tournament_teams FOR DELETE TO authenticated
  USING (is_global_role(auth.uid()));

-- Tournament matches (results)
CREATE TABLE public.tournament_matches (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tournament_id TEXT NOT NULL,
  home_team_id UUID NOT NULL REFERENCES public.tournament_teams(id) ON DELETE CASCADE,
  away_team_id UUID NOT NULL REFERENCES public.tournament_teams(id) ON DELETE CASCADE,
  home_score INTEGER NOT NULL DEFAULT 0,
  away_score INTEGER NOT NULL DEFAULT 0,
  played_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  recorded_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.tournament_matches ENABLE ROW LEVEL SECURITY;

-- Anyone authenticated can view
CREATE POLICY "Authenticated can view tournament matches"
  ON public.tournament_matches FOR SELECT TO authenticated
  USING (true);

-- Only global roles can manage results
CREATE POLICY "Global roles can insert matches"
  ON public.tournament_matches FOR INSERT TO authenticated
  WITH CHECK (is_global_role(auth.uid()));

CREATE POLICY "Global roles can update matches"
  ON public.tournament_matches FOR UPDATE TO authenticated
  USING (is_global_role(auth.uid()));

CREATE POLICY "Global roles can delete matches"
  ON public.tournament_matches FOR DELETE TO authenticated
  USING (is_global_role(auth.uid()));
