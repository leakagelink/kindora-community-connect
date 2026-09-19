import { createFileRoute } from "@tanstack/react-router";

import { AppShell, PageHeading } from "@/components/site/AppShell";
import { AI_TOOLS } from "@/lib/kindora";

export const Route = createFileRoute("/ai-tools")({
  head: () => ({
    meta: [
      { title: "Free AI tools — Kindora" },
      { name: "description", content: "Free community AI tools: logo maker, resume builder and website starter." },
      { property: "og:title", content: "Free AI tools — Kindora" },
      { property: "og:description", content: "Free community AI tools on Kindora, with fair usage limits." },
    ],
  }),
  component: AiToolsPage,
});

function AiToolsPage() {
  return (
    <AppShell>
      <PageHeading
        eyebrow="Free tools"
        title="Free AI tools"
        description="Fair usage limits apply. Always review AI output before you use it."
      />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {AI_TOOLS.map((tool) => (
          <div key={tool.key} className="surface-card rounded-3xl p-6">
            <h2 className="font-display text-base font-bold">{tool.name}</h2>
            <p className="mt-2 text-sm text-muted-foreground">{tool.description}</p>
            <p className="mt-4 text-xs text-muted-foreground">Coming in the next build step.</p>
          </div>
        ))}
      </div>
    </AppShell>
  );
}
