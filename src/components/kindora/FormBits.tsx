import type { ReactNode } from "react";

import { Label } from "@/components/ui/label";

export function Field({
  id,
  label,
  hint,
  required,
  children,
}: {
  id: string;
  label: string;
  hint?: string;
  required?: boolean;
  children: ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id}>
        {label}
        {required ? <span className="ml-1 text-destructive">*</span> : null}
      </Label>
      {children}
      {hint ? <p className="text-xs text-muted-foreground">{hint}</p> : null}
    </div>
  );
}

export function NativeSelect({
  id,
  value,
  onChange,
  children,
}: {
  id: string;
  value: string;
  onChange: (value: string) => void;
  children: ReactNode;
}) {
  return (
    <select
      id={id}
      value={value}
      onChange={(event) => onChange(event.target.value)}
      className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
    >
      {children}
    </select>
  );
}

export function FormCard({ title, description, children }: { title: string; description?: string; children: ReactNode }) {
  return (
    <section className="surface-card rounded-3xl p-6">
      <h2 className="font-display text-base font-bold">{title}</h2>
      {description ? <p className="mt-1 text-sm text-muted-foreground">{description}</p> : null}
      <div className="mt-5 space-y-4">{children}</div>
    </section>
  );
}

export function FreeNotice({ children }: { children: ReactNode }) {
  return (
    <p className="rounded-xl bg-secondary px-4 py-3 text-xs leading-relaxed text-muted-foreground">{children}</p>
  );
}
