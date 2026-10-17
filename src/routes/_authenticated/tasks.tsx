import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { queryOptions, useMutation, useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { CheckCircle2, ClipboardList, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { AppShell, EmptyState, PageHeading } from "@/components/site/AppShell";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Field, NativeSelect } from "@/components/goodivo/FormBits";
import { getCommunityTasks, submitCommunityTask, submitRestrictionAppeal } from "@/lib/platform.functions";
import type { TaskDefinition, TaskSubmission } from "@/lib/platform-types";

const tasksQuery = queryOptions({ queryKey: ["community-tasks"], queryFn: () => getCommunityTasks() });
export const Route = createFileRoute("/_authenticated/tasks")({
  head: () => ({ meta: [{ title: "Community tasks — Goodivo" }, { name: "description", content: "Transparent community checklists, voluntary feedback and eligibility review on Goodivo." }, { property: "og:title", content: "Community tasks — Goodivo" }, { property: "og:description", content: "Community participation without forced ads or guaranteed fulfilment." }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" }] }),
  loader: async ({ context }) => {
    try { await context.queryClient.ensureQueryData(tasksQuery); return { setupError: null }; }
    catch (error) { return { setupError: error instanceof Error ? error.message : "Tasks are temporarily unavailable." }; }
  },
  component: TasksPage,
});

function TasksPage() {
  const { setupError } = Route.useLoaderData();
  return <AppShell><PageHeading eyebrow="Community" title="Your community tasks" />
    <p className="mb-6 flex items-start gap-3 rounded-lg bg-primary/10 p-4 text-sm"><ShieldCheck className="size-5 shrink-0 text-primary" />Tasks are optional. They do not guarantee a product or volunteer help, and never require watching ads.</p>
    {setupError ? <EmptyState title="Tasks temporarily unavailable" body={setupError} /> : <TaskList />}
  </AppShell>;
}
function TaskList() {
  const { data } = useSuspenseQuery(tasksQuery);
  return <div className="space-y-8">
    {!data.definitions.length ? <EmptyState title="No tasks available yet" body="Community checklists will appear here when enabled." /> : <div className="grid gap-4 lg:grid-cols-2">{data.definitions.filter((task) => task.is_active).map((task) => <TaskItem key={task.id} task={task} submission={data.submissions.find((item) => item.task_id === task.id)} />)}</div>}
    <AppealForm appeals={data.appeals} />
  </div>;
}
function TaskItem({ task, submission }: { task: TaskDefinition; submission: TaskSubmission | undefined }) {
  const [evidence, setEvidence] = useState<Record<string, string>>({});
  const queryClient = useQueryClient();
  const submit = useServerFn(submitCommunityTask);
  const mutation = useMutation({ mutationFn: () => submit({ data: { taskId: task.id, evidence } }), onSuccess: (result) => { toast.success(result.status === "completed" ? "Checklist verified." : "Submitted for review; eligibility is not guaranteed."); void queryClient.invalidateQueries({ queryKey: ["community-tasks"] }); }, onError: (error) => toast.error(error.message) });
  const set = (key: string, value: string) => setEvidence((prev) => ({ ...prev, [key]: value }));
  return <article className="surface-card rounded-lg p-5 sm:p-6">
    <div className="flex flex-wrap items-center justify-between gap-2"><ClipboardList className="size-5 text-primary" /><Badge variant="secondary">{submission?.status.replaceAll("_", " ") ?? "Not started"}</Badge></div>
    <h2 className="mt-4 font-display text-lg font-bold">{task.title}</h2>
    <p className="mt-2 text-sm text-muted-foreground">{task.purpose}</p>
    <dl className="my-4 space-y-3 text-sm">{[["Required actions", task.actions], ["Eligibility", task.eligibility], ["Privacy", task.privacy], ["Reward", task.reward]].map(([label, value]) => <div key={label}><dt className="font-semibold">{label}</dt><dd className="mt-1 text-muted-foreground">{value}</dd></div>)}</dl>
    {submission ? <div className="flex gap-2 border-t border-border pt-4 text-sm"><CheckCircle2 className="size-4 shrink-0 text-success" /><span>{submission.review_note ?? (submission.status === "completed" ? "Verified from your saved information." : "A moderator will review your submission.")}</span></div> : <form className="space-y-4" onSubmit={(event) => { event.preventDefault(); mutation.mutate(); }}>
      {task.kind === "profile" ? <Button asChild variant="outline" size="sm"><Link to="/profile">Update profile</Link></Button> : null}
      {task.kind === "request_details" ? <Field id={`request-${task.id}`} label="Your request ID"><Input id={`request-${task.id}`} value={evidence["request_id"] ?? ""} onChange={(e) => set("request_id", e.target.value)} required /></Field> : null}
      {task.kind === "feedback" || task.kind === "eligibility" ? <Field id={`details-${task.id}`} label={task.kind === "feedback" ? "Your optional feedback" : "Eligibility details"}><Textarea id={`details-${task.id}`} maxLength={2000} rows={3} value={evidence[task.kind === "feedback" ? "feedback" : "details"] ?? ""} onChange={(e) => set(task.kind === "feedback" ? "feedback" : "details", e.target.value)} required /></Field> : null}
      {task.kind === "eligibility" ? <Field id={`accuracy-${task.id}`} label="Are these details accurate?"><NativeSelect id={`accuracy-${task.id}`} value={evidence["accuracy"] ?? ""} onChange={(value) => set("accuracy", value)}><option value="">Choose…</option><option value="yes">Yes, to the best of my knowledge</option><option value="no">I need to check</option></NativeSelect></Field> : null}
      {task.kind === "onboarding" ? <>{[
        { key: "payment", label: "Is payment required to receive help?", choices: [["never_required", "No, help is free"], ["required", "Yes"]] },
        { key: "fulfilment", label: "What does volunteer help depend on?", choices: [["guaranteed", "Task completion guarantees it"], ["volunteer_availability", "Volunteer availability"]] },
        { key: "privacy", label: "Where should private contact details go?", choices: [["public", "In public descriptions"], ["keep_private", "Keep them private"]] },
      ].map((question) => <Field key={question.key} id={`${question.key}-${task.id}`} label={question.label}><NativeSelect id={`${question.key}-${task.id}`} value={evidence[question.key] ?? ""} onChange={(value) => set(question.key, value)}><option value="">Choose…</option>{question.choices.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</NativeSelect></Field>)}</> : null}
      <Button disabled={mutation.isPending} type="submit" variant="outline">{mutation.isPending ? "Checking…" : task.kind === "profile" || task.kind === "request_details" ? "Verify saved information" : "Submit for verification"}</Button>
    </form>}
  </article>;
}
function AppealForm({ appeals }: { appeals: { id: string; status: string; response: string | null }[] }) {
  const [reason, setReason] = useState("");
  const submit = useServerFn(submitRestrictionAppeal);
  const queryClient = useQueryClient();
  const mutation = useMutation({ mutationFn: () => submit({ data: { reason } }), onSuccess: () => { setReason(""); toast.success("Appeal submitted for review."); void queryClient.invalidateQueries({ queryKey: ["community-tasks"] }); }, onError: (error) => toast.error(error.message) });
  return <section className="border-t border-border pt-6"><h2 className="font-display text-lg font-bold">Restriction appeals</h2><p className="mt-2 text-sm text-muted-foreground">If your account is restricted, explain why the decision should be reviewed. Do not include sensitive documents.</p><form className="mt-4 max-w-xl space-y-3" onSubmit={(e) => { e.preventDefault(); mutation.mutate(); }}><Textarea aria-label="Appeal explanation" minLength={40} maxLength={2000} required value={reason} onChange={(e) => setReason(e.target.value)} /><Button variant="outline" disabled={mutation.isPending}>Submit appeal</Button></form><ul className="mt-4 space-y-2 text-sm">{appeals.map((appeal) => <li key={appeal.id}>{appeal.status}{appeal.response ? ` · ${appeal.response}` : ""}</li>)}</ul></section>;
}