import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Student } from "./synergy";

export function useStudents() {
  return useQuery({
    queryKey: ["students"],
    queryFn: async (): Promise<Student[]> => {
      const { data, error } = await (supabase as any)
        .from("Students")
        .select("*")
        .order("name");
      if (error) throw error;
      return (data ?? []) as Student[];
    },
  });
}
