
-- 1) Restrict 'Students' table SELECT to faculty only
DROP POLICY IF EXISTS "Authenticated users can view students" ON public."Students";
CREATE POLICY "Faculty can view students"
  ON public."Students"
  FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'faculty'::public.app_role));

-- 2) Move has_role SECURITY DEFINER function out of the PostgREST-exposed schema
CREATE SCHEMA IF NOT EXISTS private;
REVOKE ALL ON SCHEMA private FROM PUBLIC, anon, authenticated;
GRANT USAGE ON SCHEMA private TO authenticated;

CREATE OR REPLACE FUNCTION private.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$$;

REVOKE ALL ON FUNCTION private.has_role(uuid, public.app_role) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION private.has_role(uuid, public.app_role) TO authenticated;

-- Recreate dependent RLS policies to use the private helper
DROP POLICY IF EXISTS "Users can view own profile or faculty can view all" ON public.profiles;
CREATE POLICY "Users can view own profile or faculty can view all"
  ON public.profiles
  FOR SELECT
  TO authenticated
  USING ((auth.uid() = user_id) OR private.has_role(auth.uid(), 'faculty'::public.app_role));

DROP POLICY IF EXISTS "Students view own profile; faculty view all" ON public.student_profiles;
CREATE POLICY "Students view own profile; faculty view all"
  ON public.student_profiles
  FOR SELECT
  TO authenticated
  USING ((auth.uid() = user_id) OR private.has_role(auth.uid(), 'faculty'::public.app_role));

DROP POLICY IF EXISTS "Faculty can view students" ON public."Students";
CREATE POLICY "Faculty can view students"
  ON public."Students"
  FOR SELECT
  TO authenticated
  USING (private.has_role(auth.uid(), 'faculty'::public.app_role));

-- Drop the exposed public.has_role; nothing references it now
DROP FUNCTION IF EXISTS public.has_role(uuid, public.app_role);
