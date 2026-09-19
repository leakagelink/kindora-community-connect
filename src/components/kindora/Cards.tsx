import { Link } from "@tanstack/react-router";
import { MapPin, Package, Wifi } from "lucide-react";

import { requestTypeLabel, statusLabel, timeAgo } from "@/lib/kindora";

function Chip({ children }: { children: React.ReactNode }) {
  return <span className="rounded-md bg-secondary px-2 py-1 text-xs font-medium text-muted-foreground">{children}</span>;
}

function TypeBadge({ type }: { type: string }) {
  const tone =
    type === "product"
      ? "bg-accent/15 text-accent"
      : type === "skill_knowledge"
        ? "bg-success/10 text-success"
        : "bg-primary/10 text-primary";
  return <span className={`rounded-full px-2.5 py-1 text-[11px] font-bold ${tone}`}>{requestTypeLabel(type)}</span>;
}

export type RequestCardData = {
  id: string;
  title: string;
  description: string;
  request_type: string;
  status: string;
  is_remote: boolean;
  location: string | null;
  language: string | null;
  created_at: string;
  offers_count: number;
  category?: { name: string } | null;
};

export function RequestCard({ request }: { request: RequestCardData }) {
  return (
    <Link
      to="/requests/$id"
      params={{ id: request.id }}
      className="surface-card flex flex-col rounded-3xl p-5 transition-shadow hover:shadow-[var(--shadow-lift)]"
    >
      <div className="flex items-center justify-between gap-2">
        <TypeBadge type={request.request_type} />
        <span className="text-[11px] font-semibold text-muted-foreground">{timeAgo(request.created_at)}</span>
      </div>
      <h3 className="mt-3 font-display text-base font-bold leading-snug">{request.title}</h3>
      <p className="mt-1.5 line-clamp-2 flex-1 text-sm text-muted-foreground">{request.description}</p>
      <div className="mt-4 flex flex-wrap items-center gap-2">
        {request.is_remote ? <Chip>Remote</Chip> : <Chip>{request.location ?? "Local"}</Chip>}
        {request.language ? <Chip>{request.language}</Chip> : null}
        {request.category?.name ? <Chip>{request.category.name}</Chip> : null}
        <span className="ml-auto text-[11px] font-bold text-accent">
          {request.offers_count > 0
            ? `${request.offers_count} offer${request.offers_count === 1 ? "" : "s"}`
            : statusLabel(request.status)}
        </span>
      </div>
    </Link>
  );
}

export type ListingCardData = {
  id: string;
  title: string;
  description: string;
  condition: string;
  photos: string[];
  location: string | null;
  pickup_available: boolean;
  delivery_available: boolean;
  quantity: number;
  status: string;
  created_at: string;
};

export function ListingCard({ listing }: { listing: ListingCardData }) {
  const photo = listing.photos?.[0];
  return (
    <Link
      to="/products/$id"
      params={{ id: listing.id }}
      className="surface-card flex flex-col overflow-hidden rounded-3xl transition-shadow hover:shadow-[var(--shadow-lift)]"
    >
      <div className="aspect-[4/3] w-full bg-secondary">
        {photo ? (
          <img src={photo} alt={listing.title} loading="lazy" className="size-full object-cover" />
        ) : (
          <div className="grid size-full place-items-center text-muted-foreground">
            <Package className="size-8" />
          </div>
        )}
      </div>
      <div className="flex flex-1 flex-col p-4">
        <div className="flex items-center justify-between gap-2">
          <span className="rounded-full bg-accent/15 px-2.5 py-1 text-[11px] font-bold text-accent">Free product</span>
          <span className="text-[11px] font-semibold text-muted-foreground">{statusLabel(listing.status)}</span>
        </div>
        <h3 className="mt-2.5 font-display text-base font-bold leading-snug">{listing.title}</h3>
        <p className="mt-1 line-clamp-2 flex-1 text-sm text-muted-foreground">{listing.description}</p>
        <div className="mt-3 flex flex-wrap gap-2">
          <Chip>{listing.condition}</Chip>
          {listing.location ? <Chip>{listing.location}</Chip> : null}
          {listing.pickup_available ? <Chip>Pickup</Chip> : null}
          {listing.delivery_available ? <Chip>Delivery</Chip> : null}
        </div>
      </div>
    </Link>
  );
}

export type HelperCardData = {
  id: string;
  user_id: string;
  headline: string;
  intro: string | null;
  skills: string[];
  experience: string;
  availability: string | null;
  is_remote: boolean;
  location: string | null;
  profile?: { display_name: string; avatar_url: string | null } | null;
};

export function HelperCard({ helper }: { helper: HelperCardData }) {
  return (
    <Link
      to="/u/$id"
      params={{ id: helper.user_id }}
      className="surface-card flex flex-col rounded-3xl p-5 transition-shadow hover:shadow-[var(--shadow-lift)]"
    >
      <div className="flex items-center gap-3">
        <span className="grid size-10 place-items-center overflow-hidden rounded-full bg-secondary font-display text-sm font-bold">
          {helper.profile?.avatar_url ? (
            <img src={helper.profile.avatar_url} alt="" className="size-full object-cover" />
          ) : (
            (helper.profile?.display_name ?? "K").charAt(0).toUpperCase()
          )}
        </span>
        <div className="min-w-0">
          <p className="truncate text-sm font-bold">{helper.profile?.display_name ?? "Kindora member"}</p>
          <p className="text-xs capitalize text-muted-foreground">{helper.experience}</p>
        </div>
      </div>
      <h3 className="mt-3 font-display text-base font-bold leading-snug">{helper.headline}</h3>
      {helper.intro ? <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{helper.intro}</p> : null}
      <div className="mt-3 flex flex-wrap items-center gap-2">
        {helper.is_remote ? (
          <Chip>
            <Wifi className="mr-1 inline size-3" />
            Remote
          </Chip>
        ) : null}
        {helper.location ? (
          <Chip>
            <MapPin className="mr-1 inline size-3" />
            {helper.location}
          </Chip>
        ) : null}
        {helper.skills.slice(0, 2).map((skill) => (
          <Chip key={skill}>{skill}</Chip>
        ))}
      </div>
    </Link>
  );
}

export function CardSkeleton({ count = 3 }: { count?: number }) {
  return (
    <>
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="surface-card h-44 animate-pulse rounded-3xl" />
      ))}
    </>
  );
}
