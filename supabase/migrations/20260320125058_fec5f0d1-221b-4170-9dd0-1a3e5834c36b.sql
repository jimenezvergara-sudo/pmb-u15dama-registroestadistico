
-- Create global_ads table
CREATE TABLE public.global_ads (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  image_url TEXT NOT NULL,
  destination_link TEXT NOT NULL DEFAULT '',
  active BOOLEAN NOT NULL DEFAULT true,
  priority INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.global_ads ENABLE ROW LEVEL SECURITY;

-- Everyone authenticated can read active ads
CREATE POLICY "Authenticated can view active ads"
  ON public.global_ads FOR SELECT TO authenticated
  USING (true);

-- Only global roles can manage ads
CREATE POLICY "Global roles can insert ads"
  ON public.global_ads FOR INSERT TO authenticated
  WITH CHECK (is_global_role(auth.uid()));

CREATE POLICY "Global roles can update ads"
  ON public.global_ads FOR UPDATE TO authenticated
  USING (is_global_role(auth.uid()));

CREATE POLICY "Global roles can delete ads"
  ON public.global_ads FOR DELETE TO authenticated
  USING (is_global_role(auth.uid()));
