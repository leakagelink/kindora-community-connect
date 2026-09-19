import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { BrandLockup } from "@/components/site/Brand";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";
import { useAuth } from "@/lib/auth";

type AuthSearch = { mode?: "signin" | "signup" | "reset" | undefined; redirect?: string | undefined };

export const Route = createFileRoute("/auth")({
  validateSearch: (search: Record<string, unknown>): AuthSearch => ({
    mode: search['mode'] === "signup" || search['mode'] === "reset" ? search['mode'] : "signin",
    redirect:
      typeof search['redirect'] === "string" && search['redirect'].startsWith("/")
        ? (search['redirect'] as string)
        : undefined,
  }),
  head: () => ({
    meta: [
      { title: "Log in or sign up — Kindora" },
      { name: "description", content: "Create a free Kindora account to request help, offer skills or give products." },
      { property: "og:title", content: "Log in or sign up — Kindora" },
      { property: "og:description", content: "Create a free Kindora account to request help or offer skills." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const { mode = "signin", redirect } = Route.useSearch();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState<null | "confirm" | "reset">(null);

  useEffect(() => {
    if (user) void navigate({ to: redirect ?? "/", replace: true });
  }, [user, redirect, navigate]);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    try {
      if (mode === "reset") {
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: `${window.location.origin}/reset-password`,
        });
        if (error) throw error;
        setSent("reset");
        return;
      }
      if (mode === "signup") {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: window.location.origin,
            data: { full_name: displayName || email.split("@")[0] },
          },
        });
        if (error) throw error;
        if (!data.session) {
          setSent("confirm");
          return;
        }
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Something went wrong");
    } finally {
      setBusy(false);
    }
  }

  async function handleGoogle() {
    setBusy(true);
    const result = await lovable.auth.signInWithOAuth("google", { redirect_uri: window.location.origin });
    if (result.error) {
      toast.error("Google sign-in didn't work. Please try again.");
      setBusy(false);
      return;
    }
    if (result.redirected) return;
    void navigate({ to: redirect ?? "/", replace: true });
  }

  return (
    <div className="mesh-ground flex min-h-screen flex-col items-center justify-center px-5 py-10">
      <BrandLockup />
      <div className="surface-card mt-7 w-full max-w-md rounded-3xl p-6 sm:p-8">
        {sent ? (
          <div className="text-center">
            <h1 className="font-display text-xl font-bold">Check your email</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              {sent === "confirm"
                ? `We sent a confirmation link to ${email}. Click it to activate your account, then come back and log in.`
                : `We sent a password reset link to ${email}.`}
            </p>
            <Button asChild variant="outline" className="mt-5 rounded-full">
              <Link to="/auth" search={{ mode: "signin", redirect }} onClick={() => setSent(null)}>
                Back to log in
              </Link>
            </Button>
          </div>
        ) : (
          <>
            <h1 className="font-display text-2xl font-extrabold tracking-tight">
              {mode === "signup" ? "Create your account" : mode === "reset" ? "Reset your password" : "Welcome back"}
            </h1>
            <p className="mt-1.5 text-sm text-muted-foreground">
              {mode === "signup"
                ? "Free to join. Asking for help is always free."
                : mode === "reset"
                  ? "We'll email you a secure link to set a new password."
                  : "Log in to post requests, offer help and message people."}
            </p>

            <form className="mt-6 space-y-4" onSubmit={handleSubmit}>
              {mode === "signup" ? (
                <div className="space-y-1.5">
                  <Label htmlFor="displayName">Display name</Label>
                  <Input
                    id="displayName"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    maxLength={60}
                    placeholder="How should people see you?"
                  />
                </div>
              ) : null}
              <div className="space-y-1.5">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  required
                  autoComplete="email"
                  maxLength={255}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
              {mode !== "reset" ? (
                <div className="space-y-1.5">
                  <Label htmlFor="password">Password</Label>
                  <Input
                    id="password"
                    type="password"
                    required
                    minLength={8}
                    autoComplete={mode === "signup" ? "new-password" : "current-password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                  {mode === "signup" ? (
                    <p className="text-xs text-muted-foreground">Use at least 8 characters.</p>
                  ) : null}
                </div>
              ) : null}
              <Button type="submit" disabled={busy} size="pill" className="w-full">
                {busy ? "Please wait…" : mode === "signup" ? "Create account" : mode === "reset" ? "Send reset link" : "Log in"}
              </Button>
            </form>

            {mode !== "reset" ? (
              <>
                <div className="my-5 flex items-center gap-3 text-xs text-muted-foreground">
                  <span className="h-px flex-1 bg-border" /> or <span className="h-px flex-1 bg-border" />
                </div>
                <Button variant="outline" size="pill" className="w-full" disabled={busy} onClick={handleGoogle}>
                  Continue with Google
                </Button>
              </>
            ) : null}

            <div className="mt-6 space-y-2 text-center text-sm">
              {mode === "signin" ? (
                <>
                  <p className="text-muted-foreground">
                    New to Kindora?{" "}
                    <Link to="/auth" search={{ mode: "signup", redirect }} className="font-semibold text-primary">
                      Create an account
                    </Link>
                  </p>
                  <p>
                    <Link to="/auth" search={{ mode: "reset", redirect }} className="text-xs text-muted-foreground underline">
                      Forgot your password?
                    </Link>
                  </p>
                </>
              ) : (
                <p className="text-muted-foreground">
                  Already have an account?{" "}
                  <Link to="/auth" search={{ mode: "signin", redirect }} className="font-semibold text-primary">
                    Log in
                  </Link>
                </p>
              )}
            </div>
          </>
        )}
      </div>
      <p className="mt-6 max-w-md text-center text-xs text-muted-foreground">
        By continuing you agree to our{" "}
        <Link to="/legal/$slug" params={{ slug: "terms" }} className="underline">
          Terms
        </Link>{" "}
        and{" "}
        <Link to="/legal/$slug" params={{ slug: "privacy" }} className="underline">
          Privacy Policy
        </Link>
        .
      </p>
    </div>
  );
}
