-- Function: list users in admin's own club (for non-global admins)
CREATE OR REPLACE FUNCTION public.club_list_users()
RETURNS TABLE(
  user_id uuid,
  email text,
  full_name text,
  club_id uuid,
  role text,
  created_at timestamp with time zone,
  last_sign_in_at timestamp with time zone,
  email_confirmed_at timestamp with time zone
)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT 
    u.id as user_id,
    u.email::text,
    p.full_name,
    p.club_id,
    COALESCE(ur.role::text, 'sin rol') as role,
    u.created_at,
    u.last_sign_in_at,
    u.email_confirmed_at
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
$$;

-- Function: assign existing user (by email) to caller's club with a specific role
CREATE OR REPLACE FUNCTION public.club_assign_user(
  _email text,
  _role app_role
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  caller_club_id uuid;
  target_user_id uuid;
  allowed_roles app_role[] := ARRAY['coach', 'club_staff', 'fan']::app_role[];
BEGIN
  -- Authorization: only club admins (any tier) or global roles
  IF NOT (
    public.has_role(auth.uid(), 'club_admin'::app_role)
    OR public.has_role(auth.uid(), 'club_admin_pro'::app_role)
    OR public.has_role(auth.uid(), 'club_admin_elite'::app_role)
    OR public.is_global_role(auth.uid())
  ) THEN
    RAISE EXCEPTION 'No autorizado para gestionar usuarios del club';
  END IF;

  -- Restrict assignable roles
  IF NOT (_role = ANY(allowed_roles)) THEN
    RAISE EXCEPTION 'Solo se pueden asignar los roles: coach, club_staff, fan';
  END IF;

  caller_club_id := public.get_user_club_id(auth.uid());
  IF caller_club_id IS NULL THEN
    RAISE EXCEPTION 'No se pudo determinar el club del administrador';
  END IF;

  -- Find target user by email
  SELECT id INTO target_user_id
  FROM auth.users
  WHERE lower(email) = lower(_email)
  LIMIT 1;

  IF target_user_id IS NULL THEN
    RAISE EXCEPTION 'No existe ningún usuario registrado con ese email';
  END IF;

  IF target_user_id = auth.uid() THEN
    RAISE EXCEPTION 'No podés modificar tu propio rol desde esta pantalla';
  END IF;

  -- Move user to caller's club
  UPDATE public.profiles
  SET club_id = caller_club_id, updated_at = now()
  WHERE user_id = target_user_id;

  -- Replace user's roles with the assigned one (clean slate within club scope)
  DELETE FROM public.user_roles WHERE user_id = target_user_id;
  INSERT INTO public.user_roles (user_id, role) VALUES (target_user_id, _role);

  RETURN jsonb_build_object(
    'success', true,
    'user_id', target_user_id,
    'club_id', caller_club_id,
    'role', _role
  );
END;
$$;

-- Function: remove a user from caller's club (revoke access, keep auth account)
CREATE OR REPLACE FUNCTION public.club_remove_user(_target_user_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
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

  -- Reassign to a fresh empty club_id (revokes RLS access to original club's data)
  UPDATE public.profiles
  SET club_id = new_orphan_club_id, updated_at = now()
  WHERE user_id = _target_user_id;

  -- Remove all role assignments
  DELETE FROM public.user_roles WHERE user_id = _target_user_id;

  RETURN jsonb_build_object('success', true, 'user_id', _target_user_id);
END;
$$;