
-- 1. Add new enum values
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'system_operator';
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'club_admin_elite';
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'club_admin_pro';
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'club_staff';
