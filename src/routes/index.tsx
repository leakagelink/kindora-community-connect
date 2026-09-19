import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import {
  ArrowRight,
  BookOpen,
  GraduationCap,
  HeartHandshake,
  Package,
  Search,
  ShieldCheck,
  Sparkles,
  Wand2,
} from "lucide-react";

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
      {
        property: "og:image",
        content:
          "https://project--dc4e75d5-5f01-4924-ba90-204ec316802a.lovable.app/og-image.png",
      },
      {
        name: "twitter:image",
        content:
          "https://project--dc4e75d5-5f01-4924-ba90-204ec316802a.lovable.app/og-image.png",
      },
    ],
  }),
  component: Home,
});

function SectionHeading({
  title,
  linkLabel,
  to,
  tab,
}: {
  title: string;
  linkLabel: string;
  to: "/explore" | "/ai-tools";
  tab?: "requests" | "products" | "helpers";
}) {
  return (
    <div className="flex items-end justify-between gap-3">
      <h2 className="font-display text-xl font-extrabold tracking-tight sm:text-2xl">{title}</h2>
      {to === "/explore" ? (
        <Link
          to="/explore"
          search={{ tab: tab ?? "requests" }}
          className="inline-flex items-center gap-1 text-sm font-bold text-primary hover:underline"
        >
          {linkLabel}
          <ArrowRight className="size-3.5" />
        </Link>
      ) : (
        <Link to="/ai-tools" className="inline-flex items-center gap-1 text-sm font-bold text-primary hover:underline">
          {linkLabel}
          <ArrowRight className="size-3.5" />
        </Link>
      )}
    </div>
  );
}

function Empty({ icon, title, body }: { icon: React.ReactNode; title: string; body: string }) {
  return (
    <div className="surface-card flex flex-col items-center rounded-3xl px-6 py-10 text-center">
      <span className="grid size-14 place-items-center rounded-2xl bg-secondary text-muted-foreground">{icon}</span>
      <p className="mt-4 font-display text-sm font-bold">{title}</p>
      <p className="mt-1 max-w-xs text-sm text-muted-foreground">{body}</p>
    </div>
  );
}

const TILE_TONES = [
  { wrap: "bg-primary/10 text-primary", icon: <GraduationCap className="size-7" /> },
  { wrap: "bg-leaf/10 text-leaf", icon: <BookOpen className="size-7" /> },
  { wrap: "bg-accent/15 text-accent", icon: <Package className="size-7" /> },
];

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
      <section className="reveal relative overflow-hidden rounded-4xl px-5 py-10 text-center sm:px-10 sm:py-14">
        <span
          aria-hidden="true"
          className="pointer-events-none absolute -left-16 -top-16 size-56 rounded-full bg-primary/20 blur-3xl"
        />
        <span
          aria-hidden="true"
          className="pointer-events-none absolute -right-12 top-10 size-48 rounded-full bg-leaf/20 blur-3xl"
        />
        <span
          aria-hidden="true"
          className="pointer-events-none absolute bottom-0 left-1/3 size-44 rounded-full bg-rose/15 blur-3xl"
        />
        <div className="relative">
          <span className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-card/80 px-3.5 py-1.5 text-xs font-bold text-primary backdrop-blur">
            <HeartHandshake className="size-3.5" />
            Always free to receive help
          </span>
          <h1 className="mx-auto mt-6 max-w-3xl font-display text-[2.7rem] font-extrabold leading-[1.03] tracking-tight sm:text-6xl">
            Give More. <span className="text-gradient-brand">Help More.</span>
          </h1>
          <p className="mx-auto mt-5 max-w-xl text-base leading-relaxed text-muted-foreground">
            Ask for a free service, share a skill, or give away something you no longer need. No payment is ever required
            to receive help on Goodivo.
          </p>

          <div className="mx-auto mt-8 flex max-w-md flex-col gap-3 sm:flex-row sm:justify-center">
            <Button asChild variant="help" size="pill" className="w-full sm:w-auto">
              <Link to="/post/request">Request free help</Link>
            </Button>
            <Button asChild variant="offer" size="pill" className="w-full sm:w-auto">
              <Link to="/post/offer">Offer your skills</Link>
            </Button>
          </div>

          <form
            className="mx-auto mt-6 flex max-w-md items-center gap-2 rounded-2xl border border-border bg-card px-4 py-2 shadow-[var(--shadow-card)] transition-shadow focus-within:shadow-[var(--shadow-lift)]"
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
              placeholder="Search help, skills or free items…"
              className="border-0 bg-transparent shadow-none focus-visible:ring-0"
            />
            <Button type="submit" variant="brand" size="sm" className="rounded-xl">
              Search
            </Button>
          </form>
        </div>
      </section>

      {/* Categories */}
      <section className="reveal py-8" style={{ animationDelay: "80ms" }}>
        <SectionHeading title="Browse categories" linkLabel="View all" to="/explore" />
        <div className="mt-5 grid grid-cols-2 gap-4 sm:grid-cols-4">
          {groups.slice(0, 3).map((group, i) => {
            const items = (categories.data ?? []).filter((c) => c.group_name === group);
            const tone = TILE_TONES[i % TILE_TONES.length]!;
            return (
              <Link
                key={group}
                to="/explore"
                search={{ tab: group === "Free Products" ? "products" : "requests" }}
                className="surface-card lift-hover flex flex-col items-start rounded-3xl p-5"
              >
                <span className={`grid size-14 place-items-center rounded-2xl ${tone.wrap}`}>{tone.icon}</span>
                <p className="mt-3.5 font-display text-sm font-bold">{group}</p>
                <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">
                  {items
                    .slice(0, 3)
                    .map((c) => c.name)
                    .join(" · ")}
                </p>
              </Link>
            );
          })}
          <Link to="/ai-tools" className="surface-card lift-hover flex flex-col items-start rounded-3xl p-5">
            <span className="grid size-14 place-items-center rounded-2xl bg-rose/10 text-rose">
              <Wand2 className="size-7" />
            </span>
            <p className="mt-3.5 font-display text-sm font-bold">Free AI Tools</p>
            <p className="mt-1 text-xs text-muted-foreground">Logo · Resume · Website starter</p>
          </Link>
        </div>
      </section>

      {/* Fresh requests */}
      <section className="reveal py-6" style={{ animationDelay: "120ms" }}>
        <SectionHeading title="Fresh requests" linkLabel="Explore all" to="/explore" tab="requests" />
        <div className="mt-5 grid gap-4 md:grid-cols-3">
          {requests.isLoading ? (
            <CardSkeleton />
          ) : requests.data?.length ? (
            requests.data.map((request) => <RequestCard key={request.id} request={request} />)
          ) : (
            <div className="md:col-span-3">
              <Empty
                icon={<HeartHandshake className="size-7" />}
                title="No requests published yet"
                body="Be the first to ask for help — posting is free and volunteers can reply with what they can deliver."
              />
            </div>
          )}
        </div>
      </section>

      {/* Free products */}
      {flags.data?.['product_marketplace'] !== false ? (
        <section className="reveal py-6" style={{ animationDelay: "140ms" }}>
          <SectionHeading title="Free products" linkLabel="Explore all" to="/explore" tab="products" />
          <div className="mt-5 grid gap-4 md:grid-cols-3">
            {listings.isLoading ? (
              <CardSkeleton />
            ) : listings.data?.length ? (
              listings.data.map((listing) => <ListingCard key={listing.id} listing={listing} />)
            ) : (
              <div className="md:col-span-3">
                <Empty
                  icon={<Package className="size-7" />}
                  title="No giveaways listed yet"
                  body="Share something you no longer need. Listings are reviewed before they appear publicly."
                />
              </div>
            )}
          </div>
        </section>
      ) : null}

      {/* Helpers */}
      <section className="reveal py-6" style={{ animationDelay: "160ms" }}>
        <SectionHeading title="People offering help" linkLabel="See helpers" to="/explore" tab="helpers" />
        <div className="mt-5 grid gap-4 md:grid-cols-3">
          {helpers.isLoading ? (
            <CardSkeleton />
          ) : helpers.data?.length ? (
            helpers.data.map((helper) => <HelperCard key={helper.id} helper={helper} />)
          ) : (
            <div className="md:col-span-3">
              <Empty
                icon={<Sparkles className="size-7" />}
                title="No helper profiles yet"
                body="Publish your skills and choose the requests you would like to take on."
              />
            </div>
          )}
        </div>
      </section>

      {/* AI tools */}
      <section className="reveal py-8" style={{ animationDelay: "180ms" }}>
        <div className="relative overflow-hidden rounded-4xl bg-foreground p-6 text-background sm:p-9">
          <span
            aria-hidden="true"
            className="pointer-events-none absolute -right-10 -top-10 size-44 rounded-full bg-primary/40 blur-3xl"
          />
          <span
            aria-hidden="true"
            className="pointer-events-none absolute -bottom-12 left-6 size-40 rounded-full bg-rose/30 blur-3xl"
          />
          <div className="relative">
            <span className="inline-flex items-center gap-2 rounded-full border border-background/20 bg-background/10 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.18em]">
              <span className="size-1.5 rounded-full bg-sky" />
              Free AI tools
            </span>
            <h2 className="mt-4 font-display text-2xl font-extrabold tracking-tight sm:text-3xl">Smart help tools</h2>
            <p className="mt-2 max-w-lg text-sm opacity-70">
              Generate logo concepts, build a resume, or start a simple landing page. Free with fair daily limits.
            </p>
            <div className="mt-7 grid gap-4 sm:grid-cols-3">
              {AI_TOOLS.map((tool) => (
                <Link
                  key={tool.key}
                  to={tool.path}
                  className="press rounded-3xl bg-background/5 p-5 ring-1 ring-background/15 transition-colors hover:bg-background/15"
                >
                  <span className="grid size-10 place-items-center rounded-xl bg-background/15">
                    <Sparkles className="size-4" />
                  </span>
                  <p className="mt-3.5 font-display text-sm font-bold">{tool.name}</p>
                  <p className="mt-1 text-xs opacity-65">{tool.blurb}</p>
                </Link>
              ))}
            </div>
            <p className="mt-6 text-xs opacity-50">
              AI results are a starting point and may need review. They are not guaranteed to be original or suitable
              for commercial use.
            </p>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="reveal py-4" style={{ animationDelay: "200ms" }}>
        <h2 className="font-display text-xl font-extrabold tracking-tight sm:text-2xl">How Goodivo works</h2>
        <div className="mt-5 grid gap-4 sm:grid-cols-3">
          {[
            {
              n: "1",
              title: "Post or browse",
              body: "Ask for help, offer a skill, or find people ready to give.",
              tone: "bg-primary/10 text-primary",
            },
            {
              n: "2",
              title: "Connect safely",
              body: "Message inside the app. Report or block anything unsafe.",
              tone: "bg-leaf/10 text-leaf",
            },
            {
              n: "3",
              title: "Complete & reflect",
              body: "Close the help loop and leave honest feedback.",
              tone: "bg-rose/10 text-rose",
            },
          ].map((step) => (
            <div key={step.n} className="surface-card lift-hover rounded-3xl p-5">
              <span className={`grid size-10 place-items-center rounded-full font-display text-base font-extrabold ${step.tone}`}>
                {step.n}
              </span>
              <p className="mt-3 font-display text-sm font-bold">{step.title}</p>
              <p className="mt-1 text-sm text-muted-foreground">{step.body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Trust & safety */}
      <section className="reveal py-8" style={{ animationDelay: "220ms" }}>
        <div className="surface-card rounded-4xl p-6 sm:p-8">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
            <span className="grid size-12 shrink-0 place-items-center rounded-2xl bg-leaf/10 text-leaf">
              <ShieldCheck className="size-6" />
            </span>
            <div>
              <h2 className="font-display text-lg font-extrabold sm:text-xl">Trust and safety</h2>
              <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted-foreground">
                Requests and listings are reviewed before they appear publicly. Every post, listing, profile and message
                can be reported, and you can block anyone. Prohibited and unsafe items are not allowed. Nobody may
                require payment for help offered through Goodivo.
              </p>
              <div className="mt-5 flex flex-wrap gap-3">
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
          <div className="surface-card flex flex-wrap items-center justify-between gap-4 rounded-4xl p-6">
            <div>
              <h2 className="font-display text-lg font-extrabold">Support Goodivo</h2>
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
