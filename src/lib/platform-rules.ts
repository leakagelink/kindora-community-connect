import { z } from "zod";

export const taskEvidenceSchema = z.record(z.string().max(100), z.string().trim().max(2000));
export const submitTaskSchema = z.object({ taskId: z.string().uuid(), evidence: taskEvidenceSchema });
export const appealSchema = z.object({ reason: z.string().trim().min(40).max(2000) });
export const definitionSchema = z.object({
  id: z.string().uuid().optional(), title: z.string().trim().min(5).max(120),
  purpose: z.string().trim().min(20).max(1000), kind: z.enum(["profile", "request_details", "eligibility", "onboarding", "feedback"]),
  actions: z.string().trim().min(20).max(1000), eligibility: z.string().trim().min(10).max(1000),
  privacy: z.string().trim().min(10).max(1000), is_active: z.boolean(),
});
export function validateTaskEvidence(kind: string, evidence: Record<string, string>) {
  if (kind === "request_details") z.string().uuid().parse(evidence["request_id"]);
  if (kind === "eligibility") {
    z.string().trim().min(40).max(2000).parse(evidence["details"]);
    if (evidence["accuracy"] !== "yes") throw new Error("Confirm that the details are accurate.");
  }
  if (kind === "feedback") z.string().trim().min(20).max(2000).parse(evidence["feedback"]);
  if (kind === "onboarding" && (evidence["payment"] !== "never_required" || evidence["fulfilment"] !== "volunteer_availability" || evidence["privacy"] !== "keep_private")) {
    throw new Error("Please review the community rules and answer each question correctly.");
  }
}
export function requiresAdvertisement(target: "product" | "human_service" | "task") { return false; }
export function taskGuaranteesFulfilment() { return false; }
export const advertisingSetup = { enabled: false, providerConfigured: false, verificationConfigured: false, policyApproved: false } as const;
export function canGrantAdReward() {
  return advertisingSetup.enabled && advertisingSetup.providerConfigured && advertisingSetup.verificationConfigured && advertisingSetup.policyApproved;
}