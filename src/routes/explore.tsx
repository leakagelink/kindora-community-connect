import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Search } from "lucide-react";

import { AppShell, EmptyState, PageHeading } from "@/components/site/AppShell";
import { CardSkeleton, HelperCard, ListingCard, RequestCard } from "@/components/kindora/Cards";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { categoriesQuery, helpersQuery, listingsQuery, requestsQuery, REQUEST_TYPES } from "@/lib/kindora";

type Tab = "requests" | "products" | "helpers";
type ExploreSearch = {
  tab?: Tab | undefined;
  q?: string | undefined;
  type?: string | undefined;
  category?: string | undefined;
  remote?: "remote" | "local" | undefined;
};

export const Route = createFileRoute("/explore")({
  validateSearch: (search: Record<string, unknown>): ExploreSearch => {
    const tab = search['tab'];
    const remote = search['remote'];
    return {
      tab: tab === "products" || tab === "helpers" ? tab : "requests",
      q: typeof search['q'] === "string" && search['q'] ? (search['q'] as string) : undefined,
      type: typeof search['type'] === "string" ? (search['type'] as string) : undefined,
      category: typeof search['category'] === "string" ? (search['category'] as string) : undefined,
      remote: remote === "remote" || remote === "local" ? remote : undefined,
    };
  },
  head: () => ({
    meta: [
      { title: "Explore free help, products and helpers — Kindora" },
      {
        name: "description",
        content: "Search open help requests, free product giveaways and volunteers offering their skills on Kindora.",
      },
      { property: "og:title", content: "Explore free help on Kindora" },
      { property: "og:description", content: "Search help requests, free products and volunteers offering skills." },
    ],
  }),
  component: Explore,
});

const TABS: { value: Tab; label: string }[] = [
  { value: "requests", label: "Requests" },
  { value: "products", label: "Free products" },
  { value: "helpers", label: "Helpers" },
];

function Explore() {
  const searchParams = Route.useSearch();
  const navigate = useNavigate();
  const tab = searchParams.tab ?? "requests";
  const [term, setTerm] = useState(searchParams.q ?? "");

  const categories = useQuery(categoriesQuery);
  const requests = useQuery({
    ...requestsQuery({
      search: searchParams.q,
      type: searchParams.type,
      categoryId: searchParams.category,
      remote: searchParams.remote,
    }),
    enabled: tab === "requests",
  });
  const listings = useQuery({
    ...listingsQuery({ search: searchParams.q, categoryId: searchParams.category }),
    enabled: tab === "products",
  });
  const helpers = useQuery({ ...helpersQuery({ search: searchParams.q }), enabled: tab === "helpers" });

  function update(next: Partial<ExploreSearch>) {
    void navigate({ to: "/explore", search: { ...searchParams, ...next } });
  }

  const relevantCategories = (categories.data ?? []).filter((c) =>
    tab === "products" ? c.group_name === "Free Products" : c.group_name !== "Free Products",
  );

  return (
    <AppShell>
      <PageHeading
        eyebrow="Explore"
        title="Find help, products and people"
        description="Everything here is offered free of charge. Nobody may require payment for help arranged through Kindora."
      />

      <form
        className="flex items-center gap-2 rounded-full border border-border bg-card px-4 py-1.5"
        onSubmit={(event) => {
          event.preventDefault();
          update({ q: term || undefined });
        }}
      >
        <Search className="size-4 shrink-0 text-muted-foreground" />
        <Input
          value={term}
          onChange={(e) => setTerm(e.target.value)}
          aria-label="Search"
          placeholder="Search titles and descriptions…"
          className="border-0 bg-transparent shadow-none focus-visible:ring-0"
        />
        <Button type="submit" size="sm" className="rounded-full">
          Search
        </Button>
      </form>

      <div className="mt-5 flex flex-wrap gap-2">
        {TABS.map((item) => (
          <button
            key={item.value}
            type="button"
            onClick={() => update({ tab: item.value, type: undefined, category: undefined })}
            className={`rounded-full px-4 py-2 text-sm font-semibold transition-colors ${
              tab === item.value ? "bg-foreground text-background" : "border border-border bg-card text-muted-foreground"
            }`}
          >
            {item.label}
          </button>
        ))}
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        {tab === "requests"
          ? REQUEST_TYPES.map((type) => (
              <button
                key={type.value}
                type="button"
                onClick={() => update({ type: searchParams.type === type.value ? undefined : type.value })}
                className={`rounded-full px-3 py-1.5 text-xs font-semibold ${
                  searchParams.type === type.value ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground"
                }`}
              >
                {type.label}
              </button>
            ))
          : null}
        {tab === "requests" ? (
          <>
            {(["remote", "local"] as const).map((mode) => (
              <button
                key={mode}
                type="button"
                onClick={() => update({ remote: searchParams.remote === mode ? undefined : mode })}
                className={`rounded-full px-3 py-1.5 text-xs font-semibold capitalize ${
                  searchParams.remote === mode ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground"
                }`}
              >
                {mode}
              </button>
            ))}
          </>
        ) : null}
        {tab !== "helpers"
          ? relevantCategories.slice(0, 10).map((category) => (
              <button
                key={category.id}
                type="button"
                onClick={() => update({ category: searchParams.category === category.id ? undefined : category.id })}
                className={`rounded-full px-3 py-1.5 text-xs font-semibold ${
                  searchParams.category === category.id
                    ? "bg-accent text-accent-foreground"
                    : "bg-secondary text-muted-foreground"
                }`}
              >
                {category.name}
              </button>
            ))
          : null}
      </div>

      <div className="mt-7 grid gap-4 md:grid-cols-3">
        {tab === "requests" ? (
          requests.isLoading ? (
            <CardSkeleton count={6} />
          ) : requests.data?.length ? (
            requests.data.map((request) => <RequestCard key={request.id} request={request} />)
          ) : null
        ) : tab === "products" ? (
          listings.isLoading ? (
            <CardSkeleton count={6} />
          ) : listings.data?.length ? (
            listings.data.map((listing) => <ListingCard key={listing.id} listing={listing} />)
          ) : null
        ) : helpers.isLoading ? (
          <CardSkeleton count={6} />
        ) : helpers.data?.length ? (
          helpers.data.map((helper) => <HelperCard key={helper.id} helper={helper} />)
        ) : null}
      </div>

      {!requests.isLoading &&
      !listings.isLoading &&
      !helpers.isLoading &&
      ((tab === "requests" && !requests.data?.length) ||
        (tab === "products" && !listings.data?.length) ||
        (tab === "helpers" && !helpers.data?.length)) ? (
        <div className="mt-7">
          <EmptyState
            title="Nothing here yet"
            body="Try clearing your filters, or be the first to post in this space."
            action={
              <Button asChild variant="help" className="rounded-full">
                <Link to="/post">Post on Kindora</Link>
              </Button>
            }
          />
        </div>
      ) : null}
    </AppShell>
  );
}
