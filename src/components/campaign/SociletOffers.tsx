import { Link } from '@tanstack/react-router';
import { ArrowRight, Globe, PenTool, Server } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { matchingOffers } from '@/lib/socilet-offer-rules';

export function SociletOffers({ search = '' }: { search?: string }) {
  const offers = matchingOffers(search);
  if (!offers.length) return null;
  return <section aria-label="Socilet logo domain and hosting offers" className="py-6">
    <div className="flex flex-wrap items-end justify-between gap-3"><div><p className="text-xs font-bold text-primary">SOCILET · FREE BUSINESS SERVICES</p><h2 className="mt-1 font-display text-xl font-extrabold">Build your brand. Start for free.</h2></div><Button asChild variant="outline" size="sm"><Link to="/socilet/offers">Offers & terms <ArrowRight /></Link></Button></div>
    <div className="mt-5 grid gap-4 md:grid-cols-3">{offers.map(o => {
      const Icon = o.key === 'logo' ? PenTool : o.key === 'domain' ? Globe : Server;
      return <article key={o.key} className="surface-card lift-hover flex flex-col rounded-lg border border-primary/20 p-5"><div className="flex items-center justify-between gap-3"><Icon className="size-7 text-primary" /><span className="text-xs font-bold text-leaf">₹0 · {o.freeYears ? '1 year' : 'Custom design'}</span></div><h3 className="mt-4 font-display text-lg font-bold">{o.title}</h3><p className="mt-2 flex-1 text-sm text-muted-foreground">{o.description}</p><p className="mt-4 text-sm font-semibold">{o.applicationLimit} application limit · {o.awardLimit} recipients</p><p className="mt-1 text-xs text-muted-foreground">{o.key === 'logo' ? 'All valid applicants receive a logo.' : 'Business/project review. Selection not guaranteed.'}</p><Button asChild variant="brand" className="mt-5"><Link to="/socilet/offers/apply" search={{ offer: o.key }}>Apply for {o.key === 'logo' ? 'logo design' : o.key} <ArrowRight /></Link></Button></article>;
    })}</div>
  </section>;
}