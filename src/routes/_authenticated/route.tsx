import { createFileRoute, Outlet, redirect, useNavigate, useLocation } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { AppLayout } from "@/components/AppLayout";
import { resetSynergy } from "@/lib/synergy";
import { getUserRole, useRole, type AppRole } from "@/lib/useRole";

const FACULTY_ROUTES = ["/", "/students", "/teams", "/conflicts", "/analytics", "/approvals", "/rebalancing", "/evidence", "/recommendations"];
const STUDENT_ROUTES = ["/student"];

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: async ({ location }) => {
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) throw redirect({ to: "/auth" });

    // Server-trusted role lookup (RLS-enforced) — gate before any route renders.
    let role: AppRole | null = null;
    try {
      role = await getUserRole(data.user.id);
    } catch {
      role = null;
    }

    const path = location.pathname;
    if (!role) {
      if (path !== "/complete-profile") {
        throw redirect({ to: "/complete-profile" });
      }
    } else if (role === "student") {
      if (path !== "/complete-profile" && !STUDENT_ROUTES.includes(path)) {
        throw redirect({ to: "/student" });
      }
    } else if (role === "faculty") {
      if (STUDENT_ROUTES.includes(path)) {
        throw redirect({ to: "/" });
      }
    }

    return { user: data.user, role };
  },
  component: AuthLayout,
});

function AuthLayout() {
  const { user } = Route.useRouteContext();
  const navigate = useNavigate();
  const location = useLocation();
  const queryClient = useQueryClient();
  const { data: role, isLoading, isError, error } = useRole(user.id);
  const [bootstrapped, setBootstrapped] = useState(false);

  useEffect(() => {
    if (isLoading || isError) return;
    const path = location.pathname;

    if (!role) {
      if (path !== "/complete-profile") {
        navigate({ to: "/complete-profile", replace: true });
        return;
      }
      setBootstrapped(true);
      return;
    }

    if (path === "/complete-profile") { setBootstrapped(true); return; }

    if (role === "student" && !STUDENT_ROUTES.includes(path)) {
      navigate({ to: "/student", replace: true });
      return;
    }
    if (role === "faculty" && STUDENT_ROUTES.includes(path)) {
      navigate({ to: "/", replace: true });
      return;
    }
    setBootstrapped(true);
  }, [role, isLoading, isError, location.pathname, navigate]);


  const onSignOut = async () => {
    await queryClient.cancelQueries();
    queryClient.clear();
    resetSynergy();
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  };

  if (isError) {
    const message = error instanceof Error ? error.message : "Role lookup failed.";

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

  if (!role) {
    // Profile-completion gate — minimal chrome, no sidebar
    return (
      <div className="min-h-screen bg-background p-6 md:p-10">
        <Outlet />
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

