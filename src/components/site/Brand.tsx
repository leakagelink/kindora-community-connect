import { Link } from "@tanstack/react-router";

import logo from "@/assets/logo.png";

export function BrandMark({ size = "md" }: { size?: "sm" | "md" }) {
  const box = size === "sm" ? "size-8 rounded-lg" : "size-9 rounded-xl";
  return (
    <img
      src={logo}
      alt=""
      aria-hidden="true"
      className={`shrink-0 object-contain ${box}`}
    />
  );
}

export function BrandLockup({ withAttribution = true }: { withAttribution?: boolean }) {
  return (
    <Link to="/" className="flex items-center gap-2.5">
      <BrandMark />
      <span className="leading-none">
        <span className="block font-display text-lg font-extrabold tracking-tight">Goodivo</span>
        {withAttribution ? (
          <span className="mt-1 block text-[10px] font-medium uppercase tracking-[0.18em] text-muted-foreground">
            Powered by Socilet
          </span>
        ) : null}
      </span>
    </Link>
  );
}
