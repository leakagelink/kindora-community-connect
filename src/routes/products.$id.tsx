import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";

import { AppShell, EmptyState, PageHeading } from "@/components/site/AppShell";
import { Button } from "@/components/ui/button";
import { listingQuery, statusLabel, timeAgo } from "@/lib/kindora";

export const Route = createFileRoute("/products/$id")({
  head: () => ({
    meta: [
      { title: "Free product — Kindora" },
      { name: "description", content: "A permitted item being given away free on Kindora." },
      { property: "og:title", content: "Free product — Kindora" },
      { property: "og:description", content: "A permitted item being given away free on Kindora." },
    ],
  }),
  component: ProductDetail,
});

function ProductDetail() {
  const { id } = Route.useParams();
  const { data, isLoading } = useQuery(listingQuery(id));

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
          title="Listing unavailable"
          body="This item may have been given away, removed, or is still under review."
          action={
            <Button asChild className="rounded-full">
              <Link to="/explore" search={{ tab: "products" }}>
                Browse free products
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
        eyebrow={`Free product · ${statusLabel(data.status)}`}
        title={data.title}
        description={`Listed ${timeAgo(data.created_at)}${data.location ? ` · ${data.location}` : ""}`}
      />
      <div className="grid gap-4 md:grid-cols-[1.4fr_0.6fr]">
        <article className="surface-card rounded-3xl p-6">
          <p className="whitespace-pre-wrap text-sm leading-relaxed text-muted-foreground">{data.description}</p>
          {data.giveaway_rules ? (
            <div className="mt-6 border-t border-border pt-5">
              <h2 className="font-display text-sm font-bold">Giveaway rules</h2>
              <p className="mt-1 whitespace-pre-wrap text-sm text-muted-foreground">{data.giveaway_rules}</p>
            </div>
          ) : null}
        </article>
        <aside className="surface-card h-fit rounded-3xl p-6">
          <h2 className="font-display text-sm font-bold">Details</h2>
          <dl className="mt-3 space-y-2 text-sm text-muted-foreground">
            <div className="flex justify-between gap-3">
              <dt>Condition</dt>
              <dd className="font-medium capitalize text-foreground">{data.condition}</dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt>Quantity</dt>
              <dd className="font-medium text-foreground">{data.quantity}</dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt>Pickup</dt>
              <dd className="font-medium text-foreground">{data.pickup_available ? "Yes" : "No"}</dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt>Delivery</dt>
              <dd className="font-medium text-foreground">{data.delivery_available ? "Yes" : "No"}</dd>
            </div>
          </dl>
          <p className="mt-5 rounded-xl bg-secondary px-4 py-3 text-xs text-muted-foreground">
            Items on Kindora are free. Never pay for an item, delivery or a deposit.
          </p>
        </aside>
      </div>
    </AppShell>
  );
}
