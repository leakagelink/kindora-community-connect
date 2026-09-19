import type { ReactNode } from "react";

import { BottomNav } from "@/components/site/BottomNav";
import { SiteFooter } from "@/components/site/SiteFooter";
import { SiteHeader } from "@/components/site/SiteHeader";

export function AppShell({ children }: { children: ReactNode }) {
  return (
    <div className="mesh-ground flex min-h-screen flex-col">
      <SiteHeader />
      <main className="mx-auto w-full max-w-6xl flex-1 px-5 pb-24 pt-6 sm:px-8 md:pb-10">{children}</main>
      <SiteFooter />
      <BottomNav />
    </div>
  );
}

export function PageHeading({
  eyebrow,
  title,
  description,
  action,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div>
        {eyebrow ? (
          <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-muted-foreground">{eyebrow}</p>
        ) : null}
        <h1 className="mt-1.5 font-display text-2xl font-extrabold tracking-tight sm:text-3xl">{title}</h1>
        {description ? <p className="mt-2 max-w-2xl text-sm text-muted-foreground">{description}</p> : null}
      </div>
      {action}
    </div>
  );
}

export function EmptyState({ title, body, action }: { title: string; body: string; action?: ReactNode }) {
  return (
    <div className="surface-card rounded-3xl px-6 py-12 text-center">
      <p className="font-display text-base font-bold">{title}</p>
      <p className="mx-auto mt-1.5 max-w-sm text-sm text-muted-foreground">{body}</p>
      {action ? <div className="mt-5 flex justify-center">{action}</div> : null}
    </div>
  );
}
