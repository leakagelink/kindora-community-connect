import { useEffect, useState } from "react";

import logo from "@/assets/logo.png";

const SHOW_MS = 2100;
const FADE_MS = 450;

/**
 * Branded cold-start splash: logo pop-in, orbiting colour dots, gradient
 * wordmark and a loading bar. Shown once per app load, then fades away.
 */
export function SplashScreen() {
  const [phase, setPhase] = useState<"show" | "fade" | "gone">("show");

  useEffect(() => {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const showMs = reduce ? 500 : SHOW_MS;
    const fadeTimer = window.setTimeout(() => setPhase("fade"), showMs);
    const goneTimer = window.setTimeout(() => setPhase("gone"), showMs + FADE_MS);
    return () => {
      window.clearTimeout(fadeTimer);
      window.clearTimeout(goneTimer);
    };
  }, []);

  if (phase === "gone") return null;

  return (
    <div
      role="status"
      aria-label="Goodivo is loading"
      className={`mesh-ground fixed inset-0 z-[100] flex flex-col items-center justify-center overflow-hidden px-6 transition-opacity ${
        phase === "fade" ? "opacity-0" : "opacity-100"
      }`}
      style={{ transitionDuration: `${FADE_MS}px` }}
    >
      {/* Soft colour blooms behind the logo */}
      <div className="pointer-events-none absolute -left-24 top-16 h-72 w-72 rounded-full bg-primary/25 blur-3xl splash-bloom" />
      <div
        className="pointer-events-none absolute -right-24 top-1/3 h-72 w-72 rounded-full bg-success/25 blur-3xl splash-bloom"
        style={{ animationDelay: "0.6s" }}
      />
      <div
        className="pointer-events-none absolute -bottom-16 left-1/4 h-72 w-72 rounded-full bg-accent/25 blur-3xl splash-bloom"
        style={{ animationDelay: "1.2s" }}
      />

      {/* Logo with glow ring and orbiting dots */}
      <div className="relative splash-pop">
        <div className="absolute -inset-6 rounded-[2.5rem] bg-gradient-to-tr from-primary/30 via-accent/30 to-success/30 blur-2xl splash-glow" />
        <div className="absolute -inset-10 rounded-full border-2 border-primary/20 splash-ring" />
        <div
          className="absolute -inset-16 rounded-full border border-success/20 splash-ring"
          style={{ animationDelay: "0.5s" }}
        />

        <img
          src={logo}
          alt="Goodivo"
          className="relative h-28 w-28 rounded-[2rem] shadow-[var(--shadow-brand)] sm:h-32 sm:w-32"
        />

        {/* Orbiting dots in logo colours */}
        <div className="absolute -inset-10 splash-orbit">
          <span className="absolute left-1/2 top-0 h-2.5 w-2.5 -translate-x-1/2 rounded-full bg-primary" />
        </div>
        <div className="absolute -inset-10 splash-orbit" style={{ animationDelay: "-1.3s" }}>
          <span className="absolute left-1/2 top-0 h-2 w-2 -translate-x-1/2 rounded-full bg-success" />
        </div>
        <div className="absolute -inset-10 splash-orbit" style={{ animationDelay: "-2.6s" }}>
          <span className="absolute left-1/2 top-0 h-2 w-2 -translate-x-1/2 rounded-full bg-accent" />
        </div>
      </div>

      {/* Wordmark + tagline */}
      <h1 className="mt-10 font-display text-4xl font-extrabold tracking-tight sm:text-5xl">
        <span className="text-gradient-brand">Goodivo</span>
      </h1>
      <p className="reveal mt-2 text-sm font-semibold text-muted-foreground" style={{ animationDelay: "0.35s" }}>
        Give More. Help More.
      </p>

      {/* Loading bar */}
      <div className="mt-8 h-1.5 w-44 overflow-hidden rounded-full bg-muted">
        <div className="h-full w-full origin-left rounded-full bg-gradient-to-r from-primary via-accent to-success splash-bar" />
      </div>

      <p className="absolute bottom-8 text-xs font-medium text-muted-foreground">
        Powered by Socilet
      </p>
    </div>
  );
}
