import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
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
import { categoriesQuery, PRODUCT_CONDITIONS } from "@/lib/kindora";

const schema = z.object({
  title: z.string().trim().min(6, "Add a clear title (at least 6 characters).").max(120),
  description: z.string().trim().min(20, "Describe the item in at least 20 characters.").max(3000),
  category_id: z.string().uuid("Choose a category."),
  condition: z.string().min(1, "Choose the condition."),
  location: z.string().trim().min(2, "Add a city or area.").max(120),
  quantity: z.number().int().min(1).max(999),
  size_note: z.string().trim().max(200),
  giveaway_rules: z.string().trim().max(1000),
  pickup_available: z.boolean(),
  delivery_available: z.boolean(),
  confirmed_permitted: z.literal(true, { message: "Please confirm the item is permitted." }),
});

const MAX_PHOTOS = 4;
const MAX_BYTES = 5 * 1024 * 1024;
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp"];

export const Route = createFileRoute("/_authenticated/post/listing")({
  head: () => ({
    meta: [
      { title: "Give away a product — Kindora" },
      { name: "description", content: "List a permitted item you no longer need, free for someone who does." },
      { property: "og:title", content: "Give away a product — Kindora" },
      { property: "og:description", content: "List a permitted item you no longer need, free for someone who does." },
    ],
  }),
  component: PostListing,
});

function PostListing() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const categories = useQuery(categoriesQuery);
  const productCategories = (categories.data ?? []).filter((c) => c.group_name === "Free Products");

  const [files, setFiles] = useState<File[]>([]);
  const [form, setForm] = useState({
    title: "",
    description: "",
    category_id: "",
    condition: "good",
    location: "",
    quantity: 1,
    size_note: "",
    giveaway_rules: "",
    pickup_available: true,
    delivery_available: false,
    confirmed_permitted: false,
  });

  function set<K extends keyof typeof form>(key: K, value: (typeof form)[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function handleFiles(list: FileList | null) {
    if (!list) return;
    const picked: File[] = [];
    for (const file of Array.from(list).slice(0, MAX_PHOTOS)) {
      if (!ALLOWED_TYPES.includes(file.type)) {
        toast.error(`${file.name} isn't a JPG, PNG or WebP image.`);
        continue;
      }
      if (file.size > MAX_BYTES) {
        toast.error(`${file.name} is larger than 5 MB.`);
        continue;
      }
      picked.push(file);
    }
    setFiles(picked);
  }

  const mutation = useMutation({
    mutationFn: async () => {
      const parsed = schema.safeParse(form);
      if (!parsed.success) throw new Error(parsed.error.issues[0]?.message ?? "Please check the form.");
      const value = parsed.data;
      if (!value.pickup_available && !value.delivery_available) {
        throw new Error("Choose pickup, delivery, or both.");
      }

      const photos: string[] = [];
      for (const file of files) {
        const path = `${user!.id}/${crypto.randomUUID()}-${file.name.replace(/[^\w.\-]/g, "_")}`;
        const { error: uploadError } = await supabase.storage.from("listing-photos").upload(path, file, {
          contentType: file.type,
          upsert: false,
        });
        if (uploadError) throw uploadError;
        const { data: publicUrl } = supabase.storage.from("listing-photos").getPublicUrl(path);
        photos.push(publicUrl.publicUrl);
      }

      const { data, error } = await supabase
        .from("product_listings")
        .insert({
          owner_id: user!.id,
          title: value.title,
          description: value.description,
          category_id: value.category_id,
          condition: value.condition,
          location: value.location,
          quantity: value.quantity,
          size_note: value.size_note || null,
          giveaway_rules: value.giveaway_rules || null,
          pickup_available: value.pickup_available,
          delivery_available: value.delivery_available,
          photos,
          status: "pending_review",
        })
        .select("id")
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      void queryClient.invalidateQueries({ queryKey: ["product-listings"] });
      toast.success("Submitted for review. You'll be notified when it's published.");
      void navigate({ to: "/products/$id", params: { id: data.id } });
    },
    onError: (error) => toast.error(error instanceof Error ? error.message : "Couldn't save your listing."),
  });

  return (
    <AppShell>
      <PageHeading
        eyebrow="Free product"
        title="Give something away"
        description="Only permitted items. No money, no swaps, no shipping payments."
      />

      <form
        className="grid gap-4 md:grid-cols-[1.4fr_0.6fr]"
        onSubmit={(event) => {
          event.preventDefault();
          mutation.mutate();
        }}
      >
        <div className="space-y-4">
          <FormCard title="The item">
            <Field id="title" label="Title" required>
              <Input
                id="title"
                maxLength={120}
                value={form.title}
                onChange={(e) => set("title", e.target.value)}
                placeholder="e.g. Class 10 NCERT textbooks set"
              />
            </Field>
            <Field id="description" label="Description" required hint="Mention any wear, missing parts or repairs needed.">
              <Textarea
                id="description"
                rows={5}
                maxLength={3000}
                value={form.description}
                onChange={(e) => set("description", e.target.value)}
              />
            </Field>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field id="category_id" label="Category" required>
                <NativeSelect id="category_id" value={form.category_id} onChange={(value) => set("category_id", value)}>
                  <option value="">Select a category…</option>
                  {productCategories.map((category) => (
                    <option key={category.id} value={category.id}>
                      {category.name}
                    </option>
                  ))}
                </NativeSelect>
              </Field>
              <Field id="condition" label="Condition" required>
                <NativeSelect id="condition" value={form.condition} onChange={(value) => set("condition", value)}>
                  {PRODUCT_CONDITIONS.map((condition) => (
                    <option key={condition} value={condition}>
                      {condition}
                    </option>
                  ))}
                </NativeSelect>
              </Field>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field id="quantity" label="Quantity" required>
                <Input
                  id="quantity"
                  type="number"
                  min={1}
                  max={999}
                  value={form.quantity}
                  onChange={(e) => set("quantity", Number(e.target.value))}
                />
              </Field>
              <Field id="size_note" label="Size / measurements" hint="Optional.">
                <Input
                  id="size_note"
                  maxLength={200}
                  value={form.size_note}
                  onChange={(e) => set("size_note", e.target.value)}
                />
              </Field>
            </div>
            <Field id="photos" label="Photos" hint={`Up to ${MAX_PHOTOS} images, JPG/PNG/WebP, max 5 MB each.`}>
              <Input
                id="photos"
                type="file"
                multiple
                accept="image/jpeg,image/png,image/webp"
                onChange={(e) => handleFiles(e.target.files)}
              />
            </Field>
            {files.length ? (
              <div className="flex flex-wrap gap-2">
                {files.map((file) => (
                  <span key={file.name} className="rounded-md bg-secondary px-2 py-1 text-xs text-muted-foreground">
                    {file.name}
                  </span>
                ))}
              </div>
            ) : null}
          </FormCard>

          <FormCard title="Handover">
            <Field id="location" label="Location" required hint="City or area only — never your exact address.">
              <Input id="location" maxLength={120} value={form.location} onChange={(e) => set("location", e.target.value)} />
            </Field>
            <div className="flex flex-col gap-2.5">
              <div className="flex items-start gap-2.5">
                <Checkbox
                  id="pickup_available"
                  checked={form.pickup_available}
                  onCheckedChange={(checked) => set("pickup_available", checked === true)}
                />
                <label htmlFor="pickup_available" className="text-sm">
                  Pickup available
                </label>
              </div>
              <div className="flex items-start gap-2.5">
                <Checkbox
                  id="delivery_available"
                  checked={form.delivery_available}
                  onCheckedChange={(checked) => set("delivery_available", checked === true)}
                />
                <label htmlFor="delivery_available" className="text-sm">
                  I can deliver locally (free)
                </label>
              </div>
            </div>
            <Field id="giveaway_rules" label="Giveaway rules" hint="Optional, e.g. first come first served, collect by Sunday.">
              <Textarea
                id="giveaway_rules"
                rows={3}
                maxLength={1000}
                value={form.giveaway_rules}
                onChange={(e) => set("giveaway_rules", e.target.value)}
              />
            </Field>
          </FormCard>
        </div>

        <aside className="space-y-4 md:sticky md:top-24 md:self-start">
          <FormCard title="Rules for giveaways">
            <FreeNotice>
              Items must be free. No payment, deposits, delivery charges or swaps are allowed.
            </FreeNotice>
            <FreeNotice>
              Prohibited items include weapons, prescription medication, alcohol, tobacco, stolen or counterfeit goods,
              live animals and hazardous materials. See the Prohibited Products and Services Policy.
            </FreeNotice>
            <div className="flex items-start gap-2.5">
              <Checkbox
                id="confirmed_permitted"
                checked={form.confirmed_permitted}
                onCheckedChange={(checked) => set("confirmed_permitted", checked === true)}
              />
              <label htmlFor="confirmed_permitted" className="text-sm leading-snug">
                I confirm this item is legal, safe and permitted, and I'm giving it away free.
              </label>
            </div>
          </FormCard>
          <Button type="submit" size="pill" className="w-full" disabled={mutation.isPending}>
            {mutation.isPending ? "Submitting…" : "Submit for review"}
          </Button>
        </aside>
      </form>
    </AppShell>
  );
}
