import { createFileRoute, Link, notFound } from "@tanstack/react-router";

import { AppShell } from "@/components/site/AppShell";
import { LEGAL_DOCS, getLegalDoc } from "@/lib/legal";

export const Route = createFileRoute("/legal/$slug")({
  loader: ({ params }) => {
    const doc = getLegalDoc(params.slug);
    if (!doc) throw notFound();
    return { doc };
  },
  head: ({ loaderData }) => {
    if (!loaderData) {
      return { meta: [
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },{ title: "Policy not found — Goodivo" }, { name: "robots", content: "noindex" }] };
    }
    const { doc } = loaderData;
    return {
      meta: [
        { property: "og:type", content: "website" },
        { name: "twitter:card", content: "summary" },
        { title: `${doc.title} — Goodivo` },
        { name: "description", content: doc.summary },
        { property: "og:title", content: `${doc.title} — Goodivo` },
        { property: "og:description", content: doc.summary },
      ],
    };
  },
  component: LegalPage,
  notFoundComponent: () => (
    <AppShell>
      <h1 className="font-display text-2xl font-extrabold">Policy not found</h1>
      <p className="mt-2 text-sm text-muted-foreground">That policy page doesn't exist.</p>
    </AppShell>
  ),
});

function LegalPage() {
  const { doc } = Route.useLoaderData();

  return (
    <AppShell>
      <div className="grid gap-8 md:grid-cols-[220px_1fr]">
        <aside className="md:sticky md:top-24 md:self-start">
          <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-muted-foreground">Policies</p>
          <nav className="mt-3 flex flex-col gap-1">
            {LEGAL_DOCS.map((item) => (
              <Link
                key={item.slug}
                to="/legal/$slug"
                params={{ slug: item.slug }}
                className="rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-secondary data-[status=active]:bg-secondary data-[status=active]:text-foreground"
              >
                {item.title}
              </Link>
            ))}
          </nav>
        </aside>

        <article className="surface-card rounded-3xl p-6 sm:p-8">
          <h1 className="font-display text-3xl font-extrabold tracking-tight">{doc.title}</h1>
          <p className="mt-2 text-sm text-muted-foreground">{doc.summary}</p>
          <p className="mt-4 rounded-xl bg-secondary px-4 py-3 text-xs text-muted-foreground">
            Sections marked with square brackets are placeholders awaiting legal confirmation. We do not state any
            registration, licence or address that has not been verified.
          </p>
          <div className="mt-8 space-y-8">
            {doc.sections.map((section) => (
              <section key={section.heading}>
                <h2 className="font-display text-lg font-bold">{section.heading}</h2>
                <div className="mt-2 space-y-2.5">
                  {section.body.map((paragraph, index) => (
                    <p key={index} className="text-sm leading-relaxed text-muted-foreground">
                      {paragraph}
                    </p>
                  ))}
                </div>
              </section>
            ))}
          </div>
        </article>
      </div>
    </AppShell>
  );
}
