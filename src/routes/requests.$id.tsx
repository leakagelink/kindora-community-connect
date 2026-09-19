import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";

import { AppShell, EmptyState, PageHeading } from "@/components/site/AppShell";
import { Button } from "@/components/ui/button";
import { requestQuery, requestTypeLabel, statusLabel, timeAgo } from "@/lib/kindora";

export const Route = createFileRoute("/requests/$id")({
  head: () => ({
    meta: [
      { title: "Help request — Kindora" },
      { name: "description", content: "A free help request on Kindora. Volunteers can offer to help at no cost." },
      { property: "og:title", content: "Help request — Kindora" },
      { property: "og:description", content: "A free help request on Kindora." },
    ],
  }),
  component: RequestDetail,
});

function RequestDetail() {
  const { id } = Route.useParams();
  const { data, isLoading } = useQuery(requestQuery(id));

  if (isLoading) {
    return (
      <AppShell>
        <div className="surface-card h-64 animate-pulse rounded-3xl" />
      </AppShell>
    );
  }

  if (!data) {
    return (
      <AppShell>
        <EmptyState
          title="Request unavailable"
          body="This request may have been removed, or it isn't published yet."
          action={
            <Button asChild className="rounded-full">
              <Link to="/explore" search={{ tab: "requests" }}>
                Browse requests
              </Link>
            </Button>
          }
        />
      </AppShell>
    );
  }

  return (
    <AppShell>
      <PageHeading
        eyebrow={`${requestTypeLabel(data.request_type)} · ${statusLabel(data.status)}`}
        title={data.title}
        description={`Posted ${timeAgo(data.created_at)}${data.is_remote ? " · Remote" : data.location ? ` · ${data.location}` : ""}`}
      />
      <div className="grid gap-4 md:grid-cols-[1.4fr_0.6fr]">
        <article className="surface-card rounded-3xl p-6">
          <p className="whitespace-pre-wrap text-sm leading-relaxed text-muted-foreground">{data.description}</p>
          {data.required_features || data.expected_deliverables ? (
            <div className="mt-6 space-y-4 border-t border-border pt-5">
              {data.required_features ? (
                <div>
                  <h2 className="font-display text-sm font-bold">Required features</h2>
                  <p className="mt-1 whitespace-pre-wrap text-sm text-muted-foreground">{data.required_features}</p>
                </div>
              ) : null}
              {data.expected_deliverables ? (
                <div>
                  <h2 className="font-display text-sm font-bold">Expected deliverables</h2>
                  <p className="mt-1 whitespace-pre-wrap text-sm text-muted-foreground">{data.expected_deliverables}</p>
                </div>
              ) : null}
            </div>
          ) : null}
        </article>
        <aside className="surface-card h-fit rounded-3xl p-6">
          <h2 className="font-display text-sm font-bold">Details</h2>
          <dl className="mt-3 space-y-2 text-sm text-muted-foreground">
            <div className="flex justify-between gap-3">
              <dt>Needed by</dt>
              <dd className="font-medium text-foreground">{data.needed_by ?? "—"}</dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt>Category</dt>
              <dd className="font-medium text-foreground">{data.category?.name ?? "—"}</dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt>Language</dt>
              <dd className="font-medium text-foreground">{data.language ?? "Any"}</dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt>Offers</dt>
              <dd className="font-medium text-foreground">{data.offers_count}</dd>
            </div>
          </dl>
          <p className="mt-5 rounded-xl bg-secondary px-4 py-3 text-xs text-muted-foreground">
            Help here is always free. Never send or accept payment for a request.
          </p>
        </aside>
      </div>
    </AppShell>
  );
}
