import { createFileRoute } from "@tanstack/react-router";

import { AppShell, PageHeading } from "@/components/site/AppShell";

export const Route = createFileRoute("/ai-tools/website")({
  head: () => ({
    meta: [
      { title: "Website Starter — Kindora" },
      { name: "description", content: "Generate a simple landing page starting point." },
      { property: "og:title", content: "Website Starter — Kindora" },
      { property: "og:description", content: "Generate a simple landing page starting point." },
    ],
  }),
  component: ToolPage,
});

function ToolPage() {
  return (
    <AppShell>
      <PageHeading eyebrow="Free AI tool" title="Website Starter" description="Generate a simple landing page starting point." />
      <div className="surface-card rounded-3xl p-6 text-sm text-muted-foreground">
        This tool is being connected next. Fair usage limits will apply, and AI output should always be reviewed
        before you rely on it.
      </div>
    </AppShell>
  );
}
