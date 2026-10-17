import { Link } from '@tanstack/react-router';
import { ArrowRight, Code2, Globe, Smartphone } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { matchingSociletServices } from '@/lib/socilet-catalog';

export function SociletServices({ search = '' }: { search?: string }) {
  const services = matchingSociletServices(search);
  if (!services.length) return null;
  return <section aria-label="Socilet free services" className="py-5">
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div><p className="text-xs font-bold text-primary">SOCILET · #Socilet50</p><h2 className="mt-1 font-display text-xl font-extrabold">Socilet free services</h2></div>
      <Button asChild variant="outline" size="sm"><Link to="/socilet">Campaign details <ArrowRight /></Link></Button>
    </div>
    <p className="mt-2 max-w-2xl text-sm text-muted-foreground">₹0 development fee for selected businesses. One campaign, agreed scope; selection is not guaranteed. Third-party costs may apply.</p>
    <div className="mt-5 grid gap-4 md:grid-cols-3">{services.map(service => {
      const Icon = service.icon === 'website' ? Globe : service.icon === 'mobile-app' ? Smartphone : Code2;
      return <article key={service.id} className="surface-card lift-hover flex flex-col rounded-lg border border-primary/20 p-5">
        <div className="flex items-center justify-between gap-3"><Icon className="size-7 text-primary" /><span className="text-xs font-bold text-primary">Socilet</span></div>
        <h3 className="mt-4 font-display text-base font-bold">{service.title}</h3><p className="mt-2 flex-1 text-sm text-muted-foreground">{service.description}</p>
        <p className="mt-4 text-sm font-bold text-leaf">₹0 development fee</p>
        <Button asChild variant="ghost" className="mt-3 justify-start px-0 text-primary"><Link to="/socilet">View service & apply <ArrowRight /></Link></Button>
      </article>;
    })}</div>
  </section>;
}