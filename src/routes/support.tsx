import { createFileRoute } from "@tanstack/react-router";

import { AppShell, PageHeading } from "@/components/site/AppShell";

export const Route = createFileRoute("/support")({
  head: () => ({
    meta: [
      { title: "Support Goodivo — Goodivo" },
      { name: "description", content: "Optional voluntary support for Goodivo. Help on Goodivo is always free." },
      { property: "og:title", content: "Support Goodivo" },
      { property: "og:description", content: "Optional voluntary support. Help on Goodivo is always free." },
    ],
  }),
  component: SupportPage,
});

function SupportPage() {
  return (
    <AppShell>
      <PageHeading
        eyebrow="Optional"
        title="Support Goodivo"
        description="Voluntary support helps cover running costs. It is never required and never affects the help you receive."
      />
      <div className="surface-card rounded-3xl p-6 text-sm text-muted-foreground">
        Voluntary support is not open yet. It stays switched off until payment and legal requirements are verified.
        Donations will never unlock services, change ranking, or influence whether a request is accepted.
      </div>
    </AppShell>
  );
}
