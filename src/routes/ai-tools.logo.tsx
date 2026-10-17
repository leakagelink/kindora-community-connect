import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { AiToolPage, download } from "@/components/goodivo/AiTool";
import { Field, FormCard } from "@/components/goodivo/FormBits";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { runAiTool } from "@/lib/ai.functions";

export const Route = createFileRoute("/ai-tools/logo")({
  head: () => ({
    meta: [
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { title: "Free Logo Maker — Goodivo" },
      { name: "description", content: "Generate simple logo concepts for free and download them as SVG." },
      { property: "og:title", content: "Free Logo Maker — Goodivo" },
      { property: "og:description", content: "Generate simple logo concepts for free on Goodivo." },
    ],
  }),
  component: LogoTool,
});

type Concept = { name: string; idea: string; svg: string };

function LogoTool() {
  const generate = useServerFn(runAiTool);
  const queryClient = useQueryClient();
  const [form, setForm] = useState({ name: "", industry: "", style: "modern, minimal", color: "#2E5CFF" });
  const [concepts, setConcepts] = useState<Concept[]>([]);
  const [busy, setBusy] = useState(false);

  return (
    <AiToolPage
      tool="logo_maker"
      flagKey="ai_logo_maker"
      title="Logo Maker"
      description="Describe your brand and get simple logo concepts you can preview, download and keep in your account."
    >
      {(quota) => (
        <>
          <FormCard title="Your brand">
            <Field id="logo-name" label="Brand name" required>
              <Input id="logo-name" value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} />
            </Field>
            <Field id="logo-industry" label="Industry">
              <Input
                id="logo-industry"
                value={form.industry}
                onChange={(event) => setForm({ ...form, industry: event.target.value })}
              />
            </Field>
            <Field id="logo-style" label="Style">
              <Input id="logo-style" value={form.style} onChange={(event) => setForm({ ...form, style: event.target.value })} />
            </Field>
            <Field id="logo-color" label="Primary colour">
              <Input id="logo-color" value={form.color} onChange={(event) => setForm({ ...form, color: event.target.value })} />
            </Field>
            <Button
              className="rounded-full"
              disabled={busy || quota.remaining === 0}
              onClick={async () => {
                if (!form.name.trim()) {
                  toast.error("Please enter your brand name.");
                  return;
                }
                setBusy(true);
                try {
                  const result = await generate({ data: { tool: "logo_maker", input: form } });
                  const parsed = JSON.parse(result.outputJson) as { concepts?: Concept[] };
                  setConcepts((parsed.concepts ?? []).slice(0, 3));
                  void quota.refetchUsage();
                  void queryClient.invalidateQueries({ queryKey: ["ai-history", "logo_maker"] });
                } catch (error) {
                  toast.error(error instanceof Error ? error.message : "Generation failed");
                } finally {
                  setBusy(false);
                }
              }}
            >
              {busy ? "Generating…" : quota.remaining === 0 ? "Daily limit reached" : "Generate concepts"}
            </Button>
          </FormCard>

          {concepts.length ? (
            <div className="grid gap-4 sm:grid-cols-3">
              {concepts.map((concept, index) => (
                <div key={index} className="surface-card rounded-3xl p-4">
                  <iframe
                    title={`Logo concept ${index + 1}`}
                    sandbox=""
                    className="h-40 w-full rounded-2xl bg-background"
                    srcDoc={`<!doctype html><body style="margin:0;display:grid;place-items:center;height:100%">${concept.svg}</body>`}
                  />
                  <p className="mt-3 font-display text-sm font-bold">{concept.name}</p>
                  <p className="mt-1 text-xs text-muted-foreground">{concept.idea}</p>
                  <Button
                    size="sm"
                    variant="outline"
                    className="mt-3 rounded-full"
                    onClick={() => download(`${form.name || "logo"}-${index + 1}.svg`, concept.svg, "image/svg+xml")}
                  >
                    Download SVG
                  </Button>
                </div>
              ))}
            </div>
          ) : null}
        </>
      )}
    </AiToolPage>
  );
}
