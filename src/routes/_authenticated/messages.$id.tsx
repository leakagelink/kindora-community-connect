import { useEffect, useRef, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { AppShell, PageHeading } from "@/components/site/AppShell";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ReportDialog } from "@/components/goodivo/ReportDialog";
import { supabase } from "@/integrations/supabase/client";
import { blockUser, sendMessage } from "@/lib/actions";
import { useAuth } from "@/lib/auth";

export const Route = createFileRoute("/_authenticated/messages/$id")({
  head: () => ({ meta: [{ title: "Private conversation — Goodivo" }, { name: "description", content: "A private Goodivo conversation with a community member." }, { property: "og:title", content: "Private conversation — Goodivo" }, { property: "og:description", content: "Private community conversation on Goodivo." }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" }] }),
  component: Thread,
});

function Thread() {
  const { id } = Route.useParams();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const endRef = useRef<HTMLDivElement | null>(null);

  const { data: thread } = useQuery({
    queryKey: ["conversation", id],
    enabled: Boolean(user),
    queryFn: async () => {
      const { data: conversation, error } = await supabase
        .from("conversations")
        .select("id, request_id, listing_id")
        .eq("id", id)
        .maybeSingle();
      if (error) throw error;
      if (!conversation) return null;

      const { data: participants } = await supabase
        .from("conversation_participants")
        .select("user_id")
        .eq("conversation_id", id);
      const otherId = (participants ?? []).map((row) => row.user_id).find((value) => value !== user!.id) ?? null;
      const { data: other } = otherId
        ? await supabase.from("profiles").select("id, display_name").eq("id", otherId).maybeSingle()
        : { data: null };

      return { conversation, other };
    },
  });

  const { data: messages } = useQuery({
    queryKey: ["messages", id],
    enabled: Boolean(user),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("messages")
        .select("id, sender_id, body, created_at, deleted_at")
        .eq("conversation_id", id)
        .is("deleted_at", null)
        .order("created_at")
        .limit(300);
      if (error) throw error;
      return data ?? [];
    },
  });

  // Live updates + read receipts.
  useEffect(() => {
    if (!user) return;
    const channel = supabase
      .channel(`messages-${id}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "messages", filter: `conversation_id=eq.${id}` }, () => {
        void queryClient.invalidateQueries({ queryKey: ["messages", id] });
      })
      .subscribe();
    void supabase
      .from("conversation_participants")
      .update({ last_read_at: new Date().toISOString() })
      .eq("conversation_id", id)
      .eq("user_id", user.id);
    return () => {
      void supabase.removeChannel(channel);
    };
  }, [id, user, queryClient]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ block: "end" });
  }, [messages]);

  const send = async () => {
    if (!user) return;
    setSending(true);
    try {
      await sendMessage(id, user.id, draft);
      setDraft("");
      void queryClient.invalidateQueries({ queryKey: ["messages", id] });
      void queryClient.invalidateQueries({ queryKey: ["conversations", user.id] });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not send the message");
    } finally {
      setSending(false);
    }
  };

  return (
    <AppShell>
      <PageHeading
        eyebrow="Conversation"
        title={thread?.other?.display_name ?? "Messages"}
        description="Keep it respectful. Never share payment details, and never pay for help or items."
        action={
          <div className="flex flex-wrap items-center gap-2">
            <Button asChild variant="ghost" size="sm" className="rounded-full">
              <Link to="/messages">All messages</Link>
            </Button>
            {thread?.conversation.request_id ? (
              <Button asChild variant="outline" size="sm" className="rounded-full">
                <Link to="/requests/$id" params={{ id: thread.conversation.request_id }}>
                  View request
                </Link>
              </Button>
            ) : null}
            {thread?.conversation.listing_id ? (
              <Button asChild variant="outline" size="sm" className="rounded-full">
                <Link to="/products/$id" params={{ id: thread.conversation.listing_id }}>
                  View item
                </Link>
              </Button>
            ) : null}
            {thread?.other ? <ReportDialog targetType="user" targetId={thread.other.id} /> : null}
            {thread?.other && user ? (
              <Button
                variant="ghost"
                size="sm"
                className="rounded-full text-muted-foreground"
                onClick={async () => {
                  try {
                    await blockUser(user.id, thread.other!.id);
                    toast.success("User blocked. You can unblock from your profile settings.");
                  } catch (error) {
                    toast.error(error instanceof Error ? error.message : "Could not block");
                  }
                }}
              >
                Block
              </Button>
            ) : null}
          </div>
        }
      />
      <div className="surface-card flex max-h-[60vh] flex-col gap-3 overflow-y-auto rounded-3xl p-5">
        {(messages ?? []).length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">No messages yet. Say hello.</p>
        ) : (
          (messages ?? []).map((message) => {
            const mine = message.sender_id === user?.id;
            return (
              <div
                key={message.id}
                className={`max-w-[80%] rounded-2xl px-4 py-2.5 text-sm ${
                  mine ? "self-end bg-primary text-primary-foreground" : "self-start bg-secondary"
                }`}
              >
                <p className="whitespace-pre-wrap">{message.body}</p>
                <p className={`mt-1 text-[11px] ${mine ? "text-primary-foreground/70" : "text-muted-foreground"}`}>
                  {new Date(message.created_at).toLocaleString()}
                </p>
              </div>
            );
          })
        )}
        <div ref={endRef} />
      </div>
      <div className="mt-4 flex items-end gap-3">
        <Textarea
          rows={2}
          value={draft}
          maxLength={2000}
          placeholder="Write a message…"
          onChange={(event) => setDraft(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter" && !event.shiftKey) {
              event.preventDefault();
              void send();
            }
          }}
          aria-label="Message"
        />
        <Button className="rounded-full" disabled={sending || !draft.trim()} onClick={() => void send()}>
          {sending ? "Sending…" : "Send"}
        </Button>
      </div>
    </AppShell>
  );
}
