import { describe, expect, test } from "bun:test";
import { appealSchema, canGrantAdReward, definitionSchema, requiresAdvertisement, taskGuaranteesFulfilment, validateTaskEvidence } from "./platform-rules";

describe("Community safety", () => {
  test("physical products never require ads", () => { expect(requiresAdvertisement("product")).toBe(false); });
  test("human services never require ads", () => { expect(requiresAdvertisement("human_service")).toBe(false); });
  test("tasks remain separate from rewarded ads", () => { expect(requiresAdvertisement("task")).toBe(false); });
  test("tasks do not guarantee fulfilment", () => { expect(taskGuaranteesFulfilment()).toBe(false); });
  test("unconfigured advertising cannot grant credits", () => { expect(canGrantAdReward()).toBe(false); });
  test("opening onboarding is not completion", () => { expect(() => validateTaskEvidence("onboarding", {})).toThrow(); });
  test("onboarding rejects guaranteed help claim", () => { expect(() => validateTaskEvidence("onboarding", { payment: "never_required", fulfilment: "guaranteed", privacy: "keep_private" })).toThrow(); });
  test("onboarding checks concrete correct answers", () => { expect(() => validateTaskEvidence("onboarding", { payment: "never_required", fulfilment: "volunteer_availability", privacy: "keep_private" })).not.toThrow(); });
  test("eligibility needs evidence and accuracy confirmation", () => { expect(() => validateTaskEvidence("eligibility", { details: "I meet the community eligibility requirements and can explain why.", accuracy: "no" })).toThrow(); });
  test("feedback cannot be an empty click", () => { expect(() => validateTaskEvidence("feedback", { feedback: "" })).toThrow(); });
  test("request checklist identifies a saved request", () => { expect(() => validateTaskEvidence("request_details", { request_id: "another-user" })).toThrow(); });
  test("appeals require a substantive explanation", () => { expect(appealSchema.safeParse({ reason: "unblock" }).success).toBe(false); });
  test("sponsor surveys cannot be enabled as a task", () => { expect(definitionSchema.safeParse({ title: "Sponsor survey", purpose: "Complete a sponsor survey", kind: "sponsor_survey", actions: "Complete all survey questions", eligibility: "All signed-in members", privacy: "Sent to an external sponsor", is_active: true }).success).toBe(false); });
});