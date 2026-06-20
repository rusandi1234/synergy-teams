// External Supabase project (user-owned) — used for both Students data and Auth.
// Publishable key is safe to ship to the browser.
import { createClient } from "@supabase/supabase-js";

const EXTERNAL_SUPABASE_URL = "https://yyiiyktaercsxcozlgfq.supabase.co";
const EXTERNAL_SUPABASE_PUBLISHABLE_KEY = "sb_publishable_2Fx169SBHW0fMhpTs1oHlw_1JR2K8Lh";

export interface ExternalStudentRow {
  student_id: number;
  name: string;
  skills: string | null;
  availability: string | null;
  workload: number | null;
  Roles: string | null;
  auth_user_id?: string | null;
  email?: string | null;
}

export const externalSupabase = createClient(
  EXTERNAL_SUPABASE_URL,
  EXTERNAL_SUPABASE_PUBLISHABLE_KEY,
  {
    auth: {
      storage: typeof window !== "undefined" ? window.localStorage : undefined,
      persistSession: true,
      autoRefreshToken: true,
      storageKey: "synergy-ext-auth",
    },
    global: {
      fetch: (input, init) => fetch(input, { ...init, cache: "no-store" }),
    },
  },
);

export type AppRole = "student" | "faculty";
