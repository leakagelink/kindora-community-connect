import { useEffect, useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { AppShell, EmptyState, PageHeading } from "@/components/site/AppShell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Field, FormCard, FreeNotice } from "@/components/goodivo/FormBits";
import { supabase } from "@/integrations/supabase/client";
import { unblockUser } from "@/lib/actions";
import { useAuth } from "@/lib/auth";
import { profileQuery, statusLabel, timeAgo } from "@/lib/goodivo";
import { useServerFn } from "@tanstack/react-start";
import { withdrawAccount } from "@/lib/account.functions";

export const Route = createFileRoute("/_authenticated/profile")({
  head: () => ({ meta: [{ title: "Your profile & activity — Goodivo" }, { name: "description", content: "Manage your Goodivo profile, privacy and community activity." }, { property: "og:title", content: "Your profile & activity — Goodivo" }, { property: "og:description", content: "Your personal Goodivo profile and privacy settings." }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" }] }),
  component: ProfilePage,
});

function toList(value: string) {
  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean)
    .slice(0, 20);
}

function ProfilePage() {
  const { user, signOut, isStaff } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const withdraw = useServerFn(withdrawAccount);
  const [withdrawing, setWithdrawing] = useState(false);
  const profileResult = useQuery({ ...profileQuery(user?.id ?? ""), enabled: Boolean(user) });
  const { data: profile } = profileResult;

  const activityResult = useQuery({
    queryKey: ["my-activity", user?.id],
    enabled: Boolean(user),
    queryFn: async () => {
      if (!user) throw new Error('Sign in required.');
      const [requests, listings, offers, applications, blocks] = await Promise.all([
        supabase
          .from("help_requests")
          .select("id, title, status, created_at, offers_count")
          .eq("owner_id", user.id)
          .is("deleted_at", null)
          .order("created_at", { ascending: false }),
        supabase
          .from("product_listings")
          .select("id, title, status, created_at")
          .eq("owner_id", user.id)
          .is("deleted_at", null)
          .order("created_at", { ascending: false }),
        supabase
          .from("service_offers")
          .select("id, headline, is_active, created_at")
          .eq("user_id", user.id)
          .is("deleted_at", null)
          .order("created_at", { ascending: false }),
        supabase
          .from("request_applications")
          .select("id, status, created_at, request:help_requests!request_applications_request_id_fkey(id, title)")
          .eq("helper_id", user.id)
          .order("created_at", { ascending: false }),
        supabase.from("blocked_users").select("blocked_id, created_at").eq("blocker_id", user.id),
      ]);
      for (const result of [requests, listings, offers, applications, blocks]) if (result.error) throw new Error('Your activity could not be loaded. Please retry.');
      const blockedIds = (blocks.data ?? []).map((row) => row.blocked_id);
      const { data: blockedPeople, error: peopleError } = blockedIds.length
        ? await supabase.from("profiles").select("id, display_name").in("id", blockedIds)
        : { data: [], error: null };
      if (peopleError) throw new Error('Blocked people could not be loaded. Please retry.');
      return {
        requests: requests.data ?? [],
        listings: listings.data ?? [],
        offers: offers.data ?? [],
        applications: (applications.data ?? []) as unknown as {
          id: string;
          status: string;
          created_at: string;
          request: { id: string; title: string } | null;
        }[],
        blocked: blockedPeople ?? [],
      };
    },
  });
  const mine = activityResult.data;

  const [form, setForm] = useState({
    display_name: "",
    bio: "",
    skills: "",
    interests: "",
    languages: "",
    city: "",
    country: "",
    portfolio_links: "",
    is_available: true,
    show_location: true,
    is_public: true,
  });

  useEffect(() => {
    if (!profile) return;
    setForm({
      display_name: profile.display_name ?? "",
      bio: profile.bio ?? "",
      skills: (profile.skills ?? []).join(", "),
      interests: (profile.interests ?? []).join(", "),
      languages: (profile.languages ?? []).join(", "),
      city: profile.city ?? "",
      country: profile.country ?? "",
      portfolio_links: (profile.portfolio_links ?? []).join(", "),
      is_available: profile.is_available ?? true,
      show_location: profile.show_location ?? true,
      is_public: profile.is_public ?? true,
    });
  }, [profile]);

  const save = async () => {
    if (!user) return;
    if (form.display_name.trim().length < 2) {
      toast.error("Please enter a display name.");
      return;
    }
    const links = toList(form.portfolio_links);
    if (links.some((link) => !/^https?:\/\//.test(link))) {
      toast.error("Portfolio links must start with http:// or https://");
      return;
    }
    const { error } = await supabase
      .from("profiles")
      .update({
        display_name: form.display_name.trim(),
        bio: form.bio.trim() || null,
        skills: toList(form.skills),
        interests: toList(form.interests),
        languages: toList(form.languages),
        city: form.city.trim() || null,
        country: form.country.trim() || null,
        portfolio_links: links,
        is_available: form.is_available,
        show_location: form.show_location,
        is_public: form.is_public,
      })
      .eq("id", user.id);
    if (error) {
      toast.error(error.message);
      return;
    }
    void queryClient.invalidateQueries({ queryKey: ["profile", user.id] });
    toast.success("Profile saved");
  };

  const deleteAccount = async () => {
    if (!user || withdrawing) return;
    const confirmed = window.confirm(
      "Withdraw your profile and posts from public view? This is not complete account deletion: your sign-in account and private records remain until the full deletion process is finalized.",
    );
    if (!confirmed) return;
    setWithdrawing(true);
    try { await withdraw(); toast.success('Your profile and posts were withdrawn. Full account deletion is not yet complete.'); await signOut(); void navigate({ to: '/' }); }
    catch (error) { toast.error(error instanceof Error ? error.message : 'Withdrawal failed. Please retry.'); }
    finally { setWithdrawing(false); }
  };

  return (
    <AppShell>
      <PageHeading
        eyebrow="Your account"
        title={profile?.display_name ?? "Your profile"}
        description="Manage your profile, posts, privacy and account."
        action={
          <div className="flex flex-wrap gap-2">
            {user ? (
              <Button asChild variant="outline" className="rounded-full">
                <Link to="/u/$id" params={{ id: user.id }}>
                  View public profile
                </Link>
              </Button>
            ) : null}
            {isStaff ? (
              <Button asChild variant="ink" className="rounded-full">
                <Link to="/admin">Moderation</Link>
              </Button>
            ) : null}
          </div>
        }
      />

      {profileResult.isError || activityResult.isError ? <div role="alert" className="mb-5 border border-destructive/30 p-4"><p>Account information could not be loaded.</p><Button variant="outline" onClick={() => { void profileResult.refetch(); void activityResult.refetch(); }}>Retry</Button></div> : null}
      <Tabs defaultValue="posts">
        <TabsList className="mb-5 flex-wrap">
          <TabsTrigger value="posts">My posts</TabsTrigger>
          <TabsTrigger value="offers">My help</TabsTrigger>
          <TabsTrigger value="profile">Edit profile</TabsTrigger>
          <TabsTrigger value="settings">Privacy & account</TabsTrigger>
        </TabsList>

        <TabsContent value="posts" className="space-y-4">
          <ListSection
            title="Help requests"
            empty="You haven't asked for help yet."
            rows={(mine?.requests ?? []).map((row) => ({
              id: row.id,
              title: row.title,
              meta: `${statusLabel(row.status)} · ${row.offers_count} offers · ${timeAgo(row.created_at)}`,
              to: "request" as const,
            }))}
          />
          <ListSection
            title="Free products"
            empty="You haven't listed any items."
            rows={(mine?.listings ?? []).map((row) => ({
              id: row.id,
              title: row.title,
              meta: `${statusLabel(row.status)} · ${timeAgo(row.created_at)}`,
              to: "listing" as const,
            }))}
          />
        </TabsContent>

        <TabsContent value="offers" className="space-y-4">
          <section className="surface-card rounded-3xl p-6">
            <h2 className="font-display text-base font-bold">Offers I sent</h2>
            {(mine?.applications ?? []).length === 0 ? (
              <p className="mt-2 text-sm text-muted-foreground">You haven't offered help yet.</p>
            ) : (
              <ul className="mt-3 space-y-2">
                {(mine?.applications ?? []).map((row) => (
                  <li key={row.id} className="flex items-center justify-between gap-3 rounded-2xl border border-border px-4 py-3">
                    <Link
                      to="/requests/$id"
                      params={{ id: row.request?.id ?? "" }}
                      className="truncate text-sm font-semibold"
                    >
                      {row.request?.title ?? "Request"}
                    </Link>
                    <Badge variant="secondary">{statusLabel(row.status)}</Badge>
                  </li>
                ))}
              </ul>
            )}
          </section>
          <section className="surface-card rounded-3xl p-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 className="font-display text-base font-bold">My volunteer listings</h2>
              <Button asChild size="sm" variant="offer" className="rounded-full">
                <Link to="/post/offer">Add a skill offer</Link>
              </Button>
            </div>
            {(mine?.offers ?? []).length === 0 ? (
              <p className="mt-2 text-sm text-muted-foreground">No skill offers yet.</p>
            ) : (
              <ul className="mt-3 space-y-2">
                {(mine?.offers ?? []).map((row) => (
                  <li key={row.id} className="flex items-center justify-between gap-3 rounded-2xl border border-border px-4 py-3">
                    <span className="truncate text-sm font-semibold">{row.headline}</span>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="rounded-full"
                      onClick={async () => {
                        const result = await supabase.from("service_offers").update({ is_active: !row.is_active }).eq("id", row.id);
                        if (result.error) { toast.error('Skill offer could not be updated.'); return; }
                        void queryClient.invalidateQueries({ queryKey: ["my-activity", user?.id] });
                        void queryClient.invalidateQueries({ queryKey: ["service-offers"] });
                      }}
                    >
                      {row.is_active ? "Pause" : "Activate"}
                    </Button>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </TabsContent>

        <TabsContent value="profile">
          <FormCard title="Profile details" description="Only share what you're comfortable showing publicly.">
            <Field id="display_name" label="Display name" required>
              <Input
                id="display_name"
                value={form.display_name}
                onChange={(event) => setForm({ ...form, display_name: event.target.value })}
              />
            </Field>
            <Field id="bio" label="Short bio">
              <Textarea
                id="bio"
                rows={4}
                maxLength={1000}
                value={form.bio}
                onChange={(event) => setForm({ ...form, bio: event.target.value })}
              />
            </Field>
            <Field id="skills" label="Skills" hint="Comma separated.">
              <Input id="skills" value={form.skills} onChange={(event) => setForm({ ...form, skills: event.target.value })} />
            </Field>
            <Field id="interests" label="Interests" hint="Comma separated.">
              <Input
                id="interests"
                value={form.interests}
                onChange={(event) => setForm({ ...form, interests: event.target.value })}
              />
            </Field>
            <Field id="languages" label="Languages" hint="Comma separated.">
              <Input
                id="languages"
                value={form.languages}
                onChange={(event) => setForm({ ...form, languages: event.target.value })}
              />
            </Field>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field id="city" label="City">
                <Input id="city" value={form.city} onChange={(event) => setForm({ ...form, city: event.target.value })} />
              </Field>
              <Field id="country" label="Country">
                <Input
                  id="country"
                  value={form.country}
                  onChange={(event) => setForm({ ...form, country: event.target.value })}
                />
              </Field>
            </div>
            <Field id="portfolio_links" label="Portfolio links" hint="Comma separated, starting with https://">
              <Input
                id="portfolio_links"
                value={form.portfolio_links}
                onChange={(event) => setForm({ ...form, portfolio_links: event.target.value })}
              />
            </Field>
            <Button className="rounded-full" onClick={() => void save()}>
              Save profile
            </Button>
          </FormCard>
        </TabsContent>

        <TabsContent value="settings" className="space-y-4">
          <FormCard title="Privacy" description="Your email, phone and exact address are never shown publicly.">
            <ToggleRow
              label="Public profile"
              description="Allow anyone to view your profile page."
              checked={form.is_public}
              onChange={(value) => setForm({ ...form, is_public: value })}
            />
            <ToggleRow
              label="Show my city"
              description="Show city and country on your profile. Never your street address."
              checked={form.show_location}
              onChange={(value) => setForm({ ...form, show_location: value })}
            />
            <ToggleRow
              label="Available to help"
              description="Show that you can currently take on requests."
              checked={form.is_available}
              onChange={(value) => setForm({ ...form, is_available: value })}
            />
            <Button className="rounded-full" onClick={() => void save()}>
              Save privacy settings
            </Button>
          </FormCard>

          <section className="surface-card rounded-3xl p-6">
            <h2 className="font-display text-base font-bold">Blocked people</h2>
            {(mine?.blocked ?? []).length === 0 ? (
              <p className="mt-2 text-sm text-muted-foreground">You haven't blocked anyone.</p>
            ) : (
              <ul className="mt-3 space-y-2">
                {(mine?.blocked ?? []).map((person) => (
                  <li key={person.id} className="flex items-center justify-between gap-3 rounded-2xl border border-border px-4 py-3">
                    <span className="text-sm font-semibold">{person.display_name}</span>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="rounded-full"
                      onClick={async () => {
                        if (!user) return;
                        try { await unblockUser(user.id, person.id); } catch { toast.error('Could not unblock this person.'); return; }
                        void queryClient.invalidateQueries({ queryKey: ["my-activity", user?.id] });
                        toast.success("Unblocked");
                      }}
                    >
                      Unblock
                    </Button>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className="surface-card rounded-3xl p-6">
            <h2 className="font-display text-base font-bold">Account withdrawal & deletion</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Withdraw your public profile and posts. Full sign-in account deletion and private-data cleanup are not yet available; this is not complete account erasure.
            </p>
            <FreeNotice>
              Some records are retained for safety, moderation and audit purposes as described in our{" "}
              <Link to="/legal/$slug" params={{ slug: "account-deletion" }} className="font-semibold text-primary">
                Account Deletion policy
              </Link>
              .
            </FreeNotice>
            <Button variant="destructive" disabled={withdrawing} className="mt-4 rounded-full" onClick={() => void deleteAccount()}>
              {withdrawing ? 'Withdrawing…' : 'Withdraw profile & posts'}
            </Button>
          </section>

          <Button variant="outline" className="rounded-full" onClick={() => void signOut()}>
            Sign out
          </Button>
        </TabsContent>
      </Tabs>
    </AppShell>
  );
}

function ToggleRow({
  label,
  description,
  checked,
  onChange,
}: {
  label: string;
  description: string;
  checked: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <div className="flex items-start justify-between gap-4 rounded-2xl border border-border px-4 py-3">
      <div>
        <p className="text-sm font-semibold">{label}</p>
        <p className="text-xs text-muted-foreground">{description}</p>
      </div>
      <Switch checked={checked} onCheckedChange={onChange} aria-label={label} />
    </div>
  );
}

function ListSection({
  title,
  empty,
  rows,
}: {
  title: string;
  empty: string;
  rows: { id: string; title: string; meta: string; to: "request" | "listing" }[];
}) {
  return (
    <section className="surface-card rounded-3xl p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="font-display text-base font-bold">{title}</h2>
        <Button asChild size="sm" variant="outline" className="rounded-full">
          <Link to="/post">New post</Link>
        </Button>
      </div>
      {rows.length === 0 ? (
        <EmptyState title={empty} body="Anything you post will show up here with its current status." />
      ) : (
        <ul className="mt-3 space-y-2">
          {rows.map((row) => (
            <li key={row.id} className="rounded-2xl border border-border px-4 py-3">
              {row.to === "request" ? (
                <Link to="/requests/$id" params={{ id: row.id }} className="text-sm font-semibold">
                  {row.title}
                </Link>
              ) : (
                <Link to="/products/$id" params={{ id: row.id }} className="text-sm font-semibold">
                  {row.title}
                </Link>
              )}
              <p className="text-xs text-muted-foreground">{row.meta}</p>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
