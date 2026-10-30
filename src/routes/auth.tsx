import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { BrandLockup } from "@/components/site/Brand";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { useServerFn } from "@tanstack/react-start";
import { sendPhoneOtp, verifyPhoneOtp } from "@/lib/phone-auth.functions";
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
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { title: "Log in or sign up — Goodivo" },
      { name: "description", content: "Create a free Goodivo account to request help, offer skills or give products." },
      { property: "og:title", content: "Log in or sign up — Goodivo" },
      { property: "og:description", content: "Create a free Goodivo account to request help or offer skills." },
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
  const [usePhone, setUsePhone] = useState(false);
  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");
  const [codeSent, setCodeSent] = useState(false);
  const sendOtp = useServerFn(sendPhoneOtp);
  const verifyOtp = useServerFn(verifyPhoneOtp);

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

  async function handleSendCode(event?: React.FormEvent) {
    event?.preventDefault();
    setBusy(true);
    try {
      await sendOtp({ data: { phone } });
      setCodeSent(true);
      toast.success("Code sent by SMS.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not send the code");
    } finally {
      setBusy(false);
    }
  }

  async function handleVerifyCode(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    try {
      const { tokenHash } = await verifyOtp({ data: { phone, code, displayName: displayName || undefined } });
      const { error } = await supabase.auth.verifyOtp({ token_hash: tokenHash, type: "magiclink" });
      if (error) throw error;
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not verify the code");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mesh-ground min-h-dvh px-4 py-6 sm:px-6 sm:py-10">
      <div className="mx-auto grid w-full max-w-5xl items-center gap-8 lg:min-h-[calc(100dvh-5rem)] lg:grid-cols-[1fr_minmax(0,28rem)] lg:gap-14">
      <aside className="hidden animate-in fade-in slide-in-from-left-4 duration-700 lg:block">
        <BrandLockup />
        <h2 className="mt-8 font-display text-4xl font-extrabold leading-tight tracking-tight">
          Give more. <span className="text-primary">Help more.</span>
        </h2>
        <p className="mt-3 max-w-md text-muted-foreground">
          Join a community where asking for help, sharing skills and giving away useful things is always free.
        </p>
        <ul className="mt-8 space-y-3">
          {[
            { icon: HeartHandshake, text: "Request or offer help — no payment ever required" },
            { icon: Gift, text: "Give and receive free products locally" },
            { icon: ShieldCheck, text: "Private contact details, report and block tools" },
          ].map(({ icon: Icon, text }) => (
            <li key={text} className="flex items-center gap-3 rounded-2xl bg-card/70 p-3 text-sm shadow-sm backdrop-blur">
              <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary">
                <Icon className="h-4 w-4" />
              </span>
              {text}
            </li>
          ))}
        </ul>
      </aside>
      <main className="mx-auto flex w-full max-w-md flex-col items-center animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="lg:hidden"><BrandLockup /></div>
      <div className="surface-card mt-6 w-full rounded-3xl p-5 shadow-xl sm:p-8 lg:mt-0">
        {mode !== "reset" && !sent ? (
          <div className="mb-6 grid grid-cols-2 rounded-full bg-muted p-1 text-sm font-semibold" role="tablist">
            {(["signin", "signup"] as const).map((m) => (
              <Link
                key={m}
                to="/auth"
                search={{ mode: m, redirect }}
                role="tab"
                aria-selected={mode === m}
                className={`rounded-full py-2 text-center transition-all ${mode === m ? "bg-background text-foreground shadow" : "text-muted-foreground hover:text-foreground"}`}
              >
                {m === "signin" ? "Log in" : "Sign up"}
              </Link>
            ))}
          </div>
        ) : null}
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
                {!usePhone ? (
                  <Button variant="outline" size="pill" className="w-full" disabled={busy} onClick={() => setUsePhone(true)}>
                    {mode === "signup" ? "Sign up with mobile number" : "Log in with mobile number"}
                  </Button>
                ) : (
                  <form className="space-y-3" onSubmit={codeSent ? handleVerifyCode : handleSendCode}>
                    <div className="space-y-1.5">
                      <Label htmlFor="phone">Mobile number (India)</Label>
                      <div className="flex gap-2">
                        <span className="flex items-center rounded-md border border-input px-3 text-sm text-muted-foreground">+91</span>
                        <Input
                          id="phone"
                          type="tel"
                          inputMode="numeric"
                          autoComplete="tel-national"
                          required
                          maxLength={14}
                          placeholder="98765 43210"
                          value={phone}
                          disabled={codeSent}
                          onChange={(e) => setPhone(e.target.value)}
                        />
                      </div>
                    </div>
                    {codeSent ? (
                      <div className="space-y-1.5">
                        <Label htmlFor="otp">6-digit code</Label>
                        <Input
                          id="otp"
                          inputMode="numeric"
                          autoComplete="one-time-code"
                          required
                          pattern="\d{6}"
                          maxLength={6}
                          value={code}
                          onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
                        />
                        <div className="flex justify-between text-xs">
                          <button type="button" className="text-muted-foreground underline" onClick={() => { setCodeSent(false); setCode(""); }}>
                            Change number
                          </button>
                          <button type="button" className="font-semibold text-primary" disabled={busy} onClick={() => void handleSendCode()}>
                            Resend code
                          </button>
                        </div>
                      </div>
                    ) : null}
                    <Button type="submit" disabled={busy} size="pill" className="w-full">
                      {busy ? "Please wait…" : codeSent ? "Verify & continue" : "Send code by SMS"}
                    </Button>
                  </form>
                )}
              </>
            ) : null}

            <div className="mt-6 space-y-2 text-center text-sm">
              {mode === "signin" ? (
                <>
                  <p className="text-muted-foreground">
                    New to Goodivo?{" "}
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
      <p className="mt-5 max-w-md text-center text-xs text-muted-foreground">
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
      </main>
      </div>
    </div>
  );
}
