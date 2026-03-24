
-- 1. Create plan enum
CREATE TYPE public.org_plan AS ENUM ('free', 'pro', 'elite');

-- 2. Create organizations table
CREATE TABLE public.organizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  logo_url TEXT DEFAULT '',
  plan public.org_plan NOT NULL DEFAULT 'free',
  max_staff INTEGER NOT NULL DEFAULT 3,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL
);

-- 3. Enable RLS
ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;

-- 4. Global roles can do everything
CREATE POLICY "Global roles can manage organizations"
  ON public.organizations FOR ALL
  TO authenticated
  USING (public.is_global_role(auth.uid()))
  WITH CHECK (public.is_global_role(auth.uid()));

-- 5. Members can view their own organization
CREATE POLICY "Members can view their organization"
  ON public.organizations FOR SELECT
  TO authenticated
  USING (id = public.get_user_club_id(auth.uid()));

-- 6. Insert existing club_ids as organizations (migrate)
INSERT INTO public.organizations (id, name)
SELECT DISTINCT p.club_id, COALESCE(p.my_team_name, 'Mi Club')
FROM public.profiles p
ON CONFLICT (id) DO NOTHING;

-- 7. Add organization_id column to profiles referencing organizations
-- (club_id already exists and serves this purpose, so we add FK)
-- We can't add FK directly because club_id was auto-generated and may not match,
-- but we just inserted them above so they should match now.
