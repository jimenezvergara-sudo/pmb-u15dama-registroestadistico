-- (1) Fan never modifies game data, even when assigned_category is NULL
CREATE OR REPLACE FUNCTION public.can_modify_category(_user_id uuid, _category text)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT
    -- Fan rol explícito nunca puede modificar
    NOT EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = _user_id AND role = 'fan'::app_role
    )
    AND (
      public.is_global_role(_user_id)
      OR public.has_role(_user_id, 'club_admin'::app_role)
      OR public.has_role(_user_id, 'club_admin_pro'::app_role)
      OR public.has_role(_user_id, 'club_admin_elite'::app_role)
      OR (
        -- Coach/staff: requiere categoría asignada que coincida.
        -- Si NO tiene assigned_category, ya no puede modificar nada (cierra la escalada).
        public.get_user_assigned_category(_user_id) IS NOT NULL
        AND public.get_user_assigned_category(_user_id) = _category
      )
    );
$function$;

-- Helper: ¿el usuario es solo fan (sin ningún otro rol superior)?
CREATE OR REPLACE FUNCTION public.is_fan_only(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = 'fan'::app_role
  )
  AND NOT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id
      AND role IN (
        'super_admin'::app_role, 'system_operator'::app_role,
        'club_admin'::app_role, 'club_admin_pro'::app_role, 'club_admin_elite'::app_role,
        'coach'::app_role, 'club_staff'::app_role
      )
  );
$function$;

-- (5) profiles: fan solo ve su propio registro
DROP POLICY IF EXISTS "Users can view profiles in their club or global" ON public.profiles;
CREATE POLICY "Users can view profiles in their club or global"
ON public.profiles FOR SELECT
TO authenticated
USING (
  user_id = auth.uid()
  OR (
    NOT public.is_fan_only(auth.uid())
    AND (
      public.is_global_role(auth.uid())
      OR club_id = public.get_user_club_id(auth.uid())
    )
  )
);

-- (5) user_roles: fan solo ve su propio rol
DROP POLICY IF EXISTS "Users can view roles in their club or global" ON public.user_roles;
CREATE POLICY "Users can view roles in their club or global"
ON public.user_roles FOR SELECT
TO authenticated
USING (
  user_id = auth.uid()
  OR (
    NOT public.is_fan_only(auth.uid())
    AND (
      public.is_global_role(auth.uid())
      OR EXISTS (
        SELECT 1
        FROM public.profiles p1, public.profiles p2
        WHERE p1.user_id = auth.uid()
          AND p2.user_id = user_roles.user_id
          AND p1.club_id = p2.club_id
      )
    )
  )
);