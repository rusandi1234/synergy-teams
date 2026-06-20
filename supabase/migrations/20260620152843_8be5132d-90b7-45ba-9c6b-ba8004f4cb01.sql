
-- Tighten profiles SELECT: self or faculty
DROP POLICY IF EXISTS "Profiles are viewable by authenticated users" ON public.profiles;
CREATE POLICY "Users can view own profile or faculty can view all"
  ON public.profiles FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'faculty'));

-- Tighten student_profiles SELECT: self or faculty
DROP POLICY IF EXISTS "Authenticated can view student profiles" ON public.student_profiles;
CREATE POLICY "Students view own profile; faculty view all"
  ON public.student_profiles FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'faculty'));

-- Tighten faculty_profiles SELECT: self only (other faculty don't need PII either; relax later if needed)
DROP POLICY IF EXISTS "Authenticated can view faculty profiles" ON public.faculty_profiles;
CREATE POLICY "Faculty view own profile"
  ON public.faculty_profiles FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

-- Prevent privilege escalation: only allow self-assigning the 'student' role.
-- Faculty must be promoted by an admin via service_role (not self-service).
DROP POLICY IF EXISTS "Users can assign their own role" ON public.user_roles;
CREATE POLICY "Users can self-assign student role only"
  ON public.user_roles FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id AND role = 'student'::public.app_role);

-- Lock down SECURITY DEFINER helper: it's only used inside RLS policies,
-- which run with elevated rights, so authenticated users don't need EXECUTE.
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) FROM PUBLIC, anon, authenticated;
