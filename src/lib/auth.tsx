import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { useQuery, useQueryClient } from "@tanstack/react-query";

import { supabase } from "@/integrations/supabase/client";

export type AppRole = "member" | "moderator" | "admin";

type AuthValue = {
  session: Session | null;
  user: User | null;
  loading: boolean;
  roles: AppRole[];
  isStaff: boolean;
  isAdmin: boolean;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const queryClient = useQueryClient();

  useEffect(() => {
    let active = true;

    const { data } = supabase.auth.onAuthStateChange((event, nextSession) => {
      if (!active) return;
      setSession(nextSession);
      setLoading(false);
      if (event === "SIGNED_OUT") {
        queryClient.clear();
      }
      if (event === "SIGNED_IN" || event === "USER_UPDATED") {
        void queryClient.invalidateQueries();
      }
    });

    void supabase.auth.getSession().then(({ data: sessionData }) => {
      if (!active) return;
      setSession(sessionData.session);
      setLoading(false);
    });

    return () => {
      active = false;
      data.subscription.unsubscribe();
    };
  }, [queryClient]);

  const userId = session?.user.id ?? null;

  // Make sure every signed-in person has a profile row to work with.
  useEffect(() => {
    if (!userId) return;
    const meta = session?.user.user_metadata ?? {};
    void supabase
      .from("profiles")
      .upsert(
        {
          id: userId,
          display_name:
            (meta['full_name'] as string | undefined) ??
            (meta['name'] as string | undefined) ??
            session?.user.email?.split("@")[0] ??
            "Goodivo member",
          avatar_url: (meta['avatar_url'] as string | undefined) ?? null,
        },
        { onConflict: "id", ignoreDuplicates: true },
      )
      .then(() => queryClient.invalidateQueries({ queryKey: ["profile", userId] }));
  }, [userId, session, queryClient]);

  const { data: roleRows } = useQuery({
    queryKey: ["roles", userId],
    enabled: Boolean(userId),
    queryFn: async () => {
      const { data, error } = await supabase.from("user_roles").select("role").eq("user_id", userId!);
      if (error) throw error;
      return data;
    },
  });

  const value = useMemo<AuthValue>(() => {
    const roles = (roleRows ?? []).map((row) => row.role as AppRole);
    return {
      session,
      user: session?.user ?? null,
      loading,
      roles,
      isStaff: roles.includes("moderator") || roles.includes("admin"),
      isAdmin: roles.includes("admin"),
      signOut: async () => {
        await queryClient.cancelQueries();
        queryClient.clear();
        await supabase.auth.signOut();
      },
    };
  }, [session, loading, roleRows, queryClient]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}
