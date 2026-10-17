import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { z } from "zod";

import { AppShell, PageHeading } from "@/components/site/AppShell";
import { Field, FormCard, FreeNotice, NativeSelect } from "@/components/goodivo/FormBits";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { categoriesQuery, REQUEST_TYPES } from "@/lib/goodivo";

const schema = z.object({
  title: z.string().trim().min(8, "Give your request a clear title (at least 8 characters).").max(120),
  description: z.string().trim().min(40, "Describe what you need in at least 40 characters.").max(4000),
  request_type: z.enum(["digital_service", "skill_knowledge", "product"]),
  category_id: z.string().uuid("Choose a category."),
  is_remote: z.boolean(),
  location: z.string().trim().max(120),
  language: z.string().trim().max(60),
  needed_by: z.string().min(1, "Choose the date you need this by."),
  required_features: z.string().trim().max(2000),
  expected_deliverables: z.string().trim().max(2000),
  complexity: z.string().trim().max(60),
  hosting_expectations: z.string().trim().max(500),
  is_prototype: z.boolean(),
});

const HIGH_EFFORT_HINT = ["digital_service"];

export const Route = createFileRoute("/_authenticated/post/request")({
  head: () => ({
    meta: [
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { title: "Request free help — Goodivo" },
      { name: "description", content: "Describe what you need. Receiving help on Goodivo is always free." },
      { property: "og:title", content: "Request free help — Goodivo" },
      { property: "og:description", content: "Describe what you need. Receiving help on Goodivo is always free." },
    ],
  }),
  component: PostRequest,
});

function PostRequest() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const categories = useQuery(categoriesQuery);

  const [form, setForm] = useState({
    title: "",
    description: "",
    request_type: "digital_service",
    category_id: "",
    is_remote: true,
    location: "",
    language: "",
    needed_by: "",
    required_features: "",
    expected_deliverables: "",
    complexity: "",
    hosting_expectations: "",
    is_prototype: true,
    scope_open: false,
  });

  function set<K extends keyof typeof form>(key: K, value: (typeof form)[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  const relevant = (categories.data ?? []).filter((category) =>
    form.request_type === "product" ? category.group_name === "Free Products" : category.group_name !== "Free Products",
  );

  const mutation = useMutation({
    mutationFn: async (asDraft: boolean) => {
      const parsed = schema.safeParse(form);
      if (!parsed.success) throw new Error(parsed.error.issues[0]?.message ?? "Please check the form.");
      const value = parsed.data;
      if (!value.is_remote && !value.location) throw new Error("Add a location, or mark the request as remote.");

      const { data, error } = await supabase
        .from("help_requests")
        .insert({
          owner_id: user!.id,
          title: value.title,
          description: value.description,
          request_type: value.request_type,
          category_id: value.category_id,
          is_remote: value.is_remote,
          location: value.is_remote ? null : value.location,
          language: value.language || null,
          needed_by: value.needed_by,
          required_features: value.required_features || null,
          expected_deliverables: value.expected_deliverables || null,
          complexity: value.complexity || null,
          hosting_expectations: value.hosting_expectations || null,
          is_prototype: value.is_prototype,
          status: asDraft ? "draft" : "pending_review",
        })
        .select("id")
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (data, asDraft) => {
      void queryClient.invalidateQueries({ queryKey: ["help-requests"] });
      void queryClient.invalidateQueries({ queryKey: ["my-requests"] });
      toast.success(asDraft ? "Saved as a draft." : "Submitted for review. You'll be notified when it's published.");
      void navigate({ to: "/requests/$id", params: { id: data.id } });
    },
    onError: (error) => toast.error(error instanceof Error ? error.message : "Couldn't save your request."),
  });

  return (
    <AppShell>
      <PageHeading
        eyebrow="I need help"
        title="Describe what you need"
        description="Be specific about the outcome and your deadline — it helps volunteers judge whether they can take it on."
      />

      <form
        className="grid gap-4 md:grid-cols-[1.4fr_0.6fr]"
        onSubmit={(event) => {
          event.preventDefault();
          mutation.mutate(false);
        }}
      >
        <div className="space-y-4">
          <FormCard title="The basics">
            <Field id="title" label="Title" required>
              <Input
                id="title"
                value={form.title}
                maxLength={120}
                onChange={(e) => set("title", e.target.value)}
                placeholder="e.g. Logo for a small tailoring shop"
              />
            </Field>
            <Field
              id="description"
              label="What do you need?"
              required
              hint="Include the purpose, any constraints, and what a good result looks like."
            >
              <Textarea
                id="description"
                value={form.description}
                maxLength={4000}
                rows={6}
                onChange={(e) => set("description", e.target.value)}
              />
            </Field>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field id="request_type" label="Type" required>
                <NativeSelect
                  id="request_type"
                  value={form.request_type}
                  onChange={(value) => {
                    set("request_type", value);
                    set("category_id", "");
                  }}
                >
                  {REQUEST_TYPES.map((type) => (
                    <option key={type.value} value={type.value}>
                      {type.label}
                    </option>
                  ))}
                </NativeSelect>
              </Field>
              <Field id="category_id" label="Category" required>
                <NativeSelect id="category_id" value={form.category_id} onChange={(value) => set("category_id", value)}>
                  <option value="">Select a category…</option>
                  {relevant.map((category) => (
                    <option key={category.id} value={category.id}>
                      {category.name}
                    </option>
                  ))}
                </NativeSelect>
              </Field>
            </div>
          </FormCard>

          <FormCard title="Where and when">
            <div className="flex items-start gap-2.5">
              <Checkbox
                id="is_remote"
                checked={form.is_remote}
                onCheckedChange={(checked) => set("is_remote", checked === true)}
              />
              <label htmlFor="is_remote" className="text-sm leading-snug">
                This can be done remotely
              </label>
            </div>
            {!form.is_remote ? (
              <Field id="location" label="Location" required hint="City or area is enough — never your exact address.">
                <Input
                  id="location"
                  value={form.location}
                  maxLength={120}
                  onChange={(e) => set("location", e.target.value)}
                  placeholder="e.g. Pune, Maharashtra"
                />
              </Field>
            ) : null}
            <div className="grid gap-4 sm:grid-cols-2">
              <Field id="needed_by" label="Needed by" required>
                <Input
                  id="needed_by"
                  type="date"
                  value={form.needed_by}
                  min={new Date().toISOString().slice(0, 10)}
                  onChange={(e) => set("needed_by", e.target.value)}
                />
              </Field>
              <Field id="language" label="Preferred language" hint="Optional.">
                <Input
                  id="language"
                  value={form.language}
                  maxLength={60}
                  onChange={(e) => set("language", e.target.value)}
                  placeholder="e.g. English, Hindi"
                />
              </Field>
            </div>
          </FormCard>

          {HIGH_EFFORT_HINT.includes(form.request_type) ? (
            <FormCard
              title="Scope details"
              description="Required for larger builds such as a full website or app. Clear scope makes acceptance far more likely."
            >
              <button
                type="button"
                onClick={() => set("scope_open", !form.scope_open)}
                className="text-sm font-semibold text-primary"
              >
                {form.scope_open ? "Hide scope fields" : "This is a website or app build — add scope"}
              </button>
              {form.scope_open ? (
                <>
                  <Field id="required_features" label="Required features">
                    <Textarea
                      id="required_features"
                      rows={3}
                      maxLength={2000}
                      value={form.required_features}
                      onChange={(e) => set("required_features", e.target.value)}
                    />
                  </Field>
                  <Field id="expected_deliverables" label="Expected deliverables">
                    <Textarea
                      id="expected_deliverables"
                      rows={3}
                      maxLength={2000}
                      value={form.expected_deliverables}
                      onChange={(e) => set("expected_deliverables", e.target.value)}
                    />
                  </Field>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <Field id="complexity" label="Estimated complexity">
                      <NativeSelect id="complexity" value={form.complexity} onChange={(value) => set("complexity", value)}>
                        <option value="">Not sure</option>
                        <option value="simple">Simple</option>
                        <option value="moderate">Moderate</option>
                        <option value="complex">Complex</option>
                      </NativeSelect>
                    </Field>
                    <Field id="hosting_expectations" label="Hosting / maintenance expectations">
                      <Input
                        id="hosting_expectations"
                        maxLength={500}
                        value={form.hosting_expectations}
                        onChange={(e) => set("hosting_expectations", e.target.value)}
                        placeholder="e.g. I can host it myself"
                      />
                    </Field>
                  </div>
                  <div className="flex items-start gap-2.5">
                    <Checkbox
                      id="is_prototype"
                      checked={form.is_prototype}
                      onCheckedChange={(checked) => set("is_prototype", checked === true)}
                    />
                    <label htmlFor="is_prototype" className="text-sm leading-snug">
                      A prototype or starter version is fine (not production-ready)
                    </label>
                  </div>
                </>
              ) : null}
            </FormCard>
          ) : null}
        </div>

        <aside className="space-y-4 md:sticky md:top-24 md:self-start">
          <FormCard title="Before you post">
            <FreeNotice>
              Help on Goodivo is free. There is no budget field and asking a volunteer to pay — or being asked to pay —
              is not allowed. Report anyone who requests money.
            </FreeNotice>
            <FreeNotice>
              Volunteers decide what they can take on. Goodivo doesn't promise that any request will be accepted or
              completed, especially larger builds.
            </FreeNotice>
            <FreeNotice>
              Your request goes to review before it appears publicly. Keep personal contact details out of the
              description.
            </FreeNotice>
          </FormCard>
          <div className="flex flex-col gap-2">
            <Button type="submit" size="pill" variant="help" disabled={mutation.isPending}>
              {mutation.isPending ? "Submitting…" : "Submit for review"}
            </Button>
            <Button
              type="button"
              size="pill"
              variant="outline"
              disabled={mutation.isPending}
              onClick={() => mutation.mutate(true)}
            >
              Save as draft
            </Button>
          </div>
        </aside>
      </form>
    </AppShell>
  );
}
