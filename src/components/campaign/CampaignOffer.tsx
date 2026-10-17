import { Link, useNavigate } from '@tanstack/react-router';
import { ArrowRight, Check, Code2, Smartphone, Globe } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { campaignDisclosures } from '@/lib/campaign-rules';
import { adController } from '@/lib/ad-controller';
import { useAuth } from '@/lib/auth';
export function CampaignApplyButton() {
  const navigate = useNavigate(); const { user } = useAuth();
  return <Button variant="brand" onClick={() => void adController.beforeApplication(() => user ? navigate({ to: '/socilet/apply' }) : navigate({ to: '/auth', search: { redirect: '/socilet/apply' } }))}>Apply Now <ArrowRight className="size-4" /></Button>;
}
export function CampaignOffer({ compact = false }: { compact?: boolean }) {
  return <section aria-label="Socilet campaign" className="my-7 overflow-hidden rounded-lg border border-primary/20 bg-card">
    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border bg-primary/5 px-5 py-4 sm:px-8"><p className="font-display text-lg font-extrabold">Socilet <span className="font-normal text-muted-foreground">— Brand Your Dream</span></p><span className="text-xs font-semibold text-primary">#Socilet50</span></div>
    <div className="p-5 sm:p-8"><div className="flex gap-3 text-primary"><Globe className="size-6" /><Code2 className="size-6 text-leaf" /><Smartphone className="size-6 text-rose" /></div>
    <h2 className="mt-4 max-w-2xl font-display text-2xl font-extrabold leading-tight sm:text-3xl">Get Development Work Worth Up to <span className="text-primary">₹50,000</span> at <span className="text-leaf">₹0 Development Fee</span></h2>
    <p className="mt-3 max-w-2xl text-sm leading-relaxed text-muted-foreground">Apply for the Socilet #Socilet50 campaign to get selected for website, web app, mobile app or other approved digital development services.</p>
    <ul className="mt-5 grid gap-3 text-sm sm:grid-cols-2">{campaignDisclosures.map(text => <li key={text} className="flex items-start gap-2"><Check className="mt-0.5 size-4 shrink-0 text-leaf" /><span>{text}</span></li>)}</ul>
    <div className="mt-6 flex flex-wrap gap-3">{compact ? <Button asChild variant="outline"><Link to="/socilet">View Offer</Link></Button> : null}<CampaignApplyButton /><Button asChild variant="ghost"><Link to="/socilet/applications">My Applications</Link></Button></div></div>
  </section>;
}
