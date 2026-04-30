
-- 1. Add columns
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS assigned_category text;
ALTER TABLE public.club_rival_teams ADD COLUMN IF NOT EXISTS category text;
ALTER TABLE public.club_tournaments ADD COLUMN IF NOT EXISTS category text;
ALTER TABLE public.club_players ADD COLUMN IF NOT EXISTS category text;

UPDATE public.club_rival_teams SET category = 'U15' WHERE category IS NULL;
UPDATE public.club_tournaments SET category = 'U15' WHERE category IS NULL;
UPDATE public.club_players SET category = 'U15' WHERE category IS NULL;

-- 2. Helpers
CREATE OR REPLACE FUNCTION public.get_user_assigned_category(_user_id uuid)
RETURNS text LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT assigned_category FROM public.profiles WHERE user_id = _user_id LIMIT 1
$$;

CREATE OR REPLACE FUNCTION public.can_modify_category(_user_id uuid, _category text)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT
    public.is_global_role(_user_id)
    OR public.has_role(_user_id, 'club_admin'::app_role)
    OR public.has_role(_user_id, 'club_admin_pro'::app_role)
    OR public.has_role(_user_id, 'club_admin_elite'::app_role)
    OR (
      public.get_user_assigned_category(_user_id) IS NULL
      OR public.get_user_assigned_category(_user_id) = _category
    )
$$;

-- 3. RLS for club_games
DROP POLICY IF EXISTS "Users can insert own club games" ON public.club_games;
DROP POLICY IF EXISTS "Users can update own club games" ON public.club_games;
DROP POLICY IF EXISTS "Users can delete own club games" ON public.club_games;

CREATE POLICY "Users can insert games in allowed category" ON public.club_games
FOR INSERT TO authenticated
WITH CHECK (user_id = auth.uid() AND public.can_modify_category(auth.uid(), category));

CREATE POLICY "Users can update games in allowed category" ON public.club_games
FOR UPDATE TO authenticated
USING (club_id = public.get_user_club_id(auth.uid()) AND public.can_modify_category(auth.uid(), category));

CREATE POLICY "Users can delete games in allowed category" ON public.club_games
FOR DELETE TO authenticated
USING (club_id = public.get_user_club_id(auth.uid()) AND public.can_modify_category(auth.uid(), category));

-- 4. RLS for club_rival_teams
DROP POLICY IF EXISTS "Users can insert own club rival teams" ON public.club_rival_teams;
DROP POLICY IF EXISTS "Users can delete own club rival teams" ON public.club_rival_teams;

CREATE POLICY "Users can insert rivals in allowed category" ON public.club_rival_teams
FOR INSERT TO authenticated
WITH CHECK (user_id = auth.uid() AND public.can_modify_category(auth.uid(), category));

CREATE POLICY "Users can delete rivals in allowed category" ON public.club_rival_teams
FOR DELETE TO authenticated
USING (club_id = public.get_user_club_id(auth.uid()) AND public.can_modify_category(auth.uid(), category));

-- 5. RLS for club_tournaments
DROP POLICY IF EXISTS "Users can insert own club tournaments" ON public.club_tournaments;
DROP POLICY IF EXISTS "Users can delete own club tournaments" ON public.club_tournaments;

CREATE POLICY "Users can insert tournaments in allowed category" ON public.club_tournaments
FOR INSERT TO authenticated
WITH CHECK (user_id = auth.uid() AND public.can_modify_category(auth.uid(), category));

CREATE POLICY "Users can delete tournaments in allowed category" ON public.club_tournaments
FOR DELETE TO authenticated
USING (club_id = public.get_user_club_id(auth.uid()) AND public.can_modify_category(auth.uid(), category));

-- 6. RLS for club_players
DROP POLICY IF EXISTS "Users can insert own club players" ON public.club_players;
DROP POLICY IF EXISTS "Users can update own club players" ON public.club_players;
DROP POLICY IF EXISTS "Users can delete own club players" ON public.club_players;

CREATE POLICY "Users can insert players in allowed category" ON public.club_players
FOR INSERT TO authenticated
WITH CHECK (user_id = auth.uid() AND public.can_modify_category(auth.uid(), category));

CREATE POLICY "Users can update players in allowed category" ON public.club_players
FOR UPDATE TO authenticated
USING (club_id = public.get_user_club_id(auth.uid()) AND public.can_modify_category(auth.uid(), category))
WITH CHECK (club_id = public.get_user_club_id(auth.uid()) AND public.can_modify_category(auth.uid(), category));

CREATE POLICY "Users can delete players in allowed category" ON public.club_players
FOR DELETE TO authenticated
USING (club_id = public.get_user_club_id(auth.uid()) AND public.can_modify_category(auth.uid(), category));

-- 7. Update club_assign_user with optional category
DROP FUNCTION IF EXISTS public.club_assign_user(text, app_role);

CREATE OR REPLACE FUNCTION public.club_assign_user(
  _email text, _role app_role, _category text DEFAULT NULL
)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $function$
DECLARE
  caller_club_id uuid;
  target_user_id uuid;
  allowed_roles app_role[] := ARRAY['coach', 'club_staff', 'fan']::app_role[];
BEGIN
  IF NOT (
    public.has_role(auth.uid(), 'club_admin'::app_role)
    OR public.has_role(auth.uid(), 'club_admin_pro'::app_role)
    OR public.has_role(auth.uid(), 'club_admin_elite'::app_role)
    OR public.is_global_role(auth.uid())
  ) THEN
    RAISE EXCEPTION 'No autorizado para gestionar usuarios del club';
  END IF;

  IF NOT (_role = ANY(allowed_roles)) THEN
    RAISE EXCEPTION 'Solo se pueden asignar los roles: coach, club_staff, fan';
  END IF;

  caller_club_id := public.get_user_club_id(auth.uid());
  IF caller_club_id IS NULL THEN
    RAISE EXCEPTION 'No se pudo determinar el club del administrador';
  END IF;

  SELECT id INTO target_user_id FROM auth.users WHERE lower(email) = lower(_email) LIMIT 1;

  IF target_user_id IS NULL THEN
    RAISE EXCEPTION 'No existe ningún usuario registrado con ese email';
  END IF;

  IF target_user_id = auth.uid() THEN
    RAISE EXCEPTION 'No podés modificar tu propio rol desde esta pantalla';
  END IF;

  UPDATE public.profiles
  SET club_id = caller_club_id, assigned_category = _category, updated_at = now()
  WHERE user_id = target_user_id;

  DELETE FROM public.user_roles WHERE user_id = target_user_id;
  INSERT INTO public.user_roles (user_id, role) VALUES (target_user_id, _role);

  RETURN jsonb_build_object('success', true, 'user_id', target_user_id, 'role', _role, 'category', _category);
END;
$function$;

-- 8. Update club_list_users with assigned_category (DROP first since return type changes)
DROP FUNCTION IF EXISTS public.club_list_users();

CREATE OR REPLACE FUNCTION public.club_list_users()
RETURNS TABLE(
  user_id uuid, email text, full_name text, club_id uuid, role text,
  assigned_category text,
  created_at timestamp with time zone, last_sign_in_at timestamp with time zone,
  email_confirmed_at timestamp with time zone
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public' AS $function$
  SELECT 
    u.id, u.email::text, p.full_name, p.club_id,
    COALESCE(ur.role::text, 'sin rol'),
    p.assigned_category,
    u.created_at, u.last_sign_in_at, u.email_confirmed_at
  FROM auth.users u
  INNER JOIN public.profiles p ON p.user_id = u.id
  LEFT JOIN public.user_roles ur ON ur.user_id = u.id
  WHERE p.club_id = public.get_user_club_id(auth.uid())
    AND (
      public.has_role(auth.uid(), 'club_admin'::app_role)
      OR public.has_role(auth.uid(), 'club_admin_pro'::app_role)
      OR public.has_role(auth.uid(), 'club_admin_elite'::app_role)
      OR public.is_global_role(auth.uid())
    )
  ORDER BY u.created_at DESC;
$function$;

-- 9. Update club_remove_user to clear assigned_category
CREATE OR REPLACE FUNCTION public.club_remove_user(_target_user_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $function$
DECLARE
  caller_club_id uuid;
  target_club_id uuid;
  new_orphan_club_id uuid := gen_random_uuid();
BEGIN
  IF NOT (
    public.has_role(auth.uid(), 'club_admin'::app_role)
    OR public.has_role(auth.uid(), 'club_admin_pro'::app_role)
    OR public.has_role(auth.uid(), 'club_admin_elite'::app_role)
    OR public.is_global_role(auth.uid())
  ) THEN
    RAISE EXCEPTION 'No autorizado';
  END IF;

  IF _target_user_id = auth.uid() THEN
    RAISE EXCEPTION 'No podés removerte a vos mismo del club';
  END IF;

  caller_club_id := public.get_user_club_id(auth.uid());
  SELECT club_id INTO target_club_id FROM public.profiles WHERE user_id = _target_user_id;

  IF target_club_id IS DISTINCT FROM caller_club_id AND NOT public.is_global_role(auth.uid()) THEN
    RAISE EXCEPTION 'El usuario no pertenece a tu club';
  END IF;

  UPDATE public.profiles
  SET club_id = new_orphan_club_id, assigned_category = NULL, updated_at = now()
  WHERE user_id = _target_user_id;

  DELETE FROM public.user_roles WHERE user_id = _target_user_id;

  RETURN jsonb_build_object('success', true, 'user_id', _target_user_id);
END;
$function$;
