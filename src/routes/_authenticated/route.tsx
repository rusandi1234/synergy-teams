import { createFileRoute, Outlet, redirect, useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { LogOut, Sparkles } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { AppLayout } from "@/components/AppLayout";
import { resetSynergy } from "@/lib/synergy";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: async () => {
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) throw redirect({ to: "/auth" });
    return { user: data.user };
  },
  component: AuthLayout,
});

function AuthLayout() {
  const { user } = Route.useRouteContext();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const onSignOut = async () => {
    await queryClient.cancelQueries();
    queryClient.clear();
    resetSynergy();
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  };

  return (
    <AppLayout
      user={{ email: user.email ?? "Faculty" }}
      onSignOut={onSignOut}
    >
      <Outlet />
    </AppLayout>
  );
}

// Silence unused warnings for icons exported only for clarity
void Sparkles;
void LogOut;
