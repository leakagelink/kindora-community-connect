import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";

import { AppShell, EmptyState, PageHeading } from "@/components/site/AppShell";
import { profileQuery, reviewsQuery } from "@/lib/goodivo";

export const Route = createFileRoute("/u/$id")({
  head: () => ({
    meta: [
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { title: "Member profile — Goodivo" },
      { name: "description", content: "A public Goodivo member profile with skills, languages and completed help." },
      { property: "og:title", content: "Member profile — Goodivo" },
      { property: "og:description", content: "A public Goodivo member profile." },
    ],
  }),
  component: PublicProfile,
});

function PublicProfile() {
  const { id } = Route.useParams();
  const profile = useQuery(profileQuery(id));
  const reviews = useQuery(reviewsQuery(id));

  if (profile.isLoading) {
    return (
      <AppShell>
        <div className="surface-card h-48 animate-pulse rounded-3xl" />
      </AppShell>
    );
  }

  if (!profile.data) {
    return (
      <AppShell>
        <EmptyState title="Profile unavailable" body="This member's profile is private or no longer exists." />
      </AppShell>
    );
  }

  const person = profile.data;

  return (
    <AppShell>
      <PageHeading eyebrow="Member" title={person.display_name ?? "Goodivo member"} description={person.bio ?? undefined} />
      <div className="grid gap-4 md:grid-cols-2">
        <div className="surface-card rounded-3xl p-6">
          <h2 className="font-display text-sm font-bold">About</h2>
          <dl className="mt-3 space-y-2 text-sm text-muted-foreground">
            <div className="flex justify-between gap-3">
              <dt>Completed help</dt>
              <dd className="font-medium text-foreground">{person.completed_help_count ?? 0}</dd>
            </div>
            {person.show_location ? (
              <div className="flex justify-between gap-3">
                <dt>Location</dt>
                <dd className="font-medium text-foreground">
                  {[person.city, person.country].filter(Boolean).join(", ") || "—"}
                </dd>
              </div>
            ) : null}
          </dl>
          <p className="mt-5 text-xs text-muted-foreground">
            Counts reflect verified activity completed on Goodivo only. Contact details are never shown publicly.
          </p>
        </div>
        <div className="surface-card rounded-3xl p-6">
          <h2 className="font-display text-sm font-bold">Feedback</h2>
          {reviews.data?.length ? (
            <ul className="mt-3 space-y-3">
              {reviews.data.map((review) => (
                <li key={review.id} className="rounded-xl bg-secondary p-3">
                  <p className="text-sm font-semibold">{review.rating} / 5</p>
                  {review.comment ? <p className="mt-1 text-sm text-muted-foreground">{review.comment}</p> : null}
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-3 text-sm text-muted-foreground">
              No feedback yet. Reviews appear only after a completed engagement.
            </p>
          )}
        </div>
      </div>
    </AppShell>
  );
}
