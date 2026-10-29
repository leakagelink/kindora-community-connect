import type { ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";

import { AppShell, PageHeading } from "@/components/site/AppShell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { aiLimitsQuery, featureFlagsQuery, timeAgo } from "@/lib/goodivo";
import { ReportDialog } from "@/components/goodivo/ReportDialog";

export function useAiQuota(tool: string) {
  const { user } = useAuth();
  const { data: limits } = useQuery(aiLimitsQuery);
  const { data: flags } = useQuery(featureFlagsQuery);
  const { data: usage, refetch } = useQuery({
    queryKey: ["ai-usage", tool, user?.id],
    enabled: Boolean(user),
    queryFn: async () => {
      if (!user) throw new Error("Sign in required.");
      const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
      const { count, error } = await supabase
        .from("ai_generations")
        .select("id", { count: "exact", head: true })
        .eq("user_id", user.id)
        .eq("tool", tool)
        .gte("created_at", since);
      if (error) throw error;
      return count ?? 0;
    },
  });

  const limitRow = (limits ?? []).find((row) => row.tool === tool);
  const dailyLimit = limitRow?.daily_limit ?? 3;
  return {
    dailyLimit,
    used: usage ?? 0,
    remaining: Math.max(0, dailyLimit - (usage ?? 0)),
    enabled: limitRow?.is_enabled !== false,
    flags: flags ?? {},
    refetchUsage: refetch,
  };
}

export function AiHistory({ tool }: { tool: string }) {
  const { user } = useAuth();
  const { data } = useQuery({
    queryKey: ["ai-history", tool, user?.id],
    enabled: Boolean(user),
    queryFn: async () => {
      const { data: rows, error } = await supabase
        .from("ai_generations")
        .select("id, status, created_at")
        .eq("tool", tool)
        .order("created_at", { ascending: false })
        .limit(10);
      if (error) throw new Error("Your AI history could not be loaded.");
      return rows ?? [];
    },
  });

  if (!(data ?? []).length) return null;

  return (
    <section className="surface-card rounded-3xl p-6">
      <h2 className="font-display text-base font-bold">Saved to your account</h2>
      <ul className="mt-3 space-y-1 text-sm text-muted-foreground">
        {(data ?? []).map((row) => (
          <li key={row.id}>
            {timeAgo(row.created_at)} · {row.status}
            <ReportDialog targetType="ai_generation" targetId={row.id} label="Report AI content" />
          </li>
        ))}
      </ul>
    </section>
  );
}

export function AiToolPage({
  tool,
  title,
  description,
  children,
  flagKey,
}: {
  tool: string;
  title: string;
  description: string;
  flagKey: string;
  children: (quota: ReturnType<typeof useAiQuota>) => ReactNode;
}) {
  const { user } = useAuth();
  const quota = useAiQuota(tool);
  const flagEnabled = quota.flags[flagKey] !== false;

  return (
    <AppShell>
      <PageHeading
        eyebrow="Free AI tool"
        title={title}
        description={description}
        action={
          user ? (
            <Badge variant="secondary">
              {quota.remaining} of {quota.dailyLimit} left today
            </Badge>
          ) : null
        }
      />
      {!flagEnabled || !quota.enabled ? (
        <div className="surface-card rounded-3xl p-6 text-sm text-muted-foreground">
          This tool is temporarily turned off. Please check back later.
        </div>
      ) : !user ? (
        <div className="surface-card rounded-3xl p-6">
          <p className="text-sm text-muted-foreground">Sign in to use the free AI tools within our fair usage limits.</p>
          <Button asChild className="mt-4 rounded-full">
            <Link to="/auth" search={{ mode: "signin", redirect: "/ai-tools" }}>
              Sign in
            </Link>
          </Button>
        </div>
      ) : (
        <div className="space-y-4">
          {children(quota)}
          <AiHistory tool={tool} />
          <p className="rounded-xl bg-secondary px-4 py-3 text-xs leading-relaxed text-muted-foreground">
            AI output may contain mistakes and needs your review. It is not checked for originality, trademark conflicts
            or legal use, and is not guaranteed for commercial purposes. Free usage is limited and may change.
          </p>
        </div>
      )}
    </AppShell>
  );
}

export function download(filename: string, content: string, type: string) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}
