import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const uploadListingPhoto = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: FormData) => {
    if (!(input instanceof FormData)) throw new Error("Invalid image upload.");
    const file = input.get("photo");
    if (!(file instanceof File) || file.size > 5 * 1024 * 1024) throw new Error("Choose an image under 5 MB.");
    return input;
  })
  .handler(async ({ data, context }) => {
    const profile = await context.supabase.from("profiles").select("is_restricted, deleted_at, suspended_until").eq("id", context.userId).single();
    if (profile.error || !profile.data || profile.data.is_restricted || profile.data.deleted_at || (profile.data.suspended_until && new Date(profile.data.suspended_until).getTime() > Date.now())) throw new Error("Your account cannot upload photos.");
    const file = data.get("photo");
    if (!(file instanceof File)) throw new Error("Choose an image.");
    const { normalizeListingImage } = await import("@/lib/listing-image.server");
    let normalized: ReturnType<typeof normalizeListingImage>;
    try { normalized = normalizeListingImage(new Uint8Array(await file.arrayBuffer())); }
    catch (error) { throw new Error(error instanceof Error ? error.message : "Invalid image."); }
    if (normalized.bytes.length > 5 * 1024 * 1024) throw new Error("The processed image is too large.");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const path = `${context.userId}/${crypto.randomUUID()}.${normalized.extension}`;
    const result = await supabaseAdmin.storage.from("listing-photos").upload(path, normalized.bytes, { contentType: normalized.type, upsert: false });
    if (result.error) throw new Error("The photo could not be saved. Please retry.");
    return { path };
  });