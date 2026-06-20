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
        .eq("user_id", userId!);
      // If the table doesn't exist yet or query fails, fall back to student
      // so the app still loads — faculty are explicitly tagged via SQL.
      if (error) {
        console.warn("useRole lookup failed:", error.message);
        return "student";
      }
      const roles = (data ?? []).map(r => r.role as AppRole);
      // Faculty wins if present
      if (roles.includes("faculty")) return "faculty";
      return "student";
    },
    staleTime: 60_000,
  });
}
