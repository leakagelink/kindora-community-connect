import { createFileRoute } from "@tanstack/react-router";

import { AppShell, PageHeading } from "@/components/site/AppShell";

export const Route = createFileRoute("/ai-tools/resume")({
  head: () => ({
    meta: [
      { title: "Resume Builder — Kindora" },
      { name: "description", content: "Build a clean resume and export it as a PDF." },
      { property: "og:title", content: "Resume Builder — Kindora" },
      { property: "og:description", content: "Build a clean resume and export it as a PDF." },
    ],
  }),
  component: ToolPage,
});

function ToolPage() {
  return (
    <AppShell>
      <PageHeading eyebrow="Free AI tool" title="Resume Builder" description="Build a clean resume and export it as a PDF." />
      <div className="surface-card rounded-3xl p-6 text-sm text-muted-foreground">
        This tool is being connected next. Fair usage limits will apply, and AI output should always be reviewed
        before you rely on it.
      </div>
    </AppShell>
  );
}
