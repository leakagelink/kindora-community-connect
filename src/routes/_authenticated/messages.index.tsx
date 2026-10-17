import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";

import { AppShell, EmptyState, PageHeading } from "@/components/site/AppShell";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { timeAgo } from "@/lib/goodivo";

export const Route = createFileRoute("/_authenticated/messages/")({
  head: () => ({ meta: [{ title: "Your messages — Goodivo" }, { name: "description", content: "Private Goodivo conversations about community help and free giveaways." }, { property: "og:title", content: "Your messages — Goodivo" }, { property: "og:description", content: "Your private Goodivo community conversations." }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" }] }),
  component: MessagesList,
});

type ConversationRow = {
  id: string;
  request_id: string | null;
  listing_id: string | null;
  last_message_at: string;
};

function MessagesList() {
  const { user } = useAuth();
  const [page, setPage] = useState(0);

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["conversations", user?.id, page],
    enabled: Boolean(user),
    queryFn: async () => {
      if (!user) throw new Error('Sign in required.');
      const { data: participation, error } = await supabase
        .from("conversation_participants")
        .select("conversation_id, last_read_at")
        .eq("user_id", user.id);
      if (error) throw error;
      const ids = (participation ?? []).map((row) => row.conversation_id);
      if (!ids.length) return [];

      const { data: conversations, error: conversationError } = await supabase
        .from("conversations")
        .select("id, request_id, listing_id, last_message_at")
        .in("id", ids)
        .order("last_message_at", { ascending: false })
        .order("id")
        .range(page * 20, page * 20 + 19);
      if (conversationError) throw conversationError;
      const pageIds = (conversations ?? []).map(c => c.id);
      if (!pageIds.length) return [];

      const { data: others, error: otherError } = await supabase
        .from("conversation_participants")
        .select("conversation_id, user_id")
        .in("conversation_id", pageIds)
        .neq("user_id", user.id);
      if (otherError) throw otherError;

      const personIds = [...new Set((others ?? []).map((row) => row.user_id))];
      const { data: people, error: peopleError } = personIds.length
        ? await supabase.from("profiles").select("id, display_name, avatar_url").in("id", personIds)
        : { data: [], error: null };
      if (peopleError) throw peopleError;
      const personById = new Map((people ?? []).map((person) => [person.id, person]));
      const otherByConversation = new Map((others ?? []).map((row) => [row.conversation_id, row.user_id]));

      const { data: recent, error: recentError } = await supabase
        .from("messages")
        .select("conversation_id, body, created_at, sender_id")
        .in("conversation_id", pageIds)
        .order("created_at", { ascending: false })
        .limit(200);
      if (recentError) throw recentError;

      const lastRead = new Map((participation ?? []).map((row) => [row.conversation_id, row.last_read_at]));

      return ((conversations ?? []) as ConversationRow[]).map((conversation) => {
        const messages = (recent ?? []).filter((row) => row.conversation_id === conversation.id);
        const last = messages[0] ?? null;
        const readAt = lastRead.get(conversation.id);
        const unread = messages.filter(
          (row) => row.sender_id !== user.id && (!readAt || new Date(row.created_at) > new Date(readAt)),
        ).length;
        const otherId = otherByConversation.get(conversation.id) ?? null;
        return {
          ...conversation,
          unread,
          last,
          other: otherId ? personById.get(otherId) ?? null : null,
        };
      });
    },
  });

  return (
    <AppShell>
      <PageHeading
        eyebrow="Inbox"
        title="Messages"
        description="Private conversations about requests and listings. Never share payment details here."
      />
      {isError ? <EmptyState title="Inbox unavailable" body="Conversations could not be loaded." action={<Button variant="outline" onClick={() => void refetch()}>Retry</Button>} /> : isLoading ? (
        <div className="space-y-3">
          {[0, 1, 2].map((key) => (
            <div key={key} className="surface-card h-20 animate-pulse rounded-3xl" />
          ))}
        </div>
      ) : (data ?? []).length === 0 ? (
        <EmptyState
          title="No conversations yet"
          body="Start a conversation from a request or a free product listing."
          action={
            <Button asChild className="rounded-full">
              <Link to="/explore" search={{ tab: "requests" }}>
                Explore Goodivo
              </Link>
            </Button>
          }
        />
      ) : (
        <ul className="space-y-3">
          {(data ?? []).map((conversation) => (
            <li key={conversation.id}>
              <Link
                to="/messages/$id"
                params={{ id: conversation.id }}
                className="surface-card flex items-center justify-between gap-4 rounded-3xl px-5 py-4"
              >
                <div className="min-w-0">
                  <p className="truncate font-display text-sm font-bold">
                    {conversation.other?.display_name ?? "Goodivo member"}
                  </p>
                  <p className="truncate text-sm text-muted-foreground">
                    {conversation.last?.body ?? "No messages yet"}
                  </p>
                </div>
                <div className="shrink-0 text-right">
                  <p className="text-xs text-muted-foreground">{timeAgo(conversation.last_message_at)}</p>
                  {conversation.unread > 0 ? (
                    <span className="mt-1 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-accent px-1.5 text-[11px] font-bold text-accent-foreground">
                      {conversation.unread}
                    </span>
                  ) : null}
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
      <div className="mt-5 flex items-center gap-3"><Button variant="outline" disabled={!page} onClick={() => setPage(p => p - 1)}>Previous</Button><span>Page {page + 1}</span><Button variant="outline" disabled={isError || isLoading || (data?.length ?? 0) < 20} onClick={() => setPage(p => p + 1)}>Next</Button></div>
    </AppShell>
  );
}
