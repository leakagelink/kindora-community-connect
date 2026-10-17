import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Gift, HandHeart, Sparkles, ClipboardList } from "lucide-react";

import { AppShell, PageHeading } from "@/components/site/AppShell";
import { featureFlagsQuery } from "@/lib/goodivo";

export const Route = createFileRoute("/_authenticated/post/")({
  head: () => ({
    meta: [
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { title: "Post on Goodivo — request help, offer skills or give a product" },
      {
        name: "description",
        content: "Choose what to post: a free help request, a helper profile, or a permitted product giveaway.",
      },
      { property: "og:title", content: "Post on Goodivo" },
      { property: "og:description", content: "Request free help, offer your skills, or give away a product." },
    ],
  }),
  component: PostHub,
});

function PostHub() {
  const flags = useQuery(featureFlagsQuery);

  const options = [
    {
      to: "/post/request",
      icon: HandHeart,
      title: "I need help",
      body: "Ask for a digital service, a skill, or a product. Always free to receive.",
      tone: "bg-accent/15 text-accent",
      show: true,
    },
    {
      to: "/post/offer",
      icon: Sparkles,
      title: "I want to help",
      body: "Publish a helper profile with your skills, availability and languages.",
      tone: "bg-primary/10 text-primary",
      show: true,
    },
    {
      to: "/post/listing",
      icon: Gift,
      title: "Give away a product",
      body: "List a permitted item you no longer need, for free pickup or delivery.",
      tone: "bg-success/10 text-success",
      show: flags.data?.['product_marketplace'] !== false,
    },
  ] as const;

  return (
    <AppShell>
      <PageHeading
        eyebrow="Create"
        title="What would you like to post?"
        description="Requests and listings are reviewed before they appear publicly. Nobody may require payment for help on Goodivo."
      />
      <div className="grid gap-4 md:grid-cols-3">
        {options
          .filter((option) => option.show)
          .map((option) => {
            const Icon = option.icon;
            return (
              <Link
                key={option.to}
                to={option.to}
                className="surface-card rounded-3xl p-6 transition-shadow hover:shadow-[var(--shadow-lift)]"
              >
                <span className={`grid size-11 place-items-center rounded-xl ${option.tone}`}>
                  <Icon className="size-5" />
                </span>
                <h2 className="mt-4 font-display text-lg font-bold">{option.title}</h2>
                <p className="mt-1.5 text-sm text-muted-foreground">{option.body}</p>
              </Link>
            );
          })}
      </div>
      <Link to="/tasks" className="mt-6 flex items-center gap-3 border-t border-border pt-5 text-sm font-semibold text-primary"><ClipboardList className="size-5" />Community tasks & checklists</Link>
    </AppShell>
  );
}
