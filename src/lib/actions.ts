import { supabase } from "@/integrations/supabase/client";

export async function notify(input: {
  userId: string;
  type: string;
  title: string;
  body?: string | null;
  link?: string | null;
}) {
  // Ordinary notifications are emitted by trusted database events. Staff notices remain best effort.
  const result = await supabase.from("notifications").insert({
    user_id: input.userId,
    type: input.type,
    title: input.title,
    body: input.body ?? null,
    link: input.link ?? null,
  });
  if (result.error) console.warn('Notification was not delivered.');
}

export async function logAudit(input: {
  action: string;
  entityType?: string | null;
  entityId?: string | null;
  metadata?: Record<string, unknown>;
}) {
  const { data } = await supabase.auth.getUser();
  await supabase.from("audit_logs").insert({
    actor_id: data.user?.id ?? null,
    action: input.action,
    entity_type: input.entityType ?? null,
    entity_id: input.entityId ?? null,
    metadata: (input.metadata ?? {}) as never,
  });
}

/** Find or create a 1:1 conversation between the current user and someone else. */
export async function ensureConversation(options: {
  meId: string;
  otherUserId: string;
  requestId?: string | null;
  listingId?: string | null;
}) {
  const { meId, otherUserId, requestId = null, listingId = null } = options;

  const identity = await supabase.auth.getUser();
  if (identity.error || identity.data.user?.id !== meId) throw new Error('Sign in required.');
  const result = await supabase.rpc('ensure_goodivo_conversation', { p_other_user: otherUserId, ...(requestId ? { p_request_id: requestId } : {}), ...(listingId ? { p_listing_id: listingId } : {}) });
  if (result.error || !result.data) throw new Error('Conversation could not be opened. Please retry.');
  return result.data;
}

export async function sendMessage(conversationId: string, senderId: string, body: string) {
  const trimmed = body.trim();
  if (!trimmed) throw new Error("Message is empty");
  if (trimmed.length > 2000) throw new Error("Message is too long (2000 characters max)");

  // Light rate limit: no more than 20 messages a minute from one person.
  const since = new Date(Date.now() - 60 * 1000).toISOString();
  const { count } = await supabase
    .from("messages")
    .select("id", { count: "exact", head: true })
    .eq("sender_id", senderId)
    .gte("created_at", since);
  if ((count ?? 0) >= 20) throw new Error("You're sending messages too quickly. Please wait a moment.");

  const { error } = await supabase
    .from("messages")
    .insert({ conversation_id: conversationId, sender_id: senderId, body: trimmed });
  if (error) throw error;

  // Timestamp and recipient notifications commit atomically with the message in Cloud.
}

export async function blockUser(blockerId: string, blockedId: string) {
  const { error } = await supabase.from("blocked_users").insert({ blocker_id: blockerId, blocked_id: blockedId });
  if (error && error.code !== "23505") throw error;
}

export async function unblockUser(blockerId: string, blockedId: string) {
  const { error } = await supabase
    .from("blocked_users")
    .delete()
    .eq("blocker_id", blockerId)
    .eq("blocked_id", blockedId);
  if (error) throw error;
}

export async function submitReport(input: {
  reporterId: string;
  targetType: "user" | "request" | "listing" | "message" | "review" | "offer" | "ai_generation";
  targetId: string;
  reason: string;
  details?: string;
}) {
  const { error } = await supabase.from("reports").insert({
    reporter_id: input.reporterId,
    target_type: input.targetType,
    target_id: input.targetId,
    reason: input.reason as never,
    details: input.details?.slice(0, 2000) ?? null,
  });
  if (error) throw error;
}

/** Listing photos are kept in a private bucket; resolve display URLs on demand. */
export async function resolvePhotoUrls(paths: string[]) {
  const out: string[] = [];
  for (const value of paths) {
    if (/^https?:\/\//.test(value)) {
      out.push(value);
      continue;
    }
    const publicUrl = `/api/public/listing-photo?path=${encodeURIComponent(value)}`;
    const visible = await fetch(publicUrl, { cache: "no-store" });
    if (visible.ok) {
      out.push(publicUrl);
      continue;
    }
    // Pending listings remain visible to their owner without issuing bearer links.
    const privatePhoto = await supabase.storage.from("listing-photos").download(value);
    if (privatePhoto.data) out.push(URL.createObjectURL(privatePhoto.data));
  }
  return out;
}
