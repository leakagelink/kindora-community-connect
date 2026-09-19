import { Link } from "@tanstack/react-router";

export function BrandMark({ size = "md" }: { size?: "sm" | "md" }) {
  const box = size === "sm" ? "size-8 rounded-lg text-base" : "size-9 rounded-xl text-lg";
  return (
    <span
      aria-hidden="true"
      className={`grid place-items-center bg-primary font-display font-extrabold text-primary-foreground ${box}`}
    >
      K
    </span>
  );
}

export function BrandLockup({ withAttribution = true }: { withAttribution?: boolean }) {
  return (
    <Link to="/" className="flex items-center gap-2.5">
      <BrandMark />
      <span className="leading-none">
        <span className="block font-display text-lg font-extrabold tracking-tight">Kindora</span>
        {withAttribution ? (
          <span className="mt-1 block text-[10px] font-medium uppercase tracking-[0.18em] text-muted-foreground">
            Powered by Socilet
          </span>
        ) : null}
      </span>
    </Link>
  );
}
