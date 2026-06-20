import { useQuery } from "@tanstack/react-query";
import { externalSupabase, type ExternalStudentRow } from "@/integrations/external-supabase/client";
import type { Student } from "./synergy";

function parseSkills(raw: string | null): string[] {
  if (!raw) return [];
  return raw
    .split(/[,;/|]| and /i)
    .map(s => s.trim())
    .filter(Boolean);
}

function normalizeWorkload(w: number | null): number {
  if (w == null) return 0;
  // External table stores workload as a small integer (e.g. days/projects, 0-10).
  // Scale into a 0-100 percentage for visualizations and balancing logic.
  if (w <= 10) return Math.min(100, w * 20);
  return Math.min(100, w);
}

export function useStudents() {
  return useQuery({
    queryKey: ["external-students"],
    queryFn: async (): Promise<Student[]> => {
      const { data, error } = await externalSupabase
        .from("Students")
        .select("student_id,name,skills,availability,workload,Roles")
        .order("student_id", { ascending: true });
      if (error) throw error;
      const rows = (data ?? []) as ExternalStudentRow[];
      return rows.map(r => ({
        id: String(r.student_id),
        name: r.name,
        skills: parseSkills(r.skills),
        availability: r.availability ?? "Flexible",
        workload: normalizeWorkload(r.workload),
        role: r.Roles ?? "Developer",
      }));
    },
    staleTime: 0,
    gcTime: 0,
    refetchOnMount: "always",
    refetchOnWindowFocus: true,
    refetchInterval: 5000,
  });
}
