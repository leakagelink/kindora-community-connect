import { createFileRoute } from "@tanstack/react-router";

import { AppShell, PageHeading } from "@/components/site/AppShell";

export const Route = createFileRoute("/ai-tools/logo")({
  head: () => ({
    meta: [
      { title: "Logo Maker — Kindora" },
      { name: "description", content: "Generate simple logo concepts you can preview and save." },
      { property: "og:title", content: "Logo Maker — Kindora" },
      { property: "og:description", content: "Generate simple logo concepts you can preview and save." },
    ],
  }),
  component: ToolPage,
});

function ToolPage() {
  return (
    <AppShell>
      <PageHeading eyebrow="Free AI tool" title="Logo Maker" description="Generate simple logo concepts you can preview and save." />
      <div className="surface-card rounded-3xl p-6 text-sm text-muted-foreground">
        This tool is being connected next. Fair usage limits will apply, and AI output should always be reviewed
        before you rely on it.
      </div>
    </AppShell>
  );
}
