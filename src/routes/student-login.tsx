import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { z } from "zod";
import { Sparkles } from "lucide-react";
import { externalSupabase } from "@/integrations/external-supabase/client";
import { getUserRole } from "@/lib/useRole";

export const Route = createFileRoute("/student-login")({
  head: () => ({
    meta: [
      { title: "Student Sign In · SYNERGY" },
      { name: "description", content: "Sign in to your SYNERGY student account." },
    ],
  }),
  component: StudentLoginPage,
});

const schema = z.object({
  email: z.string().trim().email("Enter a valid email").max(255),
  password: z.string().min(6, "Password must be at least 6 characters").max(72),
});

function StudentLoginPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = schema.safeParse({ email, password });
    if (!parsed.success) return toast.error(parsed.error.issues[0].message);
    setBusy(true);
    try {
      const { data, error } = await externalSupabase.auth.signInWithPassword(parsed.data);
      if (error) throw error;
      const userId = data.user?.id;
      const resolvedRole = userId ? await getUserRole(userId) : null;
      if (resolvedRole === "student") {
        toast.success("Welcome back!");
        navigate({ to: "/student", replace: true });
      } else if (resolvedRole === "faculty") {
        await externalSupabase.auth.signOut();
        toast.error("This is a faculty account. Please use the faculty login.");
      } else {
        await externalSupabase.auth.signOut();
        toast.error("No student profile found for this account. Please register.");
      }
    } catch (err: any) {
      toast.error(err?.message ?? "Sign in failed");
    } finally {
      setBusy(false);
    }
  };

  const onForgot = async () => {
    const parsed = z.string().email().safeParse(email);
    if (!parsed.success) return toast.error("Enter your email above first");
    setBusy(true);
    try {
      const { error } = await externalSupabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });
      if (error) throw error;
      toast.success("Password reset link sent. Check your email.");
    } catch (err: any) {
      toast.error(err?.message ?? "Could not send reset email");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen grid place-items-center bg-background p-6">
      <div className="w-full max-w-md">
        <div className="flex items-center gap-2 mb-8 justify-center">
          <div className="size-9 rounded-md bg-primary grid place-items-center shadow-[var(--shadow-glow)]">
            <Sparkles className="size-5 text-primary-foreground" />
          </div>
          <div className="font-semibold">SYNERGY</div>
        </div>

        <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
          <h1 className="text-2xl font-semibold tracking-tight">Student sign in</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Access your team, tasks, and profile.
          </p>

          <form onSubmit={onSubmit} className="mt-6 space-y-3">
            <label className="block">
              <span className="text-xs font-medium text-muted-foreground">Email</span>
              <input
                type="email" required value={email} onChange={e => setEmail(e.target.value)}
                autoComplete="email"
                className="mt-1 w-full px-3 py-2 rounded-md border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
            </label>
            <label className="block">
              <span className="text-xs font-medium text-muted-foreground">Password</span>
              <input
                type="password" required value={password} onChange={e => setPassword(e.target.value)}
                autoComplete="current-password"
                className="mt-1 w-full px-3 py-2 rounded-md border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
            </label>

            <button disabled={busy} type="submit" className="btn-primary w-full justify-center">
              {busy ? "Please wait…" : "Login"}
            </button>

            <div className="flex items-center justify-between text-sm pt-2">
              <button type="button" onClick={onForgot} className="text-primary hover:underline">
                Forgot password?
              </button>
              <Link to="/student-register" className="text-primary hover:underline">
                Register
              </Link>
            </div>
          </form>
        </div>

        <p className="text-center text-xs text-muted-foreground mt-6">
          Faculty member?{" "}
          <Link to="/auth" className="text-primary hover:underline">
            Sign in here
          </Link>
        </p>
      </div>
    </div>
  );
}
