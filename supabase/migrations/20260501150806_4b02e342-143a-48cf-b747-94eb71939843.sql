-- Tabla de configuración de rama por categoría dentro de cada club
CREATE TYPE public.team_branch AS ENUM ('femenino', 'masculino', 'mixto');

CREATE TABLE public.club_categories (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  club_id UUID NOT NULL,
  category TEXT NOT NULL,
  rama public.team_branch NOT NULL DEFAULT 'femenino',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE (club_id, category)
);

ALTER TABLE public.club_categories ENABLE ROW LEVEL SECURITY;

-- Cualquier miembro del club ve la configuración (necesario para que la UI lea la rama)
CREATE POLICY "Members view club categories"
ON public.club_categories FOR SELECT
TO authenticated
USING (club_id = public.get_user_club_id(auth.uid()) OR public.is_global_role(auth.uid()));

-- Solo admins del club o globales pueden gestionar la rama
CREATE POLICY "Club admins insert categories"
ON public.club_categories FOR INSERT
TO authenticated
WITH CHECK (
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

CREATE POLICY "Club admins update categories"
ON public.club_categories FOR UPDATE
TO authenticated
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

CREATE POLICY "Club admins delete categories"
ON public.club_categories FOR DELETE
TO authenticated
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

-- Trigger updated_at
CREATE TRIGGER update_club_categories_updated_at
BEFORE UPDATE ON public.club_categories
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Helper para leer la rama de una categoría de un club (devuelve 'femenino' por defecto)
CREATE OR REPLACE FUNCTION public.get_category_rama(_club_id UUID, _category TEXT)
RETURNS public.team_branch
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    (SELECT rama FROM public.club_categories WHERE club_id = _club_id AND category = _category LIMIT 1),
    'femenino'::public.team_branch
  );
$$;