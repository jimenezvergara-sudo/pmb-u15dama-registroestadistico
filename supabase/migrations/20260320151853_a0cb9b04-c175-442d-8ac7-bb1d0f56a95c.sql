
-- Table for shared stats snapshots (public access for viewers)
CREATE TABLE public.shared_stats (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  club_id uuid NOT NULL,
  title text NOT NULL DEFAULT 'Mis Estadísticas',
  data jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz DEFAULT (now() + interval '30 days')
);

ALTER TABLE public.shared_stats ENABLE ROW LEVEL SECURITY;

-- Anyone (including anonymous) can view shared stats
CREATE POLICY "Anyone can view shared stats"
ON public.shared_stats FOR SELECT
TO anon, authenticated
USING (expires_at > now());

-- Authenticated users can create their own shares
CREATE POLICY "Users can insert own shared stats"
ON public.shared_stats FOR INSERT
TO authenticated
WITH CHECK (user_id = auth.uid());

-- Users can delete their own shares
CREATE POLICY "Users can delete own shared stats"
ON public.shared_stats FOR DELETE
TO authenticated
USING (user_id = auth.uid());

-- Table for internal analytics tracking
CREATE TABLE public.page_views (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id text NOT NULL,
  page text NOT NULL,
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  referrer text,
  user_agent text,
  is_public_view boolean NOT NULL DEFAULT false,
  share_id uuid REFERENCES public.shared_stats(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  duration_seconds integer DEFAULT 0
);

ALTER TABLE public.page_views ENABLE ROW LEVEL SECURITY;

-- Anyone can insert page views (including anonymous visitors)
CREATE POLICY "Anyone can insert page views"
ON public.page_views FOR INSERT
TO anon, authenticated
WITH CHECK (true);

-- Only global roles can read analytics
CREATE POLICY "Global roles can view analytics"
ON public.page_views FOR SELECT
TO authenticated
USING (is_global_role(auth.uid()));
