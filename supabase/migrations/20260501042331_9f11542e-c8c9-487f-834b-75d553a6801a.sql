-- 1. Estado de invitaciones
DO $$ BEGIN
  CREATE TYPE public.invitation_status AS ENUM ('pending', 'accepted', 'expired', 'cancelled');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- 2. Tabla club_invitations
CREATE TABLE IF NOT EXISTS public.club_invitations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL,
  club_id uuid NOT NULL,
  role public.app_role NOT NULL,
  assigned_category text,
  status public.invitation_status NOT NULL DEFAULT 'pending',
  invited_by uuid NOT NULL,
  invited_by_name text,
  created_at timestamptz NOT NULL DEFAULT now(),
  accepted_at timestamptz,
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '7 days')
);

CREATE INDEX IF NOT EXISTS idx_club_invitations_club ON public.club_invitations(club_id);
CREATE INDEX IF NOT EXISTS idx_club_invitations_email ON public.club_invitations(lower(email));
CREATE INDEX IF NOT EXISTS idx_club_invitations_status ON public.club_invitations(status);

ALTER TABLE public.club_invitations ENABLE ROW LEVEL SECURITY;

-- 3. RLS: solo admins del club o roles globales gestionan
DROP POLICY IF EXISTS "Club admins view invitations" ON public.club_invitations;
CREATE POLICY "Club admins view invitations"
ON public.club_invitations FOR SELECT TO authenticated
USING (
  public.is_global_role(auth.uid())
  OR (
    club_id = public.get_user_club_id(auth.uid())
    AND (
      public.has_role(auth.uid(), 'club_admin'::app_role)
      OR public.has_role(auth.uid(), 'club_admin_pro'::app_role)
      OR public.has_role(auth.uid(), 'club_admin_elite'::app_role)
    )
  )
);

DROP POLICY IF EXISTS "Club admins insert invitations" ON public.club_invitations;
CREATE POLICY "Club admins insert invitations"
ON public.club_invitations FOR INSERT TO authenticated
WITH CHECK (
  public.is_global_role(auth.uid())
  OR (
    club_id = public.get_user_club_id(auth.uid())
    AND invited_by = auth.uid()
    AND (
      public.has_role(auth.uid(), 'club_admin'::app_role)
      OR public.has_role(auth.uid(), 'club_admin_pro'::app_role)
      OR public.has_role(auth.uid(), 'club_admin_elite'::app_role)
    )
  )
);

DROP POLICY IF EXISTS "Club admins update invitations" ON public.club_invitations;
CREATE POLICY "Club admins update invitations"
ON public.club_invitations FOR UPDATE TO authenticated
USING (
  public.is_global_role(auth.uid())
  OR (
    club_id = public.get_user_club_id(auth.uid())
    AND (
      public.has_role(auth.uid(), 'club_admin'::app_role)
      OR public.has_role(auth.uid(), 'club_admin_pro'::app_role)
      OR public.has_role(auth.uid(), 'club_admin_elite'::app_role)
    )
  )
);

DROP POLICY IF EXISTS "Club admins delete invitations" ON public.club_invitations;
CREATE POLICY "Club admins delete invitations"
ON public.club_invitations FOR DELETE TO authenticated
USING (
  public.is_global_role(auth.uid())
  OR (
    club_id = public.get_user_club_id(auth.uid())
    AND (
      public.has_role(auth.uid(), 'club_admin'::app_role)
      OR public.has_role(auth.uid(), 'club_admin_pro'::app_role)
      OR public.has_role(auth.uid(), 'club_admin_elite'::app_role)
    )
  )
);

-- 4. Reescribir handle_new_user para respetar metadata de invitación
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  meta_club_id uuid;
  meta_role text;
  meta_category text;
  final_club_id uuid;
  final_role public.app_role;
BEGIN
  meta_club_id := NULLIF(NEW.raw_user_meta_data->>'invited_club_id','')::uuid;
  meta_role := NULLIF(NEW.raw_user_meta_data->>'invited_role','');
  meta_category := NULLIF(NEW.raw_user_meta_data->>'invited_category','');

  IF meta_club_id IS NOT NULL AND meta_role IS NOT NULL THEN
    final_club_id := meta_club_id;
    final_role := meta_role::public.app_role;
  ELSE
    final_club_id := gen_random_uuid();
    final_role := 'club_admin_elite'::public.app_role;
  END IF;

  INSERT INTO public.profiles (user_id, full_name, club_id, assigned_category)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    final_club_id,
    meta_category
  );

  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, final_role);

  -- marcar invitación como aceptada si corresponde
  IF meta_club_id IS NOT NULL THEN
    UPDATE public.club_invitations
    SET status = 'accepted', accepted_at = now()
    WHERE lower(email) = lower(NEW.email)
      AND club_id = meta_club_id
      AND status = 'pending';
  END IF;

  RETURN NEW;
END;
$function$;