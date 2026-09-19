import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { HeartHandshake, Search, ShieldCheck, Sparkles } from "lucide-react";

import { AppShell } from "@/components/site/AppShell";
import { CardSkeleton, HelperCard, ListingCard, RequestCard } from "@/components/goodivo/Cards";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  AI_TOOLS,
  categoriesQuery,
  featureFlagsQuery,
  helpersQuery,
  listingsQuery,
  requestsQuery,
} from "@/lib/goodivo";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Goodivo: Free Help & Services — Give More. Help More." },
      {
        name: "description",
        content:
          "Request free digital services, skills and products, offer your own help, and use free AI tools. No payment required to receive help.",
      },
      { property: "og:title", content: "Goodivo: Free Help & Services" },
      {
        property: "og:description",
        content:
          "Request free digital services, skills and products, offer your own help, and use free AI tools.",
      },
    ],
  }),
  component: Home,
});

function Home() {
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const requests = useQuery(requestsQuery({ limit: 3 }));
  const listings = useQuery(listingsQuery({ limit: 3 }));
  const helpers = useQuery(helpersQuery({ limit: 3 }));
  const categories = useQuery(categoriesQuery);
  const flags = useQuery(featureFlagsQuery);

  const groups = Array.from(new Set((categories.data ?? []).map((c) => c.group_name)));

  return (
    <AppShell>
      {/* Hero */}
      <section className="grid items-center gap-10 py-4 md:grid-cols-[1.15fr_0.85fr] md:py-10">
        <div>
          <span className="inline-flex items-center gap-2 rounded-full border border-primary/15 bg-card/70 px-3 py-1 text-xs font-semibold text-primary">
            Community help, always free to receive
          </span>
          <h1 className="mt-5 font-display text-5xl font-extrabold leading-[1.02] tracking-tight sm:text-6xl">
            Give More. <span className="text-primary">Help More.</span>
          </h1>
          <p className="mt-5 max-w-md text-base leading-relaxed text-muted-foreground">
            Post a request, share a skill, or give away a permitted product. Connect with people who want to help — no
            payment required, ever.
          </p>
          <div className="mt-7 flex flex-wrap gap-3">
            <Button asChild variant="help" size="pill">
              <Link to="/post/request">I Need Help</Link>
            </Button>
            <Button asChild variant="offer" size="pill">
              <Link to="/post/offer">I Want to Help</Link>
            </Button>
          </div>
          <form
            className="mt-7 flex max-w-md items-center gap-2 rounded-full border border-border bg-card px-4 py-1.5"
            onSubmit={(event) => {
              event.preventDefault();
              void navigate({ to: "/explore", search: { q: search || undefined, tab: "requests" } });
            }}
          >
            <Search className="size-4 shrink-0 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              aria-label="Search Goodivo"
              placeholder="e.g. logo design, books, career guidance…"
              className="border-0 bg-transparent shadow-none focus-visible:ring-0"
            />
            <Button type="submit" size="sm" className="rounded-full">
              Search
            </Button>
          </form>
        </div>

        <div>
          <div className="surface-card rounded-3xl p-5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">How it starts</span>
              <span className="rounded-full bg-primary/10 px-2.5 py-1 text-[11px] font-bold text-primary">
                Free to ask
              </span>
            </div>
            <h3 className="mt-3 font-display text-lg font-bold">Describe what you need</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Add the category, your deadline and whether it can be done remotely. Volunteers apply with what they can
              deliver.
            </p>
            <Button asChild size="sm" className="mt-4 rounded-full">
              <Link to="/post/request">Start a request</Link>
            </Button>
          </div>
          <div className="mt-4 rounded-2xl bg-foreground p-4 text-background">
            <div className="flex items-center gap-3">
              <span className="grid size-11 place-items-center rounded-full bg-background/10">
                <HeartHandshake className="size-5" />
              </span>
              <div>
                <p className="text-sm font-bold">Have a skill to share?</p>
                <p className="text-xs opacity-70">
                  Publish a helper profile and pick the requests you want to take on.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Categories */}
      <section className="py-8">
        <div className="flex items-end justify-between">
          <h2 className="font-display text-xl font-bold tracking-tight">Browse categories</h2>
          <Link to="/explore" search={{ tab: "requests" }} className="text-sm font-semibold text-primary">
            View all
          </Link>
        </div>
        <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {groups.slice(0, 3).map((group) => {
            const items = (categories.data ?? []).filter((c) => c.group_name === group);
            return (
              <Link
                key={group}
                to="/explore"
                search={{ tab: group === "Free Products" ? "products" : "requests" }}
                className="surface-card rounded-2xl p-4 transition-shadow hover:shadow-[var(--shadow-lift)]"
              >
                <p className="font-display text-sm font-bold">{group}</p>
                <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">
                  {items
                    .slice(0, 3)
                    .map((c) => c.name)
                    .join(", ")}
                </p>
              </Link>
            );
          })}
          <Link to="/ai-tools" className="surface-card rounded-2xl p-4 transition-shadow hover:shadow-[var(--shadow-lift)]">
            <p className="font-display text-sm font-bold">Free AI Tools</p>
            <p className="mt-0.5 text-xs text-muted-foreground">Logo, resume, website starter</p>
          </Link>
        </div>
      </section>

      {/* Fresh requests */}
      <section className="py-4">
        <div className="flex items-end justify-between">
          <h2 className="font-display text-xl font-bold tracking-tight">Fresh requests</h2>
          <Link to="/explore" search={{ tab: "requests" }} className="text-sm font-semibold text-primary">
            Explore all
          </Link>
        </div>
        <div className="mt-5 grid gap-4 md:grid-cols-3">
          {requests.isLoading ? (
            <CardSkeleton />
          ) : requests.data?.length ? (
            requests.data.map((request) => <RequestCard key={request.id} request={request} />)
          ) : (
            <p className="text-sm text-muted-foreground">
              No published requests yet. Be the first to ask for help — it's free.
            </p>
          )}
        </div>
      </section>

      {/* Free products */}
      {flags.data?.['product_marketplace'] !== false ? (
        <section className="py-8">
          <div className="flex items-end justify-between">
            <h2 className="font-display text-xl font-bold tracking-tight">Free products</h2>
            <Link to="/explore" search={{ tab: "products" }} className="text-sm font-semibold text-primary">
              Explore all
            </Link>
          </div>
          <div className="mt-5 grid gap-4 md:grid-cols-3">
            {listings.isLoading ? (
              <CardSkeleton />
            ) : listings.data?.length ? (
              listings.data.map((listing) => <ListingCard key={listing.id} listing={listing} />)
            ) : (
              <p className="text-sm text-muted-foreground">
                No giveaways listed yet. Share something you no longer need.
              </p>
            )}
          </div>
        </section>
      ) : null}

      {/* Volunteers */}
      <section className="py-4">
        <div className="flex items-end justify-between">
          <h2 className="font-display text-xl font-bold tracking-tight">People offering help</h2>
          <Link to="/explore" search={{ tab: "helpers" }} className="text-sm font-semibold text-primary">
            See helpers
          </Link>
        </div>
        <div className="mt-5 grid gap-4 md:grid-cols-3">
          {helpers.isLoading ? (
            <CardSkeleton />
          ) : helpers.data?.length ? (
            helpers.data.map((helper) => <HelperCard key={helper.id} helper={helper} />)
          ) : (
            <p className="text-sm text-muted-foreground">
              No helper profiles yet. Publish yours and choose what you'd like to work on.
            </p>
          )}
        </div>
      </section>

      {/* AI tools */}
      <section className="py-8">
        <div className="rounded-3xl bg-foreground p-6 text-background sm:p-8">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <h2 className="font-display text-2xl font-bold tracking-tight">Free AI tools</h2>
              <p className="mt-1 text-sm opacity-60">Community tools with fair usage limits. Free to use.</p>
            </div>
            <span className="rounded-full bg-background/10 px-3 py-1.5 text-xs font-semibold opacity-80">
              3 tools · quota-based
            </span>
          </div>
          <div className="mt-6 grid gap-4 sm:grid-cols-3">
            {AI_TOOLS.map((tool) => (
              <Link
                key={tool.key}
                to={tool.path}
                className="rounded-2xl bg-background/5 p-5 ring-1 ring-background/10 transition-colors hover:bg-background/10"
              >
                <span className="grid size-9 place-items-center rounded-lg bg-background/15">
                  <Sparkles className="size-4" />
                </span>
                <p className="mt-3 font-display text-sm font-bold">{tool.name}</p>
                <p className="mt-1 text-xs opacity-60">{tool.blurb}</p>
              </Link>
            ))}
          </div>
          <p className="mt-5 text-xs opacity-50">
            AI results are a starting point and may need review. They are not guaranteed to be original or suitable for
            commercial use.
          </p>
        </div>
      </section>

      {/* How it works */}
      <section className="py-4">
        <h2 className="font-display text-xl font-bold tracking-tight">How Goodivo works</h2>
        <div className="mt-5 grid gap-4 sm:grid-cols-3">
          {[
            { n: "01", title: "Post or browse", body: "Ask for help or find people ready to give it.", tone: "text-primary" },
            { n: "02", title: "Connect safely", body: "Message in-app. Report or block anything unsafe.", tone: "text-accent" },
            {
              n: "03",
              title: "Complete & reflect",
              body: "Close the help loop and leave honest feedback.",
              tone: "text-success",
            },
          ].map((step) => (
            <div key={step.n} className="surface-card rounded-2xl p-5">
              <span className={`font-display text-2xl font-extrabold ${step.tone}`}>{step.n}</span>
              <p className="mt-2 font-display text-sm font-bold">{step.title}</p>
              <p className="mt-1 text-sm text-muted-foreground">{step.body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Trust & safety */}
      <section className="py-8">
        <div className="surface-card rounded-3xl p-6">
          <div className="flex items-start gap-3">
            <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-success/10 text-success">
              <ShieldCheck className="size-5" />
            </span>
            <div>
              <h2 className="font-display text-lg font-bold">Trust and safety</h2>
              <p className="mt-1.5 max-w-2xl text-sm text-muted-foreground">
                Requests and listings are reviewed before they appear publicly. Every post, listing, profile and message
                can be reported, and you can block anyone. Prohibited and unsafe items are not allowed. Nobody may
                require payment for help offered through Goodivo.
              </p>
              <div className="mt-4 flex flex-wrap gap-3">
                <Button asChild variant="outline" size="sm" className="rounded-full">
                  <Link to="/legal/$slug" params={{ slug: "community-guidelines" }}>
                    Community guidelines
                  </Link>
                </Button>
                <Button asChild variant="ghost" size="sm" className="rounded-full">
                  <Link to="/legal/$slug" params={{ slug: "prohibited-items" }}>
                    Prohibited items
                  </Link>
                </Button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {flags.data?.['donations'] ? (
        <section className="pb-6">
          <div className="surface-card flex flex-wrap items-center justify-between gap-4 rounded-3xl p-6">
            <div>
              <h2 className="font-display text-lg font-bold">Support Goodivo</h2>
              <p className="mt-1 max-w-xl text-sm text-muted-foreground">
                Donations are entirely optional and never required to receive help. They don't affect ranking or whether
                a request is accepted.
              </p>
            </div>
            <Button asChild variant="outline" className="rounded-full">
              <Link to="/support">Learn more</Link>
            </Button>
          </div>
        </section>
      ) : null}
    </AppShell>
  );
}
