import { Link } from "@tanstack/react-router";

import { BrandMark } from "@/components/site/Brand";

export const LEGAL_LINKS = [
  { slug: "privacy", label: "Privacy" },
  { slug: "terms", label: "Terms" },
  { slug: "community-guidelines", label: "Community Guidelines" },
  { slug: "prohibited-items", label: "Prohibited Items" },
  { slug: "content-rules", label: "Content Rules" },
  { slug: "support-policy", label: "Support Policy" },
  { slug: "account-deletion", label: "Account Deletion" },
] as const;

export function SiteFooter() {
  return (
    <footer className="mt-10 border-t border-border py-8">
      <div className="mx-auto flex max-w-6xl flex-col items-start justify-between gap-6 px-5 sm:flex-row sm:items-center sm:px-8">
        <div className="flex items-center gap-2.5">
          <BrandMark size="sm" />
          <div>
            <p className="font-display text-sm font-bold">Goodivo — Give More. Help More.</p>
            <p className="text-xs text-muted-foreground">Powered by Socilet</p>
          </div>
        </div>
        <nav className="flex flex-wrap gap-x-5 gap-y-2 text-xs font-medium text-muted-foreground">
          {LEGAL_LINKS.map((link) => (
            <Link key={link.slug} to="/legal/$slug" params={{ slug: link.slug }} className="hover:text-foreground">
              {link.label}
            </Link>
          ))}
          <Link to="/contact" className="hover:text-foreground">
            Contact
          </Link>
        </nav>
      </div>
    </footer>
  );
}
