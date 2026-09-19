import { supabase } from "@/integrations/supabase/client";

export async function notify(input: {
  userId: string;
  type: string;
  title: string;
  body?: string | null;
  link?: string | null;
}) {
  // Best effort: a failed notification must never block the action itself.
  await supabase.from("notifications").insert({
    user_id: input.userId,
    type: input.type,
    title: input.title,
    body: input.body ?? null,
    link: input.link ?? null,
  });
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

  const { data: mine } = await supabase
    .from("conversation_participants")
    .select("conversation_id")
    .eq("user_id", meId);
  const myIds = (mine ?? []).map((row) => row.conversation_id);

  if (myIds.length) {
    const { data: shared } = await supabase
      .from("conversation_participants")
      .select("conversation_id")
      .eq("user_id", otherUserId)
      .in("conversation_id", myIds);
    const candidates = (shared ?? []).map((row) => row.conversation_id);
    if (candidates.length) {
      let query = supabase.from("conversations").select("id, request_id, listing_id").in("id", candidates);
      query = requestId ? query.eq("request_id", requestId) : query.is("request_id", null);
      query = listingId ? query.eq("listing_id", listingId) : query.is("listing_id", null);
      const { data: match } = await query.maybeSingle();
      if (match) return match.id;
    }
  }

  const { data: created, error } = await supabase
    .from("conversations")
    .insert({ created_by: meId, request_id: requestId, listing_id: listingId })
    .select("id")
    .single();
  if (error) throw error;

  const { error: partError } = await supabase.from("conversation_participants").insert([
    { conversation_id: created.id, user_id: meId },
    { conversation_id: created.id, user_id: otherUserId },
  ]);
  if (partError) throw partError;

  return created.id;
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

  await supabase
    .from("conversations")
    .update({ last_message_at: new Date().toISOString() })
    .eq("id", conversationId);

  const { data: others } = await supabase
    .from("conversation_participants")
    .select("user_id")
    .eq("conversation_id", conversationId)
    .neq("user_id", senderId);
  for (const row of others ?? []) {
    await notify({
      userId: row.user_id,
      type: "message",
      title: "New message",
      body: trimmed.slice(0, 120),
      link: `/messages/${conversationId}`,
    });
  }
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
  targetType: "user" | "request" | "listing" | "message" | "review" | "offer";
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
    const { data } = await supabase.storage.from("listing-photos").createSignedUrl(value, 60 * 60);
    if (data?.signedUrl) out.push(data.signedUrl);
  }
  return out;
}
