import { queryOptions } from "@tanstack/react-query";

import { supabase } from "@/integrations/supabase/client";

export const REQUEST_TYPES = [
  { value: "digital_service", label: "Digital Service" },
  { value: "skill_knowledge", label: "Skill / Knowledge" },
  { value: "product", label: "Product" },
] as const;

export const REPORT_REASONS = [
  { value: "spam", label: "Spam" },
  { value: "scam_fraud", label: "Scam or fraud" },
  { value: "illegal_goods", label: "Illegal goods" },
  { value: "harassment", label: "Harassment" },
  { value: "hate_abuse", label: "Hate or abusive content" },
  { value: "sexual_content", label: "Sexual content" },
  { value: "dangerous_activity", label: "Dangerous activity" },
  { value: "misleading_offer", label: "Misleading offer" },
  { value: "privacy_violation", label: "Privacy violation" },
  { value: "other", label: "Other" },
] as const;

export const EXPERIENCE_LEVELS = [
  { value: "beginner", label: "Beginner" },
  { value: "intermediate", label: "Intermediate" },
  { value: "experienced", label: "Experienced" },
  { value: "professional", label: "Professional" },
] as const;

export const PRODUCT_CONDITIONS = ["new", "like new", "good", "used", "needs repair"] as const;

export const AI_TOOLS = [
  {
    key: "logo_maker",
    flag: "ai_logo_maker",
    name: "Logo Maker",
    blurb: "Generate and save logo concepts",
    path: "/ai-tools/logo",
  },
  {
    key: "resume_builder",
    flag: "ai_resume_builder",
    name: "Resume Builder",
    blurb: "Draft and export a clean CV",
    path: "/ai-tools/resume",
  },
  {
    key: "website_starter",
    flag: "ai_website_starter",
    name: "Website Starter",
    blurb: "A simple landing page to start from",
    path: "/ai-tools/website",
  },
] as const;

export function requestTypeLabel(value: string) {
  return REQUEST_TYPES.find((t) => t.value === value)?.label ?? value;
}

export function statusLabel(value: string) {
  return value.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

export function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.round(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.round(hours / 24);
  if (days < 30) return `${days}d ago`;
  return new Date(iso).toLocaleDateString();
}

const PUBLIC_REQUEST_STATUSES = ["published", "receiving_offers", "in_progress"] as const;

export type RequestFilters = {
  search?: string | undefined;
  type?: string | undefined;
  categoryId?: string | undefined;
  remote?: "any" | "remote" | "local";
  language?: string | undefined;
  limit?: number | undefined;
};

export const categoriesQuery = queryOptions({
  queryKey: ["categories"],
  queryFn: async () => {
    const { data, error } = await supabase
      .from("categories")
      .select("id, name, slug, group_name, sort_order, is_active")
      .eq("is_active", true)
      .order("sort_order");
    if (error) throw error;
    return data;
  },
  staleTime: 5 * 60 * 1000,
});

export const featureFlagsQuery = queryOptions({
  queryKey: ["feature-flags"],
  queryFn: async () => {
    const { data, error } = await supabase.from("feature_flags").select("key, description, is_enabled");
    if (error) throw error;
    return Object.fromEntries(data.map((row) => [row.key, row.is_enabled])) as Record<string, boolean>;
  },
  staleTime: 5 * 60 * 1000,
});

export const aiLimitsQuery = queryOptions({
  queryKey: ["ai-limits"],
  queryFn: async () => {
    const { data, error } = await supabase.from("ai_usage_limits").select("tool, daily_limit, is_enabled");
    if (error) throw error;
    return data;
  },
  staleTime: 5 * 60 * 1000,
});

const REQUEST_SELECT =
  "id, title, description, request_type, status, is_remote, location, language, needed_by, created_at, offers_count, owner_id, category:categories(id, name, group_name)";

export function requestsQuery(filters: RequestFilters = {}) {
  return queryOptions({
    queryKey: ["help-requests", filters],
    queryFn: async () => {
      let query = supabase
        .from("help_requests")
        .select(REQUEST_SELECT)
        .in("status", [...PUBLIC_REQUEST_STATUSES])
        .is("deleted_at", null)
        .order("created_at", { ascending: false })
        .limit(filters.limit ?? 24);

      if (filters.search) query = query.or(`title.ilike.%${filters.search}%,description.ilike.%${filters.search}%`);
      if (filters.type) query = query.eq("request_type", filters.type as "digital_service");
      if (filters.categoryId) query = query.eq("category_id", filters.categoryId);
      if (filters.remote === "remote") query = query.eq("is_remote", true);
      if (filters.remote === "local") query = query.eq("is_remote", false);
      if (filters.language) query = query.ilike("language", `%${filters.language}%`);

      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
  });
}

export function requestQuery(id: string) {
  return queryOptions({
    queryKey: ["help-request", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("help_requests")
        .select(
          `${REQUEST_SELECT}, required_features, expected_deliverables, complexity, hosting_expectations, is_prototype, owner:profiles!help_requests_owner_id_fkey(id, display_name, avatar_url, city, country, show_location)`,
        )
        .eq("id", id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });
}

const LISTING_SELECT =
  "id, title, description, condition, photos, location, pickup_available, delivery_available, quantity, status, created_at, owner_id, category:categories(id, name)";

export type ListingFilters = { search?: string | undefined; categoryId?: string | undefined; location?: string; limit?: number };

export function listingsQuery(filters: ListingFilters = {}) {
  return queryOptions({
    queryKey: ["product-listings", filters],
    queryFn: async () => {
      let query = supabase
        .from("product_listings")
        .select(LISTING_SELECT)
        .in("status", ["published", "reserved"] as const)
        .is("deleted_at", null)
        .order("created_at", { ascending: false })
        .limit(filters.limit ?? 24);

      if (filters.search) query = query.or(`title.ilike.%${filters.search}%,description.ilike.%${filters.search}%`);
      if (filters.categoryId) query = query.eq("category_id", filters.categoryId);
      if (filters.location) query = query.ilike("location", `%${filters.location}%`);

      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
  });
}

export function listingQuery(id: string) {
  return queryOptions({
    queryKey: ["product-listing", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("product_listings")
        .select(
          `${LISTING_SELECT}, giveaway_rules, size_note, owner:profiles!product_listings_owner_id_fkey(id, display_name, avatar_url, city, country, show_location)`,
        )
        .eq("id", id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });
}

export function helpersQuery(filters: { search?: string | undefined; limit?: number } = {}) {
  return queryOptions({
    queryKey: ["service-offers", filters],
    queryFn: async () => {
      let query = supabase
        .from("service_offers")
        .select(
          "id, headline, intro, skills, experience, availability, is_remote, location, languages, user_id, created_at",
        )
        .eq("is_active", true)
        .is("deleted_at", null)
        .order("created_at", { ascending: false })
        .limit(filters.limit ?? 24);
      if (filters.search) query = query.or(`headline.ilike.%${filters.search}%,intro.ilike.%${filters.search}%`);
      const { data, error } = await query;
      if (error) throw error;
      const offers = data ?? [];
      const ids = [...new Set(offers.map((offer) => offer.user_id))];
      const { data: people } = ids.length
        ? await supabase.from("profiles").select("id, display_name, avatar_url").in("id", ids)
        : { data: [] };
      const byId = new Map((people ?? []).map((person) => [person.id, person]));
      return offers.map((offer) => ({
        ...offer,
        profile: byId.get(offer.user_id) ?? null,
      }));
    },
  });
}

export function profileQuery(id: string) {
  return queryOptions({
    queryKey: ["profile", id],
    queryFn: async () => {
      const { data, error } = await supabase.from("profiles").select("*").eq("id", id).maybeSingle();
      if (error) throw error;
      return data;
    },
  });
}

export function reviewsQuery(userId: string) {
  return queryOptions({
    queryKey: ["reviews", userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("reviews")
        .select("id, rating, comment, created_at, reviewer:profiles!reviews_reviewer_id_fkey(display_name, avatar_url)")
        .eq("reviewee_id", userId)
        .eq("is_hidden", false)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });
}
