import { Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Bell, ShieldCheck } from "lucide-react";

import { BrandLockup } from "@/components/site/Brand";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";

const NAV = [
  { to: "/", label: "Home" },
  { to: "/explore", label: "Explore" },
  { to: "/ai-tools", label: "Free AI Tools" },
  { to: "/tasks", label: "Tasks" },
  { to: "/about", label: "About" },
] as const;

export function SiteHeader() {
  const { user, isStaff, signOut } = useAuth();
  const navigate = useNavigate();

  const { data: unread } = useQuery({
    queryKey: ["unread-notifications", user?.id],
    enabled: Boolean(user),
    queryFn: async () => {
      const { count, error } = await supabase
        .from("notifications")
        .select("id", { count: "exact", head: true })
        .is("read_at", null);
      if (error) throw error;
      return count ?? 0;
    },
  });

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-background/85 backdrop-blur-md">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-3.5 sm:px-8">
        <BrandLockup />

        <nav className="hidden items-center gap-5 text-sm font-medium lg:flex">
          {NAV.map((item) => (
            <Link
              key={item.to}
              to={item.to}
              activeOptions={{ exact: item.to === "/" }}
              className="text-muted-foreground transition-colors hover:text-foreground data-[status=active]:text-foreground"
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          {user ? (
            <>
              {isStaff ? (
                <Button asChild variant="ghost" size="sm" className="hidden sm:inline-flex">
                  <Link to="/admin">
                    <ShieldCheck /> Admin
                  </Link>
                </Button>
              ) : null}
              <Button asChild variant="ghost" size="icon" aria-label="Notifications">
                <Link to="/notifications" className="relative">
                  <Bell />
                  {unread ? (
                    <span className="absolute right-1.5 top-1.5 size-2 rounded-full bg-accent" aria-hidden="true" />
                  ) : null}
                </Link>
              </Button>
              <Button asChild variant="outline" size="sm" className="rounded-full">
                <Link to="/profile">Profile</Link>
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="hidden rounded-full sm:inline-flex"
                onClick={async () => {
                  await signOut();
                  void navigate({ to: "/", replace: true });
                }}
              >
                Sign out
              </Button>
            </>
          ) : (
            <>
              <Button asChild variant="ghost" size="sm" className="hidden rounded-full sm:inline-flex">
                <Link to="/auth" search={{ mode: "signin", redirect: undefined }}>
                  Log in
                </Link>
              </Button>
              <Button asChild size="sm" variant="ink" className="rounded-full">
                <Link to="/auth" search={{ mode: "signup", redirect: undefined }}>
                  Sign up free
                </Link>
              </Button>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
