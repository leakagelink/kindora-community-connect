import { createServerFn } from "@tanstack/react-start";
import type { SupabaseClient } from "@supabase/supabase-js";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const manageProduct = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => z.object({ listingId: z.string().uuid(), interestId: z.string().uuid().optional(), status: z.enum(["reserved", "completed", "declined", "published", "given_away", "removed", "expired"]) }).parse(data))
  .handler(async ({ data, context }) => {
    const result = await (context.supabase as SupabaseClient).rpc("manage_product", { p_listing_id: data.listingId, p_interest_id: data.interestId ?? null, p_status: data.status });
    if (result.error) throw new Error(result.error.code === "PGRST202" ? "Product management is awaiting a safety update. Please try again later." : result.error.message);
    return { saved: true };
  });