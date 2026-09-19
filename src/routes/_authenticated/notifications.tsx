import { createFileRoute } from "@tanstack/react-router";

import { AppShell, PageHeading } from "@/components/site/AppShell";

export const Route = createFileRoute("/_authenticated/notifications")({
  component: NotificationsPage,
});

function NotificationsPage() {
  return (
    <AppShell>
      <PageHeading
        eyebrow="Activity"
        title="Notifications"
        description="Offers, status changes and safety updates will appear here."
      />
    </AppShell>
  );
}
