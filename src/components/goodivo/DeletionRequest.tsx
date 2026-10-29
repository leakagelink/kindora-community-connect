import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { requestAccountDeletion } from "@/lib/account.functions";

export function DeletionRequest() {
  const { user } = useAuth();
  const requestDeletion = useServerFn(requestAccountDeletion);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const request = useQuery({
    queryKey: ["account-deletion-request", user?.id], enabled: Boolean(user),
    queryFn: async () => {
      if (!user) return null;
      const result = await supabase.from("account_deletion_requests").select("id, status, requested_at").eq("user_id", user.id).maybeSingle();
      if (result.error) throw new Error("Your request status could not be loaded.");
      return result.data;
    },
  });
  return <section className="my-6 space-y-3 border-t border-border pt-5">
    <h2 className="font-display text-lg font-bold">Request account deletion</h2>
    <p className="text-sm text-muted-foreground">Your verified request is recorded privately. Automatic full erasure is not yet operational; submitting does not mean your account or private data has been deleted.</p>
    {!user ? <Button asChild variant="outline"><Link to="/auth" search={{ mode: "signin", redirect: "/legal/account-deletion" }}>Sign in to verify ownership</Link></Button> : request.data ? <p role="status" className="text-sm">Request saved · {request.data.status}. Full deletion is pending.</p> : <Button variant="destructive" disabled={busy || request.isPending || request.isError} onClick={async () => {
      if (!window.confirm("Record a request to delete your account and associated personal data? Processing is currently pending; this does not immediately erase data.")) return;
      setBusy(true); setError("");
      try { await requestDeletion(); await request.refetch(); }
      catch (failure) { setError(failure instanceof Error ? failure.message : "Could not save request."); }
      finally { setBusy(false); }
    }}>{busy ? "Saving request…" : "Request account deletion"}</Button>}
    {error || request.isError ? <p role="alert" className="text-sm text-destructive">{error || "Could not load request status."}</p> : null}
  </section>;
}