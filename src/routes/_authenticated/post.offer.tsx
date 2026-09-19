import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { z } from "zod";

import { AppShell, PageHeading } from "@/components/site/AppShell";
import { Field, FormCard, FreeNotice, NativeSelect } from "@/components/kindora/FormBits";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { EXPERIENCE_LEVELS } from "@/lib/kindora";

const schema = z.object({
  headline: z.string().trim().min(8, "Add a short headline (at least 8 characters).").max(120),
  intro: z.string().trim().min(30, "Write a short intro (at least 30 characters).").max(1500),
  skills: z.string().trim().min(2, "List at least one skill."),
  experience: z.enum(["beginner", "intermediate", "experienced", "professional"]),
  availability: z.string().trim().max(200),
  is_remote: z.boolean(),
  location: z.string().trim().max(120),
  languages: z.string().trim().max(200),
  portfolio_links: z.string().trim().max(600),
});

function splitList(value: string) {
  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean)
    .slice(0, 20);
}

export const Route = createFileRoute("/_authenticated/post/offer")({
  head: () => ({
    meta: [
      { title: "Offer your help — Kindora" },
      { name: "description", content: "Publish a helper profile with your skills, availability and languages." },
      { property: "og:title", content: "Offer your help — Kindora" },
      { property: "og:description", content: "Publish a helper profile with your skills and availability." },
    ],
  }),
  component: PostOffer,
});

function PostOffer() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user } = useAuth();

  const [form, setForm] = useState({
    headline: "",
    intro: "",
    skills: "",
    experience: "intermediate",
    availability: "",
    is_remote: true,
    location: "",
    languages: "",
    portfolio_links: "",
  });

  function set<K extends keyof typeof form>(key: K, value: (typeof form)[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  const mutation = useMutation({
    mutationFn: async () => {
      const parsed = schema.safeParse(form);
      if (!parsed.success) throw new Error(parsed.error.issues[0]?.message ?? "Please check the form.");
      const value = parsed.data;
      const links = splitList(value.portfolio_links);
      if (links.some((link) => !/^https?:\/\//i.test(link))) {
        throw new Error("Portfolio links must start with http:// or https://");
      }
      const { data, error } = await supabase
        .from("service_offers")
        .insert({
          user_id: user!.id,
          headline: value.headline,
          intro: value.intro,
          skills: splitList(value.skills),
          experience: value.experience,
          availability: value.availability || null,
          is_remote: value.is_remote,
          location: value.is_remote ? null : value.location || null,
          languages: splitList(value.languages),
          portfolio_links: links,
          is_active: true,
        })
        .select("id")
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["service-offers"] });
      toast.success("Your helper profile is live.");
      void navigate({ to: "/profile" });
    },
    onError: (error) => toast.error(error instanceof Error ? error.message : "Couldn't publish your profile."),
  });

  return (
    <AppShell>
      <PageHeading
        eyebrow="I want to help"
        title="Publish a helper profile"
        description="Tell people what you can help with and how much time you realistically have."
      />

      <form
        className="grid gap-4 md:grid-cols-[1.4fr_0.6fr]"
        onSubmit={(event) => {
          event.preventDefault();
          mutation.mutate();
        }}
      >
        <div className="space-y-4">
          <FormCard title="What you offer">
            <Field id="headline" label="Headline" required>
              <Input
                id="headline"
                value={form.headline}
                maxLength={120}
                onChange={(e) => set("headline", e.target.value)}
                placeholder="e.g. Graphic designer helping small local businesses"
              />
            </Field>
            <Field id="intro" label="Short intro" required hint="What you enjoy helping with, and anything you can't take on.">
              <Textarea
                id="intro"
                rows={5}
                maxLength={1500}
                value={form.intro}
                onChange={(e) => set("intro", e.target.value)}
              />
            </Field>
            <Field id="skills" label="Skills" required hint="Comma separated, e.g. Logo design, Poster design, Canva">
              <Input id="skills" value={form.skills} onChange={(e) => set("skills", e.target.value)} />
            </Field>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field id="experience" label="Experience level" required>
                <NativeSelect id="experience" value={form.experience} onChange={(value) => set("experience", value)}>
                  {EXPERIENCE_LEVELS.map((level) => (
                    <option key={level.value} value={level.value}>
                      {level.label}
                    </option>
                  ))}
                </NativeSelect>
              </Field>
              <Field id="languages" label="Languages" hint="Comma separated.">
                <Input id="languages" value={form.languages} onChange={(e) => set("languages", e.target.value)} />
              </Field>
            </div>
          </FormCard>

          <FormCard title="Availability and reach">
            <Field id="availability" label="Availability" hint="Be honest — e.g. 2 hours a week, evenings only.">
              <Input
                id="availability"
                maxLength={200}
                value={form.availability}
                onChange={(e) => set("availability", e.target.value)}
              />
            </Field>
            <div className="flex items-start gap-2.5">
              <Checkbox
                id="is_remote"
                checked={form.is_remote}
                onCheckedChange={(checked) => set("is_remote", checked === true)}
              />
              <label htmlFor="is_remote" className="text-sm leading-snug">
                I can help remotely
              </label>
            </div>
            {!form.is_remote ? (
              <Field id="location" label="Location" hint="City or area only.">
                <Input id="location" maxLength={120} value={form.location} onChange={(e) => set("location", e.target.value)} />
              </Field>
            ) : null}
            <Field id="portfolio_links" label="Portfolio links" hint="Comma separated URLs. Optional.">
              <Input
                id="portfolio_links"
                maxLength={600}
                value={form.portfolio_links}
                onChange={(e) => set("portfolio_links", e.target.value)}
                placeholder="https://…"
              />
            </Field>
          </FormCard>
        </div>

        <aside className="space-y-4 md:sticky md:top-24 md:self-start">
          <FormCard title="Good to know">
            <FreeNotice>
              You can never require payment for help offered here, including tips, fees or deposits.
            </FreeNotice>
            <FreeNotice>
              You choose which requests to apply to. There's no obligation and no penalty for declining.
            </FreeNotice>
            <FreeNotice>
              Your completed-help count only ever reflects verified activity completed on Kindora.
            </FreeNotice>
          </FormCard>
          <Button type="submit" size="pill" className="w-full" disabled={mutation.isPending}>
            {mutation.isPending ? "Publishing…" : "Publish helper profile"}
          </Button>
        </aside>
      </form>
    </AppShell>
  );
}
