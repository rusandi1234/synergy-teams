import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type AppRole = "student" | "faculty";

export async function getUserRole(userId: string): Promise<AppRole | null> {
  const { data, error } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", userId);

  if (error) {
    throw new Error(`Role lookup failed: ${error.message}`);
  }

  const roles = (data ?? [])
    .map((row: { role: string }) => row.role)
    .filter((role): role is AppRole => role === "faculty" || role === "student");

  if (roles.includes("faculty")) return "faculty";
  if (roles.includes("student")) return "student";
  return null;
}

export function useRole(userId: string | undefined) {
  return useQuery({
    queryKey: ["user-role", userId],
    enabled: !!userId,
    queryFn: () => getUserRole(userId!),
    retry: 1,
    staleTime: 60_000,
  });
}
