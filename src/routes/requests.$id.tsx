import { useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { AppShell, EmptyState, PageHeading } from "@/components/site/AppShell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Field, FormCard, FreeNotice } from "@/components/kindora/FormBits";
import { ReportDialog } from "@/components/kindora/ReportDialog";
import { ReviewDialog } from "@/components/kindora/ReviewDialog";
import { supabase } from "@/integrations/supabase/client";
import { ensureConversation, notify } from "@/lib/actions";
import { useAuth } from "@/lib/auth";
import { requestQuery, requestTypeLabel, statusLabel, timeAgo } from "@/lib/kindora";

export const Route = createFileRoute("/requests/$id")({
  head: () => ({
    meta: [
      { title: "Help request — Kindora" },
      { name: "description", content: "A free help request on Kindora. Volunteers can offer to help at no cost." },
      { property: "og:title", content: "Help request — Kindora" },
      { property: "og:description", content: "A free help request on Kindora." },
    ],
  }),
  component: RequestDetail,
});

type ApplicationRow = {
  id: string;
  helper_id: string;
  message: string;
  relevant_skills: string[];
  proposed_deliverables: string | null;
  estimated_days: number | null;
  questions: string | null;
  status: string;
  created_at: string;
  helper: { id: string; display_name: string; avatar_url: string | null } | null;
};

function applicationsQueryKey(id: string) {
  return ["request-applications", id];
}

function RequestDetail() {
  const { id } = Route.useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { data, isLoading } = useQuery(requestQuery(id));

  const { data: applications } = useQuery({
    queryKey: applicationsQueryKey(id),
    enabled: Boolean(user),
    queryFn: async () => {
      const { data: rows, error } = await supabase
        .from("request_applications")
        .select(
          "id, helper_id, message, relevant_skills, proposed_deliverables, estimated_days, questions, status, created_at, helper:profiles!request_applications_helper_id_fkey(id, display_name, avatar_url)",
        )
        .eq("request_id", id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (rows ?? []) as unknown as ApplicationRow[];
    },
  });

  if (isLoading) {
    return (
      <AppShell>
        <div className="surface-card h-64 animate-pulse rounded-3xl" />
      </AppShell>
    );
  }

  if (!data) {
    return (
      <AppShell>
        <EmptyState
          title="Request unavailable"
          body="This request may have been removed, or it isn't published yet."
          action={
            <Button asChild className="rounded-full">
              <Link to="/explore" search={{ tab: "requests" }}>
                Browse requests
              </Link>
            </Button>
          }
        />
      </AppShell>
    );
  }

  const isOwner = user?.id === data.owner_id;
  const myApplication = applications?.find((row) => row.helper_id === user?.id) ?? null;
  const acceptedApplication = applications?.find((row) => row.status === "accepted") ?? null;
  const canApply =
    !isOwner && ["published", "receiving_offers"].includes(data.status) && !myApplication;

  const openConversation = async (otherUserId: string) => {
    if (!user) {
      void navigate({ to: "/auth", search: { mode: "signin", redirect: `/requests/${id}` } });
      return;
    }
    const conversationId = await ensureConversation({ meId: user.id, otherUserId, requestId: id });
    void navigate({ to: "/messages/$id", params: { id: conversationId } });
  };

  const setStatus = async (status: string, message: string) => {
    const { error } = await supabase
      .from("help_requests")
      .update({ status: status as never })
      .eq("id", id);
    if (error) {
      toast.error(error.message);
      return;
    }
    if (acceptedApplication) {
      await notify({
        userId: acceptedApplication.helper_id,
        type: "request_status",
        title: `Request ${statusLabel(status).toLowerCase()}`,
        body: data.title,
        link: `/requests/${id}`,
      });
    }
    void queryClient.invalidateQueries({ queryKey: ["help-request", id] });
    void queryClient.invalidateQueries({ queryKey: ["help-requests"] });
    toast.success(message);
  };

  return (
    <AppShell>
      <PageHeading
        eyebrow={`${requestTypeLabel(data.request_type)} · ${statusLabel(data.status)}`}
        title={data.title}
        description={`Posted ${timeAgo(data.created_at)}${data.is_remote ? " · Remote" : data.location ? ` · ${data.location}` : ""}`}
        action={
          <div className="flex flex-wrap items-center gap-2">
            {!isOwner ? (
              <Button variant="outline" className="rounded-full" onClick={() => void openConversation(data.owner_id)}>
                Message
              </Button>
            ) : null}
            <ReportDialog targetType="request" targetId={id} />
          </div>
        }
      />
      <div className="grid gap-4 md:grid-cols-[1.4fr_0.6fr]">
        <div className="space-y-4">
          <article className="surface-card rounded-3xl p-6">
            <p className="whitespace-pre-wrap text-sm leading-relaxed text-muted-foreground">{data.description}</p>
            {data.required_features || data.expected_deliverables || data.hosting_expectations ? (
              <div className="mt-6 space-y-4 border-t border-border pt-5">
                {data.required_features ? (
                  <div>
                    <h2 className="font-display text-sm font-bold">Required features</h2>
                    <p className="mt-1 whitespace-pre-wrap text-sm text-muted-foreground">{data.required_features}</p>
                  </div>
                ) : null}
                {data.expected_deliverables ? (
                  <div>
                    <h2 className="font-display text-sm font-bold">Expected deliverables</h2>
                    <p className="mt-1 whitespace-pre-wrap text-sm text-muted-foreground">
                      {data.expected_deliverables}
                    </p>
                  </div>
                ) : null}
                {data.hosting_expectations ? (
                  <div>
                    <h2 className="font-display text-sm font-bold">Hosting and maintenance</h2>
                    <p className="mt-1 whitespace-pre-wrap text-sm text-muted-foreground">
                      {data.hosting_expectations}
                    </p>
                  </div>
                ) : null}
              </div>
            ) : null}
          </article>

          {isOwner ? (
            <OwnerPanel
              requestId={id}
              requestTitle={data.title}
              status={data.status}
              applications={applications ?? []}
              onMessage={openConversation}
              onStatus={setStatus}
            />
          ) : null}

          {canApply && user ? <ApplyForm requestId={id} ownerId={data.owner_id} requestTitle={data.title} /> : null}

          {!user && !isOwner ? (
            <div className="surface-card rounded-3xl p-6">
              <h2 className="font-display text-base font-bold">Want to help with this?</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Sign in to offer your help. Helping on Kindora is always free.
              </p>
              <Button asChild className="mt-4 rounded-full" variant="help">
                <Link to="/auth" search={{ mode: "signin", redirect: `/requests/${id}` }}>
                  Sign in to offer help
                </Link>
              </Button>
            </div>
          ) : null}

          {myApplication ? (
            <div className="surface-card rounded-3xl p-6">
              <div className="flex items-center justify-between gap-3">
                <h2 className="font-display text-base font-bold">Your offer</h2>
                <Badge variant="secondary">{statusLabel(myApplication.status)}</Badge>
              </div>
              <p className="mt-2 whitespace-pre-wrap text-sm text-muted-foreground">{myApplication.message}</p>
              {myApplication.status === "pending" ? (
                <Button
                  variant="ghost"
                  size="sm"
                  className="mt-3 rounded-full text-muted-foreground"
                  onClick={async () => {
                    await supabase.from("request_applications").delete().eq("id", myApplication.id);
                    void queryClient.invalidateQueries({ queryKey: applicationsQueryKey(id) });
                    toast.success("Offer withdrawn");
                  }}
                >
                  Withdraw offer
                </Button>
              ) : null}
              {data.status === "completed" ? (
                <div className="mt-4">
                  <ReviewDialog revieweeId={data.owner_id} requestId={id} label="Review the requester" />
                </div>
              ) : null}
            </div>
          ) : null}
        </div>

        <aside className="surface-card h-fit rounded-3xl p-6">
          <h2 className="font-display text-sm font-bold">Details</h2>
          <dl className="mt-3 space-y-2 text-sm text-muted-foreground">
            <div className="flex justify-between gap-3">
              <dt>Needed by</dt>
              <dd className="font-medium text-foreground">{data.needed_by ?? "—"}</dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt>Category</dt>
              <dd className="font-medium text-foreground">{data.category?.name ?? "—"}</dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt>Language</dt>
              <dd className="font-medium text-foreground">{data.language ?? "Any"}</dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt>Offers</dt>
              <dd className="font-medium text-foreground">{data.offers_count}</dd>
            </div>
          </dl>
          {data.owner ? (
            <div className="mt-5 border-t border-border pt-4">
              <p className="text-xs font-bold uppercase tracking-[0.14em] text-muted-foreground">Requested by</p>
              <Link to="/u/$id" params={{ id: data.owner_id }} className="mt-2 block text-sm font-semibold">
                {data.owner.display_name}
              </Link>
              {data.owner.show_location && data.owner.city ? (
                <p className="text-xs text-muted-foreground">
                  {data.owner.city}
                  {data.owner.country ? `, ${data.owner.country}` : ""}
                </p>
              ) : null}
            </div>
          ) : null}
          <p className="mt-5 rounded-xl bg-secondary px-4 py-3 text-xs text-muted-foreground">
            Help here is always free. Never send or accept payment for a request.
          </p>
        </aside>
      </div>
    </AppShell>
  );
}

function OwnerPanel({
  requestId,
  requestTitle,
  status,
  applications,
  onMessage,
  onStatus,
}: {
  requestId: string;
  requestTitle: string;
  status: string;
  applications: ApplicationRow[];
  onMessage: (userId: string) => Promise<void>;
  onStatus: (status: string, message: string) => Promise<void>;
}) {
  const queryClient = useQueryClient();

  const decide = async (application: ApplicationRow, decision: "accepted" | "declined") => {
    const { error } = await supabase
      .from("request_applications")
      .update({ status: decision as never })
      .eq("id", application.id);
    if (error) {
      toast.error(error.message);
      return;
    }
    if (decision === "accepted") {
      await supabase.from("help_requests").update({ status: "in_progress" as never }).eq("id", requestId);
    }
    await notify({
      userId: application.helper_id,
      type: "application",
      title: decision === "accepted" ? "Your offer was accepted" : "Your offer was declined",
      body: requestTitle,
      link: `/requests/${requestId}`,
    });
    void queryClient.invalidateQueries({ queryKey: applicationsQueryKey(requestId) });
    void queryClient.invalidateQueries({ queryKey: ["help-request", requestId] });
    toast.success(decision === "accepted" ? "Offer accepted" : "Offer declined");
  };

  const accepted = applications.find((row) => row.status === "accepted") ?? null;

  return (
    <section className="surface-card rounded-3xl p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="font-display text-base font-bold">Manage your request</h2>
        <Badge variant="secondary">{statusLabel(status)}</Badge>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        {status === "draft" ? (
          <Button
            size="sm"
            className="rounded-full"
            onClick={() => void onStatus("pending_review", "Sent for review")}
          >
            Submit for review
          </Button>
        ) : null}
        {status === "in_progress" ? (
          <Button
            size="sm"
            className="rounded-full"
            variant="help"
            onClick={() => void onStatus("completed", "Marked as completed")}
          >
            Mark completed
          </Button>
        ) : null}
        {["published", "receiving_offers", "in_progress"].includes(status) ? (
          <Button
            size="sm"
            variant="outline"
            className="rounded-full"
            onClick={() => void onStatus("cancelled", "Request cancelled")}
          >
            Cancel
          </Button>
        ) : null}
        {status === "completed" ? (
          <Button size="sm" variant="outline" className="rounded-full" onClick={() => void onStatus("closed", "Closed")}>
            Close
          </Button>
        ) : null}
        <Button asChild size="sm" variant="ghost" className="rounded-full">
          <Link to="/profile">All my posts</Link>
        </Button>
      </div>

      {accepted && status === "completed" ? (
        <div className="mt-4">
          <ReviewDialog revieweeId={accepted.helper_id} requestId={requestId} label="Review your helper" />
        </div>
      ) : null}

      <div className="mt-6 border-t border-border pt-5">
        <h3 className="font-display text-sm font-bold">Offers ({applications.length})</h3>
        {applications.length === 0 ? (
          <p className="mt-2 text-sm text-muted-foreground">No offers yet. Volunteers will appear here.</p>
        ) : (
          <ul className="mt-3 space-y-3">
            {applications.map((application) => (
              <li key={application.id} className="rounded-2xl border border-border p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <Link to="/u/$id" params={{ id: application.helper_id }} className="text-sm font-semibold">
                    {application.helper?.display_name ?? "Kindora member"}
                  </Link>
                  <Badge variant="secondary">{statusLabel(application.status)}</Badge>
                </div>
                <p className="mt-2 whitespace-pre-wrap text-sm text-muted-foreground">{application.message}</p>
                {application.relevant_skills.length ? (
                  <p className="mt-2 text-xs text-muted-foreground">Skills: {application.relevant_skills.join(", ")}</p>
                ) : null}
                {application.estimated_days ? (
                  <p className="text-xs text-muted-foreground">Estimate: {application.estimated_days} days</p>
                ) : null}
                <div className="mt-3 flex flex-wrap gap-2">
                  {application.status === "pending" ? (
                    <>
                      <Button size="sm" variant="help" className="rounded-full" onClick={() => void decide(application, "accepted")}>
                        Accept
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="rounded-full"
                        onClick={() => void decide(application, "declined")}
                      >
                        Decline
                      </Button>
                    </>
                  ) : null}
                  <Button
                    size="sm"
                    variant="ghost"
                    className="rounded-full"
                    onClick={() => void onMessage(application.helper_id)}
                  >
                    Message
                  </Button>
                  <ReportDialog targetType="user" targetId={application.helper_id} />
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}

function ApplyForm({
  requestId,
  ownerId,
  requestTitle,
}: {
  requestId: string;
  ownerId: string;
  requestTitle: string;
}) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [message, setMessage] = useState("");
  const [skills, setSkills] = useState("");
  const [deliverables, setDeliverables] = useState("");
  const [days, setDays] = useState("");
  const [questions, setQuestions] = useState("");
  const [confirmed, setConfirmed] = useState(false);

  const mutation = useMutation({
    mutationFn: async () => {
      if (message.trim().length < 30) throw new Error("Please write at least 30 characters about how you can help.");
      if (!confirmed) throw new Error("Please confirm that you will not ask for payment.");
      const { error } = await supabase.from("request_applications").insert({
        request_id: requestId,
        helper_id: user!.id,
        message: message.trim(),
        relevant_skills: skills
          .split(",")
          .map((item) => item.trim())
          .filter(Boolean)
          .slice(0, 20),
        proposed_deliverables: deliverables.trim() || null,
        estimated_days: days ? Number(days) : null,
        questions: questions.trim() || null,
        no_payment_confirmed: true,
      });
      if (error) throw new Error(error.code === "23505" ? "You already offered help here." : error.message);

      await supabase.from("help_requests").update({ status: "receiving_offers" as never }).eq("id", requestId);
      await notify({
        userId: ownerId,
        type: "application",
        title: "New offer of help",
        body: requestTitle,
        link: `/requests/${requestId}`,
      });
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: applicationsQueryKey(requestId) });
      void queryClient.invalidateQueries({ queryKey: ["help-request", requestId] });
      toast.success("Your offer was sent");
    },
    onError: (error) => toast.error(error instanceof Error ? error.message : "Could not send your offer"),
  });

  return (
    <FormCard title="Offer your help" description="Tell the requester how you can help and what you can deliver.">
      <Field id="apply-message" label="Introduction" required hint="At least 30 characters.">
        <Textarea
          id="apply-message"
          rows={5}
          value={message}
          onChange={(event) => setMessage(event.target.value)}
          maxLength={2000}
        />
      </Field>
      <Field id="apply-skills" label="Relevant skills" hint="Comma separated.">
        <Input id="apply-skills" value={skills} onChange={(event) => setSkills(event.target.value)} />
      </Field>
      <Field id="apply-deliverables" label="Proposed deliverables">
        <Textarea
          id="apply-deliverables"
          rows={3}
          value={deliverables}
          onChange={(event) => setDeliverables(event.target.value)}
          maxLength={1500}
        />
      </Field>
      <Field id="apply-days" label="Estimated completion time (days)">
        <Input
          id="apply-days"
          type="number"
          min={1}
          max={365}
          value={days}
          onChange={(event) => setDays(event.target.value)}
        />
      </Field>
      <Field id="apply-questions" label="Questions or limitations">
        <Textarea
          id="apply-questions"
          rows={3}
          value={questions}
          onChange={(event) => setQuestions(event.target.value)}
          maxLength={1500}
        />
      </Field>
      <label className="flex items-start gap-3 text-sm">
        <Checkbox checked={confirmed} onCheckedChange={(value) => setConfirmed(value === true)} />
        <span className="text-muted-foreground">
          I confirm this help is free and I will not ask for any payment, deposit or fee.
        </span>
      </label>
      <FreeNotice>
        Volunteers decide what they can take on. Accepting a request depends on capacity, scope and availability.
      </FreeNotice>
      <Button className="rounded-full" disabled={mutation.isPending} onClick={() => mutation.mutate()}>
        {mutation.isPending ? "Sending…" : "Send offer"}
      </Button>
    </FormCard>
  );
}
