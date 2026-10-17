import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { AppShell, EmptyState, PageHeading } from "@/components/site/AppShell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Field, NativeSelect } from "@/components/goodivo/FormBits";
import { supabase } from "@/integrations/supabase/client";
import { logAudit, notify } from "@/lib/actions";
import { useAuth } from "@/lib/auth";
import { statusLabel, timeAgo } from "@/lib/goodivo";
import { PlatformAdmin } from "@/components/goodivo/PlatformAdmin";
import { CampaignAdmin } from "@/components/campaign/CampaignAdmin";

export const Route = createFileRoute("/_authenticated/admin")({
  head: () => ({ meta: [{ title: "Goodivo control room" }, { name: "description", content: "Moderation, community tasks and operational controls for Goodivo administrators." }, { property: "og:title", content: "Goodivo control room" }, { property: "og:description", content: "Goodivo platform moderation and operational controls." }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" }] }),
  component: AdminPage,
});

const SINCE_30D = () => new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

function AdminPage() {
  const { user, isStaff, isAdmin } = useAuth();

  if (!user) return null;

  if (!isStaff) {
    return (
      <AppShell>
        <EmptyState
          title="Moderator access only"
          body="This area is restricted to Goodivo moderators and admins."
          action={
            <Button asChild className="rounded-full">
              <Link to="/">Back to home</Link>
            </Button>
          }
        />
      </AppShell>
    );
  }

  return (
    <AppShell>
      <PageHeading
        eyebrow={isAdmin ? "Admin" : "Moderation"}
        title="Goodivo control room"
        description="Review reports, moderate content, and manage the platform. Every action is written to the audit log."
      />
      <Tabs defaultValue="overview">
        <TabsList className="mb-5 flex-wrap">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="reports">Reports</TabsTrigger>
          <TabsTrigger value="queue">Review queue</TabsTrigger>
          {isAdmin ? <TabsTrigger value="people">People & roles</TabsTrigger> : null}
          {isAdmin ? <TabsTrigger value="catalog">Categories</TabsTrigger> : null}
          {isAdmin ? <TabsTrigger value="settings">Flags & AI</TabsTrigger> : null}
          {isAdmin ? <TabsTrigger value="platform">Tasks & operations</TabsTrigger> : null}
          {isAdmin ? <TabsTrigger value="campaign">Socilet applications</TabsTrigger> : null}
        </TabsList>

        <TabsContent value="overview">
          <Overview isAdmin={isAdmin} />
        </TabsContent>
        {isAdmin ? <TabsContent value="platform"><PlatformAdmin /></TabsContent> : null}
        {isAdmin ? <TabsContent value="campaign"><CampaignAdmin /></TabsContent> : null}
        <TabsContent value="reports">
          <Reports moderatorId={user.id} />
        </TabsContent>
        <TabsContent value="queue">
          <ReviewQueue moderatorId={user.id} />
        </TabsContent>
        {isAdmin ? (
          <TabsContent value="people">
            <People />
          </TabsContent>
        ) : null}
        {isAdmin ? (
          <TabsContent value="catalog">
            <Categories />
          </TabsContent>
        ) : null}
        {isAdmin ? (
          <TabsContent value="settings">
            <Settings />
          </TabsContent>
        ) : null}
      </Tabs>
    </AppShell>
  );
}

function Stat({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="surface-card rounded-3xl p-5">
      <p className="text-xs font-bold uppercase tracking-[0.14em] text-muted-foreground">{label}</p>
      <p className="mt-2 font-display text-2xl font-extrabold">{value}</p>
    </div>
  );
}

function Overview({ isAdmin }: { isAdmin: boolean }) {
  const { data } = useQuery({
    queryKey: ["admin-overview"],
    queryFn: async () => {
      const [
        { count: members },
        { count: joined30 },
        { count: publishedRequests },
        { count: completedRequests },
        { count: listings },
        { count: offers },
        { count: pendingReports },
        { count: ai30 },
      ] = await Promise.all([
        supabase.from("profiles").select("id", { count: "exact", head: true }),
        supabase.from("profiles").select("id", { count: "exact", head: true }).gte("created_at", SINCE_30D()),
        supabase
          .from("help_requests")
          .select("id", { count: "exact", head: true })
          .in("status", ["published", "receiving_offers", "in_progress"] as never),
        supabase.from("help_requests").select("id", { count: "exact", head: true }).eq("status", "completed" as never),
        supabase.from("product_listings").select("id", { count: "exact", head: true }),
        supabase.from("service_offers").select("id", { count: "exact", head: true }),
        supabase.from("reports").select("id", { count: "exact", head: true }).in("status", ["open", "under_review"] as never),
        supabase.from("ai_generations").select("id", { count: "exact", head: true }).gte("created_at", SINCE_30D()),
      ]);

      let donationTotal = 0;
      if (isAdmin) {
        const { data: donations } = await supabase.from("donations").select("amount_minor, status");
        donationTotal = (donations ?? [])
          .filter((row) => row.status === "succeeded")
          .reduce((sum, row) => sum + row.amount_minor, 0);
      }

      return {
        members: members ?? 0,
        newMembers: joined30 ?? 0,
        activeRequests: publishedRequests ?? 0,
        completedRequests: completedRequests ?? 0,
        listings: listings ?? 0,
        offers: offers ?? 0,
        openReports: pendingReports ?? 0,
        aiRuns30: ai30 ?? 0,
        donationTotal,
      };
    },
  });

  const { data: demand } = useQuery({
    queryKey: ["admin-demand"],
    queryFn: async () => {
      const { data: rows } = await supabase
        .from("help_requests")
        .select("category_id, category:categories(name)")
        .is("deleted_at", null)
        .limit(1000);
      const counts = new Map<string, number>();
      for (const row of rows ?? []) {
        const name = (row as { category?: { name?: string } | null }).category?.name ?? "Uncategorised";
        counts.set(name, (counts.get(name) ?? 0) + 1);
      }
      return [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 8);
    },
  });

  return (
    <div className="space-y-5">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Members" value={data?.members ?? "—"} />
        <Stat label="New (30 days)" value={data?.newMembers ?? "—"} />
        <Stat label="Active requests" value={data?.activeRequests ?? "—"} />
        <Stat label="Completed engagements" value={data?.completedRequests ?? "—"} />
        <Stat label="Product listings" value={data?.listings ?? "—"} />
        <Stat label="Volunteer offers" value={data?.offers ?? "—"} />
        <Stat label="Reports pending" value={data?.openReports ?? "—"} />
        <Stat label="AI runs (30 days)" value={data?.aiRuns30 ?? "—"} />
      </div>
      {data && data.donationTotal > 0 ? (
        <div className="surface-card rounded-3xl p-5">
          <p className="text-xs font-bold uppercase tracking-[0.14em] text-muted-foreground">
            Recorded donations (all time)
          </p>
          <p className="mt-2 font-display text-2xl font-extrabold">
            {(data.donationTotal / 100).toLocaleString(undefined, { maximumFractionDigits: 2 })}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            Donations are optional and never affect who receives help. Payments stay disabled until the legal and
            payment setup is verified.
          </p>
        </div>
      ) : null}
      <section className="surface-card rounded-3xl p-6">
        <h2 className="font-display text-base font-bold">Category demand</h2>
        {(demand ?? []).length === 0 ? (
          <p className="mt-2 text-sm text-muted-foreground">No requests yet.</p>
        ) : (
          <ul className="mt-3 space-y-2 text-sm">
            {(demand ?? []).map(([name, total]) => (
              <li key={name} className="flex items-center justify-between gap-3">
                <span>{name}</span>
                <span className="font-semibold">{total}</span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

type ReportRow = {
  id: string;
  target_type: string;
  target_id: string;
  reason: string;
  details: string | null;
  status: string;
  created_at: string;
  reporter_id: string;
};

function Reports({ moderatorId }: { moderatorId: string }) {
  const queryClient = useQueryClient();
  const [note, setNote] = useState<Record<string, string>>({});

  const { data } = useQuery({
    queryKey: ["admin-reports"],
    queryFn: async () => {
      const { data: rows, error } = await supabase
        .from("reports")
        .select("id, target_type, target_id, reason, details, status, created_at, reporter_id")
        .order("created_at", { ascending: false })
        .limit(100);
      if (error) throw error;
      return (rows ?? []) as ReportRow[];
    },
  });

  const act = async (report: ReportRow, action: string) => {
    const reason = note[report.id] ?? "";
    const { error } = await supabase.from("moderation_actions").insert({
      moderator_id: moderatorId,
      report_id: report.id,
      target_type: report.target_type,
      target_id: report.target_id,
      action,
      reason: report.reason as never,
      note: reason || null,
    });
    if (error) {
      toast.error(error.message);
      return;
    }

    if (action === "content_removed") {
      if (report.target_type === "request") {
        await supabase
          .from("help_requests")
          .update({ status: "rejected" as never, deleted_at: new Date().toISOString(), moderation_note: reason || null })
          .eq("id", report.target_id);
      }
      if (report.target_type === "listing") {
        await supabase
          .from("product_listings")
          .update({ status: "removed" as never, deleted_at: new Date().toISOString(), moderation_note: reason || null })
          .eq("id", report.target_id);
      }
      if (report.target_type === "review") {
        await supabase.from("reviews").update({ is_hidden: true }).eq("id", report.target_id);
      }
      if (report.target_type === "message") {
        await supabase.from("messages").update({ deleted_at: new Date().toISOString() }).eq("id", report.target_id);
      }
    }

    if (action === "warning" && report.target_type === "user") {
      await notify({
        userId: report.target_id,
        type: "moderation",
        title: "Warning from the Goodivo moderators",
        body: reason || "Your recent activity may break our Community Guidelines.",
        link: "/legal/community-guidelines",
      });
    }

    if (action === "suspended" && report.target_type === "user") {
      const until = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
      await supabase.from("profiles").update({ suspended_until: until }).eq("id", report.target_id);
      await notify({
        userId: report.target_id,
        type: "moderation",
        title: "Your account is suspended for 7 days",
        body: reason || "A moderator reviewed a report about your activity.",
        link: "/legal/community-guidelines",
      });
    }

    if (action === "restricted" && report.target_type === "user") {
      await supabase.from("profiles").update({ is_restricted: true, is_public: false }).eq("id", report.target_id);
      await notify({
        userId: report.target_id,
        type: "moderation",
        title: "Your account has been restricted",
        body: reason || "A moderator reviewed a report about your activity.",
        link: "/legal/community-guidelines",
      });
    }

    const nextStatus = action === "dismissed" ? "dismissed" : "resolved";
    await supabase
      .from("reports")
      .update({ status: nextStatus as never, reviewed_by: moderatorId, reviewed_at: new Date().toISOString() })
      .eq("id", report.id);
    await logAudit({ action: `moderation:${action}`, entityType: report.target_type, entityId: report.target_id });

    void queryClient.invalidateQueries({ queryKey: ["admin-reports"] });
    void queryClient.invalidateQueries({ queryKey: ["admin-overview"] });
    toast.success("Action recorded");
  };

  return (
    <div className="space-y-3">
      {(data ?? []).length === 0 ? (
        <EmptyState title="No reports" body="Nothing has been reported yet." />
      ) : (
        (data ?? []).map((report) => (
          <section key={report.id} className="surface-card rounded-3xl p-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="font-display text-sm font-bold">
                  {statusLabel(report.reason)} · {report.target_type}
                </p>
                <p className="text-xs text-muted-foreground">Reported {timeAgo(report.created_at)}</p>
              </div>
              <Badge variant="secondary">{statusLabel(report.status)}</Badge>
            </div>
            {report.details ? (
              <p className="mt-3 whitespace-pre-wrap text-sm text-muted-foreground">{report.details}</p>
            ) : null}
            <div className="mt-3 flex flex-wrap gap-2 text-xs">
              {report.target_type === "request" ? (
                <Link to="/requests/$id" params={{ id: report.target_id }} className="font-semibold text-primary">
                  Open request
                </Link>
              ) : null}
              {report.target_type === "listing" ? (
                <Link to="/products/$id" params={{ id: report.target_id }} className="font-semibold text-primary">
                  Open listing
                </Link>
              ) : null}
              {report.target_type === "user" ? (
                <Link to="/u/$id" params={{ id: report.target_id }} className="font-semibold text-primary">
                  Open profile
                </Link>
              ) : null}
            </div>
            {report.status === "open" || report.status === "under_review" ? (
              <div className="mt-4 space-y-3">
                <Field id={`note-${report.id}`} label="Moderator note">
                  <Textarea
                    id={`note-${report.id}`}
                    rows={2}
                    value={note[report.id] ?? ""}
                    onChange={(event) => setNote({ ...note, [report.id]: event.target.value })}
                  />
                </Field>
                <div className="flex flex-wrap gap-2">
                  <Button size="sm" className="rounded-full" onClick={() => void act(report, "content_removed")}>
                    Remove content
                  </Button>
                  <Button size="sm" variant="outline" className="rounded-full" onClick={() => void act(report, "warning")}>
                    Warn user
                  </Button>
                  <Button size="sm" variant="outline" className="rounded-full" onClick={() => void act(report, "suspended")}>
                    Suspend 7 days
                  </Button>
                  <Button size="sm" variant="destructive" className="rounded-full" onClick={() => void act(report, "restricted")}>
                    Restrict account
                  </Button>
                  <Button size="sm" variant="ghost" className="rounded-full" onClick={() => void act(report, "dismissed")}>
                    Dismiss
                  </Button>
                </div>
              </div>
            ) : null}
          </section>
        ))
      )}
    </div>
  );
}

function ReviewQueue({ moderatorId }: { moderatorId: string }) {
  const queryClient = useQueryClient();

  const { data } = useQuery({
    queryKey: ["admin-queue"],
    queryFn: async () => {
      const [requests, listings] = await Promise.all([
        supabase
          .from("help_requests")
          .select("id, title, description, created_at, owner_id")
          .eq("status", "pending_review" as never)
          .is("deleted_at", null)
          .order("created_at"),
        supabase
          .from("product_listings")
          .select("id, title, description, created_at, owner_id")
          .eq("status", "pending_review" as never)
          .is("deleted_at", null)
          .order("created_at"),
      ]);
      return { requests: requests.data ?? [], listings: listings.data ?? [] };
    },
  });

  const decide = async (
    kind: "request" | "listing",
    row: { id: string; title: string; owner_id: string },
    approve: boolean,
  ) => {
    const table = kind === "request" ? "help_requests" : "product_listings";
    const status = approve ? (kind === "request" ? "published" : "published") : kind === "request" ? "rejected" : "removed";
    const { error } = await supabase.from(table).update({ status: status as never }).eq("id", row.id);
    if (error) {
      toast.error(error.message);
      return;
    }
    await supabase.from("moderation_actions").insert({
      moderator_id: moderatorId,
      target_type: kind,
      target_id: row.id,
      action: approve ? "approved" : "rejected",
    });
    await notify({
      userId: row.owner_id,
      type: "moderation",
      title: approve ? "Your post is now live" : "Your post was not approved",
      body: row.title,
      link: kind === "request" ? `/requests/${row.id}` : `/products/${row.id}`,
    });
    await logAudit({ action: `review:${approve ? "approved" : "rejected"}`, entityType: kind, entityId: row.id });
    void queryClient.invalidateQueries({ queryKey: ["admin-queue"] });
    void queryClient.invalidateQueries({ queryKey: ["help-requests"] });
    void queryClient.invalidateQueries({ queryKey: ["product-listings"] });
    toast.success(approve ? "Published" : "Rejected");
  };

  const rows = [
    ...(data?.requests ?? []).map((row) => ({ ...row, kind: "request" as const })),
    ...(data?.listings ?? []).map((row) => ({ ...row, kind: "listing" as const })),
  ];

  if (rows.length === 0) {
    return <EmptyState title="Queue is clear" body="Nothing is waiting for review right now." />;
  }

  return (
    <div className="space-y-3">
      {rows.map((row) => (
        <section key={`${row.kind}-${row.id}`} className="surface-card rounded-3xl p-6">
          <p className="text-xs font-bold uppercase tracking-[0.14em] text-muted-foreground">{row.kind}</p>
          <h3 className="mt-1 font-display text-base font-bold">{row.title}</h3>
          <p className="mt-2 line-clamp-4 whitespace-pre-wrap text-sm text-muted-foreground">{row.description}</p>
          <div className="mt-4 flex flex-wrap gap-2">
            <Button size="sm" variant="help" className="rounded-full" onClick={() => void decide(row.kind, row, true)}>
              Approve & publish
            </Button>
            <Button size="sm" variant="outline" className="rounded-full" onClick={() => void decide(row.kind, row, false)}>
              Reject
            </Button>
            <Button asChild size="sm" variant="ghost" className="rounded-full">
              <Link to="/u/$id" params={{ id: row.owner_id }}>
                View author
              </Link>
            </Button>
          </div>
        </section>
      ))}
    </div>
  );
}

function People() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");

  const { data } = useQuery({
    queryKey: ["admin-people", search],
    queryFn: async () => {
      let query = supabase
        .from("profiles")
        .select("id, display_name, city, country, is_restricted, suspended_until, created_at, deleted_at")
        .order("created_at", { ascending: false })
        .limit(50);
      if (search) query = query.ilike("display_name", `%${search}%`);
      const { data: people, error } = await query;
      if (error) throw error;
      const ids = (people ?? []).map((row) => row.id);
      const { data: roles } = ids.length
        ? await supabase.from("user_roles").select("user_id, role").in("user_id", ids)
        : { data: [] };
      return (people ?? []).map((person) => ({
        ...person,
        roles: (roles ?? []).filter((row) => row.user_id === person.id).map((row) => row.role as string),
      }));
    },
  });

  const setRole = async (userId: string, role: "moderator" | "admin", grant: boolean) => {
    if (grant) {
      const { error } = await supabase.from("user_roles").insert({ user_id: userId, role: role as never });
      if (error && error.code !== "23505") {
        toast.error(error.message);
        return;
      }
    } else {
      const { error } = await supabase.from("user_roles").delete().eq("user_id", userId).eq("role", role as never);
      if (error) {
        toast.error(error.message);
        return;
      }
    }
    await logAudit({ action: `role:${grant ? "granted" : "revoked"}:${role}`, entityType: "user", entityId: userId });
    void queryClient.invalidateQueries({ queryKey: ["admin-people", search] });
    toast.success("Roles updated");
  };

  return (
    <div className="space-y-4">
      <Field id="people-search" label="Search members">
        <Input id="people-search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Display name" />
      </Field>
      <ul className="space-y-3">
        {(data ?? []).map((person) => (
          <li key={person.id} className="surface-card rounded-3xl p-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <Link to="/u/$id" params={{ id: person.id }} className="font-display text-sm font-bold">
                  {person.display_name}
                </Link>
                <p className="text-xs text-muted-foreground">
                  Joined {timeAgo(person.created_at)}
                  {person.roles.length ? ` · ${person.roles.join(", ")}` : ""}
                  {person.is_restricted ? " · restricted" : ""}
                  {person.deleted_at ? " · deleted" : ""}
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  className="rounded-full"
                  onClick={() => void setRole(person.id, "moderator", !person.roles.includes("moderator"))}
                >
                  {person.roles.includes("moderator") ? "Remove moderator" : "Make moderator"}
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="rounded-full"
                  onClick={() => void setRole(person.id, "admin", !person.roles.includes("admin"))}
                >
                  {person.roles.includes("admin") ? "Remove admin" : "Make admin"}
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  className="rounded-full"
                  onClick={async () => {
                    await supabase
                      .from("profiles")
                      .update({ is_restricted: !person.is_restricted })
                      .eq("id", person.id);
                    await logAudit({
                      action: person.is_restricted ? "user:unrestricted" : "user:restricted",
                      entityType: "user",
                      entityId: person.id,
                    });
                    void queryClient.invalidateQueries({ queryKey: ["admin-people", search] });
                  }}
                >
                  {person.is_restricted ? "Lift restriction" : "Restrict"}
                </Button>
              </div>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

function Categories() {
  const queryClient = useQueryClient();
  const [form, setForm] = useState({ name: "", group_name: "Digital Services", sort_order: "100" });

  const { data } = useQuery({
    queryKey: ["admin-categories"],
    queryFn: async () => {
      const { data: rows, error } = await supabase
        .from("categories")
        .select("id, name, slug, group_name, sort_order, is_active")
        .order("group_name")
        .order("sort_order");
      if (error) throw error;
      return rows ?? [];
    },
  });

  const refresh = () => {
    void queryClient.invalidateQueries({ queryKey: ["admin-categories"] });
    void queryClient.invalidateQueries({ queryKey: ["categories"] });
  };

  return (
    <div className="space-y-4">
      <section className="surface-card rounded-3xl p-6">
        <h2 className="font-display text-base font-bold">Add a category</h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-3">
          <Field id="cat-name" label="Name" required>
            <Input id="cat-name" value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} />
          </Field>
          <Field id="cat-group" label="Group" required>
            <NativeSelect id="cat-group" value={form.group_name} onChange={(value) => setForm({ ...form, group_name: value })}>
              {["Digital Services", "Skills and Knowledge", "Free Products"].map((group) => (
                <option key={group} value={group}>
                  {group}
                </option>
              ))}
            </NativeSelect>
          </Field>
          <Field id="cat-order" label="Sort order">
            <Input
              id="cat-order"
              type="number"
              value={form.sort_order}
              onChange={(event) => setForm({ ...form, sort_order: event.target.value })}
            />
          </Field>
        </div>
        <Button
          className="mt-4 rounded-full"
          onClick={async () => {
            if (form.name.trim().length < 2) {
              toast.error("Enter a category name.");
              return;
            }
            const slug = form.name
              .trim()
              .toLowerCase()
              .replace(/[^a-z0-9]+/g, "-")
              .replace(/^-|-$/g, "");
            const { error } = await supabase.from("categories").insert({
              name: form.name.trim(),
              slug,
              group_name: form.group_name,
              sort_order: Number(form.sort_order) || 100,
            });
            if (error) {
              toast.error(error.message);
              return;
            }
            await logAudit({ action: "category:created", entityType: "category" });
            setForm({ ...form, name: "" });
            refresh();
            toast.success("Category added");
          }}
        >
          Add category
        </Button>
      </section>

      <ul className="space-y-2">
        {(data ?? []).map((category) => (
          <li key={category.id} className="surface-card flex flex-wrap items-center justify-between gap-3 rounded-3xl px-5 py-4">
            <div>
              <p className="text-sm font-semibold">{category.name}</p>
              <p className="text-xs text-muted-foreground">
                {category.group_name} · order {category.sort_order}
              </p>
            </div>
            <div className="flex items-center gap-3">
              <Input
                type="number"
                className="h-9 w-20"
                defaultValue={category.sort_order}
                aria-label={`Sort order for ${category.name}`}
                onBlur={async (event) => {
                  const value = Number(event.target.value);
                  if (Number.isNaN(value) || value === category.sort_order) return;
                  await supabase.from("categories").update({ sort_order: value }).eq("id", category.id);
                  refresh();
                }}
              />
              <Switch
                checked={category.is_active}
                aria-label={`Enable ${category.name}`}
                onCheckedChange={async (value) => {
                  await supabase.from("categories").update({ is_active: value }).eq("id", category.id);
                  refresh();
                }}
              />
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

function Settings() {
  const queryClient = useQueryClient();

  const { data: flags } = useQuery({
    queryKey: ["admin-flags"],
    queryFn: async () => {
      const { data, error } = await supabase.from("feature_flags").select("key, description, is_enabled").order("key");
      if (error) throw error;
      return data ?? [];
    },
  });

  const { data: limits } = useQuery({
    queryKey: ["admin-ai-limits"],
    queryFn: async () => {
      const { data, error } = await supabase.from("ai_usage_limits").select("tool, daily_limit, is_enabled").order("tool");
      if (error) throw error;
      return data ?? [];
    },
  });

  const { data: usage } = useQuery({
    queryKey: ["admin-ai-usage"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("ai_generations")
        .select("tool, status, created_at")
        .gte("created_at", SINCE_30D())
        .limit(2000);
      if (error) throw error;
      const grouped = new Map<string, { ok: number; failed: number }>();
      for (const row of data ?? []) {
        const entry = grouped.get(row.tool) ?? { ok: 0, failed: 0 };
        if (row.status === "succeeded") entry.ok += 1;
        else entry.failed += 1;
        grouped.set(row.tool, entry);
      }
      return [...grouped.entries()];
    },
  });

  return (
    <div className="space-y-4">
      <section className="surface-card rounded-3xl p-6">
        <h2 className="font-display text-base font-bold">Feature flags</h2>
        <ul className="mt-4 space-y-2">
          {(flags ?? []).map((flag) => (
            <li key={flag.key} className="flex items-center justify-between gap-4 rounded-2xl border border-border px-4 py-3">
              <div>
                <p className="text-sm font-semibold">{flag.key}</p>
                {flag.description ? <p className="text-xs text-muted-foreground">{flag.description}</p> : null}
              </div>
              <Switch
                checked={flag.is_enabled}
                aria-label={flag.key}
                onCheckedChange={async (value) => {
                  if (flag.key === "donations" && value) {
                    const ok = window.confirm(
                      "Donations must stay off until payment processing and Indian legal/Play billing requirements are verified. Enable anyway?",
                    );
                    if (!ok) return;
                  }
                  await supabase.from("feature_flags").update({ is_enabled: value }).eq("key", flag.key);
                  await logAudit({ action: `flag:${flag.key}:${value ? "on" : "off"}`, entityType: "feature_flag" });
                  void queryClient.invalidateQueries({ queryKey: ["admin-flags"] });
                  void queryClient.invalidateQueries({ queryKey: ["feature-flags"] });
                }}
              />
            </li>
          ))}
        </ul>
      </section>

      <section className="surface-card rounded-3xl p-6">
        <h2 className="font-display text-base font-bold">AI daily limits per person</h2>
        <ul className="mt-4 space-y-2">
          {(limits ?? []).map((limit) => (
            <li key={limit.tool} className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border px-4 py-3">
              <p className="text-sm font-semibold">{limit.tool}</p>
              <div className="flex items-center gap-3">
                <Input
                  type="number"
                  min={0}
                  max={100}
                  className="h-9 w-20"
                  defaultValue={limit.daily_limit}
                  aria-label={`Daily limit for ${limit.tool}`}
                  onBlur={async (event) => {
                    const value = Number(event.target.value);
                    if (Number.isNaN(value) || value === limit.daily_limit) return;
                    await supabase.from("ai_usage_limits").update({ daily_limit: value }).eq("tool", limit.tool);
                    await logAudit({ action: `ai_limit:${limit.tool}:${value}`, entityType: "ai_usage_limits" });
                    void queryClient.invalidateQueries({ queryKey: ["admin-ai-limits"] });
                    void queryClient.invalidateQueries({ queryKey: ["ai-limits"] });
                  }}
                />
                <Switch
                  checked={limit.is_enabled}
                  aria-label={`Enable ${limit.tool}`}
                  onCheckedChange={async (value) => {
                    await supabase.from("ai_usage_limits").update({ is_enabled: value }).eq("tool", limit.tool);
                    void queryClient.invalidateQueries({ queryKey: ["admin-ai-limits"] });
                  }}
                />
              </div>
            </li>
          ))}
        </ul>
        <div className="mt-5 border-t border-border pt-4">
          <h3 className="font-display text-sm font-bold">Usage in the last 30 days</h3>
          <ul className="mt-2 space-y-1 text-sm text-muted-foreground">
            {(usage ?? []).length === 0 ? (
              <li>No AI runs yet.</li>
            ) : (
              (usage ?? []).map(([tool, stats]) => (
                <li key={tool}>
                  {tool}: {stats.ok} successful, {stats.failed} failed
                </li>
              ))
            )}
          </ul>
        </div>
      </section>
    </div>
  );
}
