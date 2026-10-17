export type TaskKind = "profile" | "request_details" | "eligibility" | "onboarding" | "feedback";
export type TaskDefinition = {
  id: string; title: string; purpose: string; kind: TaskKind; actions: string;
  eligibility: string; privacy: string; reward: string; is_active: boolean; version: number;
};
export type TaskSubmission = {
  id: string; task_id: string; user_id: string; entity_key: string;
  status: "pending_review" | "completed" | "rejected"; evidence: Record<string, string>;
  created_at: string; review_note: string | null;
};
export type Appeal = { id: string; user_id: string; reason: string; status: string; response: string | null; created_at: string };
export type PlatformSnapshot = { definitions: TaskDefinition[]; submissions: TaskSubmission[]; appeals: Appeal[] };