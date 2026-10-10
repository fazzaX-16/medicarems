import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export const Route = createFileRoute("/reset-password")({
  head: () => ({
    meta: [
      { title: "Set New Password — MediCare HMS" },
      { name: "description", content: "Choose a new password for your MediCare HMS staff account." },
      { property: "og:title", content: "Set New Password — MediCare HMS" },
      { property: "og:description", content: "Choose a new password for your MediCare HMS staff account." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: ResetPassword,
});

function ResetPassword() {
  const navigate = useNavigate();
  const [pw, setPw] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (pw.length < 6) return setErr("Password must be at least 6 characters");
    setBusy(true);
    const { error } = await supabase.auth.updateUser({ password: pw });
    setBusy(false);
    if (error) return setErr(error.message.includes("session") ? "This reset link has expired. Request a new one." : error.message);
    toast.success("Password updated");
    navigate({ to: "/", replace: true });
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-6">
      <form onSubmit={save} className="w-full max-w-sm space-y-4 rounded-xl border border-border bg-card p-8 shadow-sm">
        <h1 className="text-2xl font-bold">Set a new password</h1>
        <Input type="password" value={pw} onChange={(e) => setPw(e.target.value)} placeholder="New password" autoComplete="new-password" />
        {err && <p className="text-sm text-destructive">{err}</p>}
        <Button type="submit" className="w-full" disabled={busy}>Save password</Button>
      </form>
    </div>
  );
}
