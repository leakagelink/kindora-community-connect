import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";

import { AppShell, EmptyState, PageHeading } from "@/components/site/AppShell";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { timeAgo } from "@/lib/goodivo";

export const Route = createFileRoute("/_authenticated/notifications")({
  component: NotificationsPage,
});

function NotificationsPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ["notifications", user?.id],
    enabled: Boolean(user),
    queryFn: async () => {
      const { data: rows, error } = await supabase
        .from("notifications")
        .select("id, type, title, body, link, read_at, created_at")
        .order("created_at", { ascending: false })
        .limit(100);
      if (error) throw error;
      return rows ?? [];
    },
  });

  const markAllRead = async () => {
    await supabase
      .from("notifications")
      .update({ read_at: new Date().toISOString() })
      .eq("user_id", user!.id)
      .is("read_at", null);
    void queryClient.invalidateQueries({ queryKey: ["notifications", user?.id] });
    void queryClient.invalidateQueries({ queryKey: ["notifications-unread", user?.id] });
  };

  return (
    <AppShell>
      <PageHeading
        eyebrow="Activity"
        title="Notifications"
        description="Offers, status changes, messages, listing interest and moderation updates."
        action={
          <Button variant="outline" className="rounded-full" onClick={() => void markAllRead()}>
            Mark all as read
          </Button>
        }
      />
      {isLoading ? (
        <div className="space-y-3">
          {[0, 1, 2].map((key) => (
            <div key={key} className="surface-card h-16 animate-pulse rounded-3xl" />
          ))}
        </div>
      ) : (data ?? []).length === 0 ? (
        <EmptyState title="Nothing yet" body="We'll let you know when something happens on your posts." />
      ) : (
        <ul className="space-y-3">
          {(data ?? []).map((item) => (
            <li
              key={item.id}
              className={`surface-card rounded-3xl px-5 py-4 ${item.read_at ? "" : "border-l-4 border-l-accent"}`}
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-display text-sm font-bold">{item.title}</p>
                  {item.body ? <p className="mt-0.5 text-sm text-muted-foreground">{item.body}</p> : null}
                  {item.link ? (
                    <Link to={item.link as never} className="mt-1 inline-block text-xs font-semibold text-primary">
                      Open
                    </Link>
                  ) : null}
                </div>
                <span className="shrink-0 text-xs text-muted-foreground">{timeAgo(item.created_at)}</span>
              </div>
            </li>
          ))}
        </ul>
      )}
    </AppShell>
  );
}
