import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";

import { AppShell, EmptyState, PageHeading } from "@/components/site/AppShell";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { timeAgo } from "@/lib/kindora";

export const Route = createFileRoute("/_authenticated/messages/")({
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

  const { data, isLoading } = useQuery({
    queryKey: ["conversations", user?.id],
    enabled: Boolean(user),
    queryFn: async () => {
      const { data: participation, error } = await supabase
        .from("conversation_participants")
        .select("conversation_id, last_read_at")
        .eq("user_id", user!.id);
      if (error) throw error;
      const ids = (participation ?? []).map((row) => row.conversation_id);
      if (!ids.length) return [];

      const { data: conversations } = await supabase
        .from("conversations")
        .select("id, request_id, listing_id, last_message_at")
        .in("id", ids)
        .order("last_message_at", { ascending: false });

      const { data: others } = await supabase
        .from("conversation_participants")
        .select("conversation_id, user_id")
        .in("conversation_id", ids)
        .neq("user_id", user!.id);

      const personIds = [...new Set((others ?? []).map((row) => row.user_id))];
      const { data: people } = personIds.length
        ? await supabase.from("profiles").select("id, display_name, avatar_url").in("id", personIds)
        : { data: [] };
      const personById = new Map((people ?? []).map((person) => [person.id, person]));
      const otherByConversation = new Map((others ?? []).map((row) => [row.conversation_id, row.user_id]));

      const { data: recent } = await supabase
        .from("messages")
        .select("conversation_id, body, created_at, sender_id")
        .in("conversation_id", ids)
        .order("created_at", { ascending: false })
        .limit(200);

      const lastRead = new Map((participation ?? []).map((row) => [row.conversation_id, row.last_read_at]));

      return ((conversations ?? []) as ConversationRow[]).map((conversation) => {
        const messages = (recent ?? []).filter((row) => row.conversation_id === conversation.id);
        const last = messages[0] ?? null;
        const readAt = lastRead.get(conversation.id);
        const unread = messages.filter(
          (row) => row.sender_id !== user!.id && (!readAt || new Date(row.created_at) > new Date(readAt)),
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
      {isLoading ? (
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
                Explore Kindora
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
                    {conversation.other?.display_name ?? "Kindora member"}
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
    </AppShell>
  );
}
