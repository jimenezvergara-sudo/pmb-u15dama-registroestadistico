
-- 2. Helper function: is this a global role (bypasses club_id)?
CREATE OR REPLACE FUNCTION public.is_global_role(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id
      AND role IN ('super_admin', 'system_operator')
  )
$$;

-- 3. Update handle_new_user to assign club_admin_elite by default
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  new_club_id UUID := gen_random_uuid();
BEGIN
  INSERT INTO public.profiles (user_id, full_name, club_id)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    new_club_id
  );
  
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'club_admin_elite');
  
  RETURN NEW;
END;
$$;

-- 4. Update RLS: profiles SELECT - global roles bypass club_id
DROP POLICY IF EXISTS "Users can view profiles in their club" ON public.profiles;
CREATE POLICY "Users can view profiles in their club or global"
  ON public.profiles FOR SELECT TO authenticated
  USING (
    is_global_role(auth.uid())
    OR club_id = get_user_club_id(auth.uid())
  );

-- 5. Update RLS: user_roles SELECT - global roles see all
DROP POLICY IF EXISTS "Users can view roles in their club" ON public.user_roles;
CREATE POLICY "Users can view roles in their club or global"
  ON public.user_roles FOR SELECT TO authenticated
  USING (
    is_global_role(auth.uid())
    OR EXISTS (
      SELECT 1 FROM profiles p1, profiles p2
      WHERE p1.user_id = auth.uid()
        AND p2.user_id = user_roles.user_id
        AND p1.club_id = p2.club_id
    )
  );

-- 6. Update RLS: user_roles INSERT - global roles or club_admin_elite can manage
DROP POLICY IF EXISTS "Club admins can manage roles" ON public.user_roles;
CREATE POLICY "Admins can manage roles"
  ON public.user_roles FOR INSERT TO authenticated
  WITH CHECK (
    is_global_role(auth.uid())
    OR has_role(auth.uid(), 'club_admin_elite')
  );

-- 7. Update RLS: user_roles DELETE
DROP POLICY IF EXISTS "Club admins can delete roles" ON public.user_roles;
CREATE POLICY "Admins can delete roles"
  ON public.user_roles FOR DELETE TO authenticated
  USING (
    is_global_role(auth.uid())
    OR has_role(auth.uid(), 'club_admin_elite')
  );
