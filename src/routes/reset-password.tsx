import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Sparkles } from "lucide-react";

export const Route = createFileRoute("/reset-password")({
  head: () => ({ meta: [{ title: "Reset Password · SYNERGY" }] }),
  component: ResetPasswordPage,
});

function ResetPasswordPage() {
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 6) return toast.error("Password must be at least 6 characters");
    setBusy(true);
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
      toast.success("Password updated. Please sign in.");
      await supabase.auth.signOut();
      navigate({ to: "/auth" });
    } catch (err: any) {
      toast.error(err?.message ?? "Could not update password");
    } finally { setBusy(false); }
  };

  return (
    <div className="min-h-screen grid place-items-center bg-background p-6">
      <div className="w-full max-w-sm">
        <div className="flex items-center gap-2 mb-6">
          <div className="size-9 rounded-md bg-primary grid place-items-center">
            <Sparkles className="size-5 text-primary-foreground" />
          </div>
          <div className="font-semibold">SYNERGY</div>
        </div>
        <h2 className="text-2xl font-semibold">Set a new password</h2>
        <form onSubmit={onSubmit} className="mt-6 space-y-3">
          <label className="block">
            <span className="text-xs font-medium text-muted-foreground">New password</span>
            <input type="password" required value={password} onChange={e => setPassword(e.target.value)}
              className="mt-1 w-full px-3 py-2 rounded-md border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
          </label>
          <button disabled={busy} className="btn-primary w-full justify-center" type="submit">
            {busy ? "Saving…" : "Update password"}
          </button>
        </form>
      </div>
    </div>
  );
}
