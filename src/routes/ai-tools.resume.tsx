import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { AiToolPage, download } from "@/components/kindora/AiTool";
import { Field, FormCard, NativeSelect } from "@/components/kindora/FormBits";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { runAiTool } from "@/lib/ai.functions";

export const Route = createFileRoute("/ai-tools/resume")({
  head: () => ({
    meta: [
      { title: "Free Resume Builder — Kindora" },
      { name: "description", content: "Write a clean resume for free, preview it and export it as a PDF." },
      { property: "og:title", content: "Free Resume Builder — Kindora" },
      { property: "og:description", content: "Write a clean resume for free on Kindora." },
    ],
  }),
  component: ResumeTool,
});

type Resume = { summary: string; sections: { heading: string; items: string[] }[] };

function ResumeTool() {
  const generate = useServerFn(runAiTool);
  const queryClient = useQueryClient();
  const [form, setForm] = useState({
    fullName: "",
    headline: "",
    contact: "",
    education: "",
    experience: "",
    skills: "",
    projects: "",
    template: "professional",
  });
  const [resume, setResume] = useState<Resume | null>(null);
  const [busy, setBusy] = useState(false);

  const asHtml = (data: Resume) =>
    `<!doctype html><html><head><meta charset="utf-8"><title>${form.fullName} — Resume</title><style>body{font-family:system-ui,sans-serif;max-width:760px;margin:40px auto;padding:0 24px;color:#141B2E;line-height:1.5}h1{margin-bottom:4px}h2{margin-top:28px;border-bottom:1px solid #ddd;padding-bottom:4px;font-size:15px;text-transform:uppercase;letter-spacing:.08em}li{margin-bottom:6px}</style></head><body><h1>${form.fullName}</h1><p>${form.headline}</p><p>${form.contact}</p><p>${data.summary}</p>${data.sections
      .map((section) => `<h2>${section.heading}</h2><ul>${section.items.map((item) => `<li>${item}</li>`).join("")}</ul>`)
      .join("")}</body></html>`;

  return (
    <AiToolPage
      tool="resume_builder"
      flagKey="ai_resume_builder"
      title="Resume Builder"
      description="Add your details and get clear, factual wording you can preview and export. Nothing is invented for you."
    >
      {(quota) => (
        <>
          <FormCard title="Your details" description="Use a professional email only. Never add ID numbers or your full address.">
            <Field id="r-name" label="Full name" required>
              <Input id="r-name" value={form.fullName} onChange={(event) => setForm({ ...form, fullName: event.target.value })} />
            </Field>
            <Field id="r-headline" label="Headline">
              <Input id="r-headline" value={form.headline} onChange={(event) => setForm({ ...form, headline: event.target.value })} />
            </Field>
            <Field id="r-contact" label="Contact line" hint="For example: city, email, portfolio link.">
              <Input id="r-contact" value={form.contact} onChange={(event) => setForm({ ...form, contact: event.target.value })} />
            </Field>
            <Field id="r-education" label="Education">
              <Textarea id="r-education" rows={3} value={form.education} onChange={(event) => setForm({ ...form, education: event.target.value })} />
            </Field>
            <Field id="r-experience" label="Experience">
              <Textarea id="r-experience" rows={4} value={form.experience} onChange={(event) => setForm({ ...form, experience: event.target.value })} />
            </Field>
            <Field id="r-skills" label="Skills">
              <Textarea id="r-skills" rows={2} value={form.skills} onChange={(event) => setForm({ ...form, skills: event.target.value })} />
            </Field>
            <Field id="r-projects" label="Projects">
              <Textarea id="r-projects" rows={3} value={form.projects} onChange={(event) => setForm({ ...form, projects: event.target.value })} />
            </Field>
            <Field id="r-template" label="Template tone">
              <NativeSelect id="r-template" value={form.template} onChange={(value) => setForm({ ...form, template: value })}>
                {["professional", "modern", "academic", "creative"].map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </NativeSelect>
            </Field>
            <Button
              className="rounded-full"
              disabled={busy || quota.remaining === 0}
              onClick={async () => {
                if (!form.fullName.trim()) {
                  toast.error("Please enter your name.");
                  return;
                }
                setBusy(true);
                try {
                  const result = await generate({ data: { tool: "resume_builder", input: form } });
                  setResume(result.output as unknown as Resume);
                  void quota.refetchUsage();
                  void queryClient.invalidateQueries({ queryKey: ["ai-history", "resume_builder"] });
                } catch (error) {
                  toast.error(error instanceof Error ? error.message : "Generation failed");
                } finally {
                  setBusy(false);
                }
              }}
            >
              {busy ? "Writing…" : quota.remaining === 0 ? "Daily limit reached" : "Build my resume"}
            </Button>
          </FormCard>

          {resume ? (
            <section className="surface-card rounded-3xl p-6">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <h2 className="font-display text-base font-bold">Preview</h2>
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" className="rounded-full" onClick={() => download(`${form.fullName || "resume"}.html`, asHtml(resume), "text/html")}>
                    Download HTML
                  </Button>
                  <Button
                    size="sm"
                    className="rounded-full"
                    onClick={() => {
                      const win = window.open("", "_blank");
                      if (!win) {
                        toast.error("Allow pop-ups to export a PDF.");
                        return;
                      }
                      win.document.write(asHtml(resume));
                      win.document.close();
                      win.print();
                    }}
                  >
                    Export PDF
                  </Button>
                </div>
              </div>
              <div className="mt-4 space-y-4 text-sm">
                <p className="text-muted-foreground">{resume.summary}</p>
                {(resume.sections ?? []).map((section) => (
                  <div key={section.heading}>
                    <h3 className="font-display text-sm font-bold">{section.heading}</h3>
                    <ul className="mt-1 list-disc space-y-1 pl-5 text-muted-foreground">
                      {section.items.map((item, index) => (
                        <li key={index}>{item}</li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            </section>
          ) : null}
        </>
      )}
    </AiToolPage>
  );
}
