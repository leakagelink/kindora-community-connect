import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { AppShell, EmptyState, PageHeading } from "@/components/site/AppShell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Field } from "@/components/goodivo/FormBits";
import { PhotoStrip } from "@/components/goodivo/PhotoStrip";
import { ReportDialog } from "@/components/goodivo/ReportDialog";
import { ReviewDialog } from "@/components/goodivo/ReviewDialog";
import { supabase } from "@/integrations/supabase/client";
import { ensureConversation, notify } from "@/lib/actions";
import { useAuth } from "@/lib/auth";
import { listingQuery, statusLabel, timeAgo } from "@/lib/goodivo";
import { manageProduct } from "@/lib/products.functions";

export const Route = createFileRoute("/products/$id")({
  head: () => ({
    meta: [
      { title: "Free product — Goodivo" },
      { name: "description", content: "A permitted item being given away free on Goodivo." },
      { property: "og:title", content: "Free product — Goodivo" },
      { property: "og:description", content: "A permitted item being given away free on Goodivo." },
    ],
  }),
  component: ProductDetail,
});

type InterestRow = {
  id: string;
  user_id: string;
  message: string | null;
  status: string;
  created_at: string;
  person: { id: string; display_name: string } | null;
};

function ProductDetail() {
  const manage = useServerFn(manageProduct);
  const { id } = Route.useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { data, isLoading } = useQuery(listingQuery(id));
  const [message, setMessage] = useState("");

  const { data: interests } = useQuery({
    queryKey: ["product-interests", id],
    enabled: Boolean(user),
    queryFn: async () => {
      const { data: rows, error } = await supabase
        .from("product_interests")
        .select("id, user_id, message, status, created_at, person:profiles!product_interests_user_profile_fkey(id, display_name)")
        .eq("listing_id", id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (rows ?? []) as unknown as InterestRow[];
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
          title="Listing unavailable"
          body="This item may have been given away, removed, or is still under review."
          action={
            <Button asChild className="rounded-full">
              <Link to="/explore" search={{ tab: "products" }}>
                Browse free products
              </Link>
            </Button>
          }
        />
      </AppShell>
    );
  }

  const isOwner = user?.id === data.owner_id;
  const myInterest = interests?.find((row) => row.user_id === user?.id) ?? null;
  const reserved = interests?.find((row) => row.status === "reserved") ?? null;

  const openConversation = async (otherUserId: string) => {
    if (!user) {
      void navigate({ to: "/auth", search: { mode: "signin", redirect: `/products/${id}` } });
      return;
    }
    const conversationId = await ensureConversation({ meId: user.id, otherUserId, listingId: id });
    void navigate({ to: "/messages/$id", params: { id: conversationId } });
  };

  const expressInterest = async () => {
    if (!user) {
      void navigate({ to: "/auth", search: { mode: "signin", redirect: `/products/${id}` } });
      return;
    }
    const { error } = await supabase
      .from("product_interests")
      .insert({ listing_id: id, user_id: user.id, message: message.trim() || null });
    if (error) {
      toast.error(error.code === "23505" ? "You already expressed interest." : error.message);
      return;
    }
    await notify({
      userId: data.owner_id,
      type: "interest",
      title: "Someone is interested in your item",
      body: data.title,
      link: `/products/${id}`,
    });
    setMessage("");
    void queryClient.invalidateQueries({ queryKey: ["product-interests", id] });
    toast.success("Interest sent to the donor");
  };

  const setListingStatus = async (status: string, label: string) => {
    if (!["published", "given_away", "removed", "expired"].includes(status)) return;
    try { await manage({ data: { listingId: id, status: status as "published" | "given_away" | "removed" | "expired" } }); }
    catch (error) {
      toast.error(error instanceof Error ? error.message : "Couldn't update the listing.");
      return;
    }
    void queryClient.invalidateQueries({ queryKey: ["product-listing", id] });
    void queryClient.invalidateQueries({ queryKey: ["product-listings"] });
    toast.success(label);
  };

  const decideInterest = async (interest: InterestRow, status: "reserved" | "declined" | "completed") => {
    try { await manage({ data: { listingId: id, interestId: interest.id, status } }); }
    catch (error) {
      toast.error(error instanceof Error ? error.message : "Couldn't update the interest.");
      return;
    }
    void queryClient.invalidateQueries({ queryKey: ["product-listing", id] });
    void queryClient.invalidateQueries({ queryKey: ["product-listings"] });
    toast.success(status === "reserved" ? "Item reserved" : status === "completed" ? "Handover recorded" : "Interest declined");
    await notify({
      userId: interest.user_id,
      type: "interest_update",
      title:
        status === "reserved"
          ? "An item was reserved for you"
          : status === "completed"
            ? "Item marked as given away"
            : "Your interest was declined",
      body: data.title,
      link: `/products/${id}`,
    });
    void queryClient.invalidateQueries({ queryKey: ["product-interests", id] });
  };

  return (
    <AppShell>
      <PageHeading
        eyebrow={`Free product · ${statusLabel(data.status)}`}
        title={data.title}
        description={`Listed ${timeAgo(data.created_at)}${data.location ? ` · ${data.location}` : ""}`}
        action={
          <div className="flex flex-wrap items-center gap-2">
            {!isOwner ? (
              <Button variant="outline" className="rounded-full" onClick={() => void openConversation(data.owner_id)}>
                Message donor
              </Button>
            ) : null}
            <ReportDialog targetType="listing" targetId={id} />
          </div>
        }
      />
      <div className="grid gap-4 md:grid-cols-[1.4fr_0.6fr]">
        <div className="space-y-4">
          <PhotoStrip photos={(data.photos ?? []) as string[]} title={data.title} />
          <article className="surface-card rounded-3xl p-6">
            <p className="whitespace-pre-wrap text-sm leading-relaxed text-muted-foreground">{data.description}</p>
            {data.giveaway_rules ? (
              <div className="mt-6 border-t border-border pt-5">
                <h2 className="font-display text-sm font-bold">Giveaway rules</h2>
                <p className="mt-1 whitespace-pre-wrap text-sm text-muted-foreground">{data.giveaway_rules}</p>
              </div>
            ) : null}
          </article>

          {isOwner ? (
            <section className="surface-card rounded-3xl p-6">
              <h2 className="font-display text-base font-bold">Manage this listing</h2>
              <div className="mt-4 flex flex-wrap gap-2">
                {data.status === "reserved" ? (
                  <Button size="sm" variant="outline" className="rounded-full" onClick={() => void setListingStatus("published", "Back to available")}>
                    Mark available again
                  </Button>
                ) : null}
                {data.status !== "given_away" ? (
                  <Button size="sm" variant="help" className="rounded-full" onClick={() => void setListingStatus("given_away", "Marked as given away")}>
                    Mark given away
                  </Button>
                ) : null}
                <Button size="sm" variant="ghost" className="rounded-full" onClick={() => void setListingStatus("removed", "Listing removed")}>
                  Remove listing
                </Button>
              </div>

              <div className="mt-6 border-t border-border pt-5">
                <h3 className="font-display text-sm font-bold">Interested people ({interests?.length ?? 0})</h3>
                {(interests ?? []).length === 0 ? (
                  <p className="mt-2 text-sm text-muted-foreground">No interest yet.</p>
                ) : (
                  <ul className="mt-3 space-y-3">
                    {(interests ?? []).map((interest) => (
                      <li key={interest.id} className="rounded-2xl border border-border p-4">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <Link to="/u/$id" params={{ id: interest.user_id }} className="text-sm font-semibold">
                            {interest.person?.display_name ?? "Goodivo member"}
                          </Link>
                          <Badge variant="secondary">{statusLabel(interest.status)}</Badge>
                        </div>
                        {interest.message ? (
                          <p className="mt-2 whitespace-pre-wrap text-sm text-muted-foreground">{interest.message}</p>
                        ) : null}
                        <div className="mt-3 flex flex-wrap gap-2">
                          {interest.status === "pending" ? (
                            <>
                              <Button size="sm" variant="help" className="rounded-full" onClick={() => void decideInterest(interest, "reserved")}>
                                Reserve for them
                              </Button>
                              <Button size="sm" variant="outline" className="rounded-full" onClick={() => void decideInterest(interest, "declined")}>
                                Decline
                              </Button>
                            </>
                          ) : null}
                          {interest.status === "reserved" ? (
                            <Button size="sm" variant="help" className="rounded-full" onClick={() => void decideInterest(interest, "completed")}>
                              Given away
                            </Button>
                          ) : null}
                          <Button size="sm" variant="ghost" className="rounded-full" onClick={() => void openConversation(interest.user_id)}>
                            Message
                          </Button>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              {reserved && data.status === "given_away" ? (
                <div className="mt-4">
                  <ReviewDialog revieweeId={reserved.user_id} listingId={id} label="Review the receiver" />
                </div>
              ) : null}
            </section>
          ) : null}

          {!isOwner && data.status === "published" ? (
            <section className="surface-card rounded-3xl p-6">
              <h2 className="font-display text-base font-bold">
                {myInterest ? "Your interest" : "Express interest"}
              </h2>
              {myInterest ? (
                <div className="mt-2 space-y-3">
                  <Badge variant="secondary">{statusLabel(myInterest.status)}</Badge>
                  {myInterest.message ? (
                    <p className="text-sm text-muted-foreground">{myInterest.message}</p>
                  ) : null}
                  <Button
                    size="sm"
                    variant="ghost"
                    className="rounded-full text-muted-foreground"
                    onClick={async () => {
                      const { error } = await supabase.from("product_interests").delete().eq("id", myInterest.id);
                      if (error) { toast.error(error.message); return; }
                      void queryClient.invalidateQueries({ queryKey: ["product-interests", id] });
                      toast.success("Interest withdrawn");
                    }}
                  >
                    Withdraw interest
                  </Button>
                </div>
              ) : (
                <div className="mt-4 space-y-4">
                  <Field id="interest-message" label="Message to the donor" hint="Optional. Say when you could collect.">
                    <Textarea
                      id="interest-message"
                      rows={3}
                      maxLength={1000}
                      value={message}
                      onChange={(event) => setMessage(event.target.value)}
                    />
                  </Field>
                  <Button className="rounded-full" onClick={() => void expressInterest()}>
                    I'm interested
                  </Button>
                </div>
              )}
            </section>
          ) : null}

          {myInterest?.status === "completed" ? (
            <div className="surface-card rounded-3xl p-6">
              <ReviewDialog revieweeId={data.owner_id} listingId={id} label="Review the donor" />
            </div>
          ) : null}
        </div>

        <aside className="surface-card h-fit rounded-3xl p-6">
          <h2 className="font-display text-sm font-bold">Details</h2>
          <dl className="mt-3 space-y-2 text-sm text-muted-foreground">
            <div className="flex justify-between gap-3">
              <dt>Condition</dt>
              <dd className="font-medium capitalize text-foreground">{data.condition}</dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt>Quantity</dt>
              <dd className="font-medium text-foreground">{data.quantity}</dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt>Pickup</dt>
              <dd className="font-medium text-foreground">{data.pickup_available ? "Yes" : "No"}</dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt>Delivery</dt>
              <dd className="font-medium text-foreground">{data.delivery_available ? "Yes" : "No"}</dd>
            </div>
          </dl>
          {data.owner ? (
            <div className="mt-5 border-t border-border pt-4">
              <p className="text-xs font-bold uppercase tracking-[0.14em] text-muted-foreground">Offered by</p>
              <Link to="/u/$id" params={{ id: data.owner_id }} className="mt-2 block text-sm font-semibold">
                {data.owner.display_name}
              </Link>
            </div>
          ) : null}
          <p className="mt-5 rounded-xl bg-secondary px-4 py-3 text-xs text-muted-foreground">
            Items and requests are free. The donor covers any offered local delivery; paid shipping is not supported. Never pay a deposit. No advertisements or tasks are required, and expressing interest does not guarantee the item.
          </p>
        </aside>
      </div>
    </AppShell>
  );
}
