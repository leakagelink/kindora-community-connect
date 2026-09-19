import { createFileRoute, Link } from "@tanstack/react-router";

import { AppShell, PageHeading } from "@/components/site/AppShell";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/about")({
  head: () => ({
    meta: [
      { title: "About Kindora — free community help, powered by Socilet" },
      {
        name: "description",
        content:
          "Kindora is a community platform where people request free services, share skills and give away permitted products. Powered by Socilet.",
      },
      { property: "og:title", content: "About Kindora" },
      { property: "og:description", content: "A community platform for free help, shared skills and free products." },
    ],
  }),
  component: About,
});

function About() {
  return (
    <AppShell>
      <PageHeading eyebrow="About" title="Free help, built on goodwill" />
      <div className="grid gap-4 md:grid-cols-[1.2fr_0.8fr]">
        <div className="surface-card rounded-3xl p-6 sm:p-8">
          <p className="text-sm leading-relaxed text-muted-foreground">
            Kindora exists so that people who need practical help — a logo for a small shop, a resume review, coding
            guidance, a school textbook — can ask for it openly, and people with skills or spare things can offer them
            without money getting in the way.
          </p>
          <p className="mt-4 text-sm leading-relaxed text-muted-foreground">
            Receiving help is always free. Volunteers choose what they take on based on their own time and capacity, so
            nothing here is a promise of delivery. What we do promise is a space that is moderated, reportable, and
            honest about its limits: no fabricated statistics, no invented endorsements, no paid priority.
          </p>
          <p className="mt-4 text-sm leading-relaxed text-muted-foreground">
            Voluntary donations may be offered in future to cover running costs. They will never unlock services,
            improve ranking, or influence whether a request is accepted.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Button asChild variant="help" className="rounded-full">
              <Link to="/post/request">I Need Help</Link>
            </Button>
            <Button asChild variant="offer" className="rounded-full">
              <Link to="/post/offer">I Want to Help</Link>
            </Button>
          </div>
        </div>
        <div className="space-y-4">
          <div className="surface-card rounded-3xl p-6">
            <h2 className="font-display text-base font-bold">Powered by Socilet</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Kindora is built and operated as part of Socilet. Product decisions favour user safety, privacy and
              maintainability over growth metrics.
            </p>
          </div>
          <div className="surface-card rounded-3xl p-6">
            <h2 className="font-display text-base font-bold">Our commitments</h2>
            <ul className="mt-2 space-y-2 text-sm text-muted-foreground">
              <li>No mandatory payment for help, ever.</li>
              <li>Content reviewed before it goes public.</li>
              <li>Report and block available everywhere.</li>
              <li>Private contact details never exposed by default.</li>
              <li>Clear, adjustable limits on free AI tools.</li>
            </ul>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
