import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { AiToolPage, download } from "@/components/goodivo/AiTool";
import { Field, FormCard } from "@/components/goodivo/FormBits";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { runAiTool } from "@/lib/ai.functions";

export const Route = createFileRoute("/ai-tools/website")({
  head: () => ({
    meta: [
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { title: "Free Website Starter — Goodivo" },
      { name: "description", content: "Generate a simple one-page website for free, preview it and export the code." },
      { property: "og:title", content: "Free Website Starter — Goodivo" },
      { property: "og:description", content: "Generate a simple one-page website for free on Goodivo." },
    ],
  }),
  component: WebsiteTool,
});

function WebsiteTool() {
  const generate = useServerFn(runAiTool);
  const queryClient = useQueryClient();
  const [form, setForm] = useState({
    name: "",
    industry: "",
    description: "",
    sections: "hero, about, services, contact",
    style: "clean and warm",
  });
  const [result, setResult] = useState<{ html: string; notes?: string } | null>(null);
  const [busy, setBusy] = useState(false);

  return (
    <AiToolPage
      tool="website_starter"
      flagKey="ai_website_starter"
      title="Website Starter"
      description="Get a simple, single-page website you can preview and download as HTML to build on."
    >
      {(quota) => (
        <>
          <FormCard title="Your site">
            <Field id="w-name" label="Site name" required>
              <Input id="w-name" value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} />
            </Field>
            <Field id="w-industry" label="Industry">
              <Input id="w-industry" value={form.industry} onChange={(event) => setForm({ ...form, industry: event.target.value })} />
            </Field>
            <Field id="w-description" label="What it's about" required>
              <Textarea
                id="w-description"
                rows={4}
                value={form.description}
                onChange={(event) => setForm({ ...form, description: event.target.value })}
              />
            </Field>
            <Field id="w-sections" label="Sections" hint="Comma separated.">
              <Input id="w-sections" value={form.sections} onChange={(event) => setForm({ ...form, sections: event.target.value })} />
            </Field>
            <Field id="w-style" label="Style">
              <Input id="w-style" value={form.style} onChange={(event) => setForm({ ...form, style: event.target.value })} />
            </Field>
            <Button
              className="rounded-full"
              disabled={busy || quota.remaining === 0}
              onClick={async () => {
                if (!form.name.trim() || form.description.trim().length < 10) {
                  toast.error("Add a site name and a short description.");
                  return;
                }
                setBusy(true);
                try {
                  const output = await generate({ data: { tool: "website_starter", input: form } });
                  setResult(JSON.parse(output.outputJson) as { html: string; notes?: string });
                  void quota.refetchUsage();
                  void queryClient.invalidateQueries({ queryKey: ["ai-history", "website_starter"] });
                } catch (error) {
                  toast.error(error instanceof Error ? error.message : "Generation failed");
                } finally {
                  setBusy(false);
                }
              }}
            >
              {busy ? "Building…" : quota.remaining === 0 ? "Daily limit reached" : "Build my page"}
            </Button>
          </FormCard>

          {result ? (
            <section className="surface-card rounded-3xl p-6">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <h2 className="font-display text-base font-bold">Preview</h2>
                <Button
                  size="sm"
                  variant="outline"
                  className="rounded-full"
                  onClick={() => download(`${form.name || "website"}.html`, result.html, "text/html")}
                >
                  Download HTML
                </Button>
              </div>
              <iframe
                title="Website preview"
                sandbox=""
                srcDoc={result.html}
                className="mt-4 h-[520px] w-full rounded-2xl border border-border bg-background"
              />
              {result.notes ? <p className="mt-3 text-xs text-muted-foreground">{result.notes}</p> : null}
            </section>
          ) : null}
        </>
      )}
    </AiToolPage>
  );
}
