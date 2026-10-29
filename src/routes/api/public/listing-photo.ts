import { createFileRoute } from "@tanstack/react-router";
import { createClient } from "@supabase/supabase-js";

export const Route = createFileRoute("/api/public/listing-photo")({
  server: { handlers: { GET: async ({ request }) => {
    const path = new URL(request.url).searchParams.get("path");
    if (!path || path.length > 300 || !/^[\da-f-]{36}\/[\w.-]+\.(jpg|jpeg|png|webp)$/i.test(path)) return new Response("Not found", { status: 404 });
    const url = process.env["SUPABASE_URL"], key = process.env["SUPABASE_PUBLISHABLE_KEY"];
    if (!url || !key) return new Response("Unavailable", { status: 503 });
    const client = createClient(url, key, {
      auth: { persistSession: false, autoRefreshToken: false },
      global: { fetch: (input, init) => {
        const headers = new Headers(init?.headers);
        if (key.startsWith("sb_") && headers.get("Authorization") === `Bearer ${key}`) headers.delete("Authorization");
        headers.set("apikey", key);
        return fetch(input, { ...init, headers });
      } },
    });
    // Anonymous storage access rechecks the listing's visibility on every read.
    const photo = await client.storage.from("listing-photos").download(path);
    if (photo.error || !photo.data) return new Response("Not found", { status: 404, headers: { "Cache-Control": "no-store" } });
    return new Response(photo.data, { headers: { "Content-Type": photo.data.type, "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff" } });
  } } },
});