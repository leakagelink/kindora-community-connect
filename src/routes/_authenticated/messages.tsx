import { createFileRoute } from "@tanstack/react-router";

import { AppShell, PageHeading } from "@/components/site/AppShell";

export const Route = createFileRoute("/_authenticated/messages")({
  component: MessagesPage,
});

function MessagesPage() {
  return (
    <AppShell>
      <PageHeading
        eyebrow="Inbox"
        title="Messages"
        description="Private conversations about requests and listings will appear here."
      />
    </AppShell>
  );
}
