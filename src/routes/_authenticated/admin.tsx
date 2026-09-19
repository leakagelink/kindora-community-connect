import { createFileRoute } from "@tanstack/react-router";

import { AppShell, PageHeading } from "@/components/site/AppShell";

export const Route = createFileRoute("/_authenticated/admin")({
  component: AdminPage,
});

function AdminPage() {
  return (
    <AppShell>
      <PageHeading
        eyebrow="Staff only"
        title="Admin & moderation"
        description="Reports, moderation actions, categories and analytics will live here. Access is enforced by server-side role checks."
      />
    </AppShell>
  );
}
