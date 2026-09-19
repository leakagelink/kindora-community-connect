import { createFileRoute, Link } from "@tanstack/react-router";

import { AppShell, PageHeading } from "@/components/site/AppShell";
import { LEGAL_PLACEHOLDERS } from "@/lib/legal";

export const Route = createFileRoute("/contact")({
  head: () => ({
    meta: [
      { title: "Contact and support — Kindora" },
      { name: "description", content: "How to reach the Kindora team for support, safety concerns or policy questions." },
      { property: "og:title", content: "Contact and support — Kindora" },
      { property: "og:description", content: "How to reach the Kindora team for support or safety concerns." },
    ],
  }),
  component: Contact,
});

function Contact() {
  return (
    <AppShell>
      <PageHeading
        eyebrow="Support"
        title="Contact Kindora"
        description="We read every safety report. For anything urgent, use the report button on the content itself so moderators get the full context."
      />
      <div className="grid gap-4 md:grid-cols-2">
        <div className="surface-card rounded-3xl p-6">
          <h2 className="font-display text-lg font-bold">Support email</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            {LEGAL_PLACEHOLDERS.email} — this address is a placeholder until the support mailbox is confirmed.
          </p>
          <h2 className="mt-6 font-display text-lg font-bold">Operating entity</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            {LEGAL_PLACEHOLDERS.entity}, powered by Socilet. {LEGAL_PLACEHOLDERS.address}.
          </p>
        </div>
        <div className="surface-card rounded-3xl p-6">
          <h2 className="font-display text-lg font-bold">Reporting something unsafe</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Use the report action on any request, listing, profile, message or review. You can also block a user from
            their profile, which stops further contact.
          </p>
          <ul className="mt-4 space-y-2 text-sm text-muted-foreground">
            <li>
              <Link to="/legal/$slug" params={{ slug: "community-guidelines" }} className="font-semibold text-primary">
                Community Guidelines
              </Link>
            </li>
            <li>
              <Link to="/legal/$slug" params={{ slug: "prohibited-items" }} className="font-semibold text-primary">
                Prohibited Products and Services
              </Link>
            </li>
            <li>
              <Link to="/legal/$slug" params={{ slug: "account-deletion" }} className="font-semibold text-primary">
                Account deletion
              </Link>
            </li>
          </ul>
        </div>
      </div>
    </AppShell>
  );
}
