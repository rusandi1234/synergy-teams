import { createFileRoute, Outlet, redirect, useNavigate, useLocation } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { externalSupabase, type AppRole } from "@/integrations/external-supabase/client";
import { AppLayout } from "@/components/AppLayout";
import { resetSynergy } from "@/lib/synergy";
import { useRole } from "@/lib/useRole";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: async () => {
    const { data, error } = await externalSupabase.auth.getUser();
    if (error || !data.user) throw redirect({ to: "/auth" });
    return { user: data.user };
  },
  component: AuthLayout,
});

const FACULTY_ROUTES = ["/", "/students", "/teams", "/conflicts", "/analytics"];
const STUDENT_ROUTES = ["/student"];

function AuthLayout() {
  const { user } = Route.useRouteContext();
  const navigate = useNavigate();
  const location = useLocation();
  const queryClient = useQueryClient();
  const { data: role, isLoading, isError, error } = useRole(user.id);
  const [bootstrapped, setBootstrapped] = useState(false);

  useEffect(() => {
    if (isLoading || isError || !role) return;
    const path = location.pathname;
    if (role === "student") {
      if (FACULTY_ROUTES.includes(path) && !STUDENT_ROUTES.includes(path)) {
        navigate({ to: "/student", replace: true });
        return;
      }
    } else if (role === "faculty") {
      if (STUDENT_ROUTES.includes(path)) {
        navigate({ to: "/", replace: true });
        return;
      }
    }
    setBootstrapped(true);
  }, [role, isLoading, isError, location.pathname, navigate]);

  const onSignOut = async () => {
    await queryClient.cancelQueries();
    queryClient.clear();
    resetSynergy();
    await externalSupabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  };

  if (isError || (!isLoading && !role)) {
    const message = error instanceof Error ? error.message : "No role is assigned to this account.";
    return (
      <div className="min-h-screen grid place-items-center bg-background p-6 text-center">
        <div className="max-w-sm space-y-3">
          <h1 className="text-lg font-semibold">Role verification required</h1>
          <p className="text-sm text-muted-foreground">{message}</p>
          <button type="button" onClick={onSignOut} className="btn-primary mx-auto">
            Sign out
          </button>
        </div>
      </div>
    );
  }

  if (isLoading || !bootstrapped) {
    return (
      <div className="min-h-screen grid place-items-center bg-background text-sm text-muted-foreground">
        Loading workspace…
      </div>
    );
  }

  return (
    <AppLayout
      user={{ email: user.email ?? "User" }}
      role={role as AppRole}
      onSignOut={onSignOut}
    >
      <Outlet />
    </AppLayout>
  );
}
