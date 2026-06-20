import { useQuery } from "@tanstack/react-query";
import { externalSupabase, type AppRole } from "@/integrations/external-supabase/client";

export function useRole(userId: string | undefined) {
  return useQuery({
    queryKey: ["user-role", userId],
    enabled: !!userId,
    queryFn: async (): Promise<AppRole> => {
      const { data, error } = await externalSupabase
        .from("user_roles")
        .select("role")
        .eq("user_id", userId!)
        .order("role", { ascending: true });
      if (error) throw error;
      const roles = (data ?? []).map(r => r.role as AppRole);
      // Faculty wins if present
      if (roles.includes("faculty")) return "faculty";
      // Only treat as student when explicitly tagged; otherwise default to faculty
      // so pre-existing accounts retain access to the faculty workspace.
      if (roles.includes("student")) return "student";
      return "faculty";
    },
    staleTime: 60_000,
  });
}
