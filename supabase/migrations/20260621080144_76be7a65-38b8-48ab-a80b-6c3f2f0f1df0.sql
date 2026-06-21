-- Table grants (RLS still enforces row-level access)
GRANT SELECT, INSERT, UPDATE, DELETE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.student_profiles TO authenticated;
GRANT ALL ON public.student_profiles TO service_role;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.faculty_profiles TO authenticated;
GRANT ALL ON public.faculty_profiles TO service_role;

GRANT SELECT, INSERT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;

GRANT SELECT ON public."Students" TO authenticated;
GRANT ALL ON public."Students" TO service_role;

-- has_role() is SECURITY DEFINER but still requires EXECUTE for the calling role
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated, service_role;