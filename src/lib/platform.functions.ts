import { createServerFn } from "@tanstack/react-start";
import type { SupabaseClient } from "@supabase/supabase-js";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { appealSchema, definitionSchema, submitTaskSchema, validateTaskEvidence } from "@/lib/platform-rules";
import type { PlatformSnapshot } from "@/lib/platform-types";

function check(error: { message: string; code?: string } | null) {
  if (!error) return;
  if (["42P01", "PGRST202", "PGRST205"].includes(error.code ?? "")) throw new Error("Community tasks are awaiting a Lovable Cloud update. Please try again later.");
  throw new Error(error.message);
}

export const getCommunityTasks = createServerFn({ method: "GET" }).middleware([requireSupabaseAuth]).handler(async ({ context }): Promise<PlatformSnapshot> => {
  const db = context.supabase as SupabaseClient;
  const results = await Promise.all([
    db.from("community_tasks").select("*").order("created_at").limit(100),
    db.from("task_submissions").select("*").eq("user_id", context.userId).order("created_at", { ascending: false }).limit(100),
    db.from("restriction_appeals").select("*").eq("user_id", context.userId).order("created_at", { ascending: false }).limit(20),
  ]);
  results.forEach((result) => check(result.error));
  return { definitions: results[0]?.data ?? [], submissions: results[1]?.data ?? [], appeals: results[2]?.data ?? [] };
});

export const submitCommunityTask = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => submitTaskSchema.parse(data)).handler(async ({ data, context }) => {
    const db = context.supabase as SupabaseClient;
    const definition = await db.from("community_tasks").select("kind").eq("id", data.taskId).eq("is_active", true).single();
    check(definition.error);
    validateTaskEvidence(definition.data?.kind ?? "", data.evidence);
    const result = await db.rpc("submit_community_task", { p_task_id: data.taskId, p_evidence: data.evidence });
    check(result.error);
    return result.data as { status: string };
  });

export const submitRestrictionAppeal = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => appealSchema.parse(data)).handler(async ({ data, context }) => {
    const result = await (context.supabase as SupabaseClient).rpc("submit_restriction_appeal", { p_reason: data.reason });
    check(result.error); return { saved: true };
  });

export const getPlatformAdmin = createServerFn({ method: "GET" }).middleware([requireSupabaseAuth]).handler(async ({ context }) => {
  const role = await context.supabase.rpc("has_role", { _user_id: context.userId, _role: "admin" });
  check(role.error); if (!role.data) throw new Error("Administrator access required.");
  const db = context.supabase as SupabaseClient;
  const results = await Promise.all([
    db.from("community_tasks").select("*").order("created_at").limit(100),
    db.from("task_submissions").select("*").order("created_at", { ascending: false }).limit(100),
    db.from("restriction_appeals").select("*").order("created_at", { ascending: false }).limit(100),
    db.from("reward_events").select("id, user_id, provider, provider_event_id, status, created_at").order("created_at", { ascending: false }).limit(100),
    db.rpc("platform_operational_metrics"),
    db.from("ai_usage_limits").select("tool, daily_limit, global_daily_limit, daily_budget_usd, estimated_cost_per_run_usd, is_enabled"),
  ]);
  results.forEach((result) => check(result.error));
  return { definitions: (results[0]?.data ?? []) as PlatformSnapshot["definitions"], submissions: (results[1]?.data ?? []) as PlatformSnapshot["submissions"], appeals: (results[2]?.data ?? []) as PlatformSnapshot["appeals"], rewards: results[3]?.data ?? [], metrics: results[4]?.data as Record<string, number> | null, limits: results[5]?.data ?? [] };
});

export const saveCommunityTask = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => definitionSchema.parse(data)).handler(async ({ data, context }) => {
    const result = await (context.supabase as SupabaseClient).rpc("save_community_task", { p_definition: data });
    check(result.error); return { saved: true };
  });

export const reviewPlatformSubmission = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => z.object({ id: z.string().uuid(), type: z.enum(["task", "appeal"]), approved: z.boolean(), note: z.string().trim().min(10).max(1000) }).parse(data))
  .handler(async ({ data, context }) => {
    const result = await (context.supabase as SupabaseClient).rpc("review_platform_submission", { p_id: data.id, p_type: data.type, p_approved: data.approved, p_note: data.note });
    check(result.error); return { saved: true };
  });

export const saveAiBudget = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => z.object({ tool: z.enum(["logo_maker", "resume_builder", "website_starter"]), globalLimit: z.number().int().min(0).max(100000), budget: z.number().min(0).max(10000), estimate: z.number().min(0.000001).max(100) }).parse(data))
  .handler(async ({ data, context }) => {
    const result = await (context.supabase as SupabaseClient).rpc("save_ai_budget", { p_tool: data.tool, p_global_limit: data.globalLimit, p_budget: data.budget, p_estimate: data.estimate });
    check(result.error); return { saved: true };
  });