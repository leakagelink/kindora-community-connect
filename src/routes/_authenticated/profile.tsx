import { createFileRoute } from "@tanstack/react-router";

import { AppShell, PageHeading } from "@/components/site/AppShell";

export const Route = createFileRoute("/_authenticated/profile")({
  component: ProfilePage,
});

function ProfilePage() {
  return (
    <AppShell>
      <PageHeading
        eyebrow="Your account"
        title="Your profile"
        description="Your requests, offers and settings will appear here as we finish this section."
      />
    </AppShell>
  );
}
