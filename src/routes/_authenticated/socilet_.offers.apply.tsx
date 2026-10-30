import { adController } from '@/lib/ad-controller';
import { createFileRoute, Link } from '@tanstack/react-router';
import { useServerFn } from '@tanstack/react-start';
import { useQuery } from '@tanstack/react-query';
import { useRef, useState } from 'react';
import { AppShell, PageHeading } from '@/components/site/AppShell';
import { Field, NativeSelect } from '@/components/goodivo/FormBits';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { campaignHead } from '@/lib/campaign-rules';
import { getOffer, offerKeys, offerSchema, offerTerms, SOCILET_OFFERS, type OfferKey } from '@/lib/socilet-offer-rules';
import { getOfferApplications, submitOffer } from '@/lib/socilet-offers.functions';
export const Route = createFileRoute('/_authenticated/socilet_/offers/apply')({
  head: () => campaignHead('Apply for free Socilet offers', 'Submit and track your private logo, domain or hosting application.', true),
  validateSearch: (s: Record<string, unknown>): { offer: OfferKey } => ({ offer: offerKeys.find(k => k === s['offer']) ?? 'logo' }), component: Apply,
});
const initial = { full_name: '', business_name: '', email: '', brief: '', reason: '', terms_accepted: false, contact_consent: false };
function Apply() {
  const search = Route.useSearch(); const [offer, setOffer] = useState<OfferKey>(search.offer);
  const [form, setForm] = useState(initial); const [busy, setBusy] = useState(false); const [error, setError] = useState(''); const [reference, setReference] = useState(''); const lock = useRef(false);
  const submit = useServerFn(submitOffer); const load = useServerFn(getOfferApplications);
  const query = useQuery({ queryKey: ['socilet-offer-applications'], queryFn: () => load() }); const selected = getOffer(offer);
  const set = (key: keyof typeof initial, value: string | boolean) => setForm(f => ({ ...f, [key]: value }));
  const existing = query.data?.find(a => a.offer_key === offer);
  async function save(e: React.FormEvent) {
    e.preventDefault(); if (lock.current) return; setError(''); setReference('');
    const parsed = offerSchema.safeParse(form);
    if (!parsed.success) { setError('Check your details, minimum brief lengths, terms acknowledgement and contact consent.'); return; }
    lock.current = true; setBusy(true);
    try { const saved = await submit({ data: { offer, payload: parsed.data } }); const result = await query.refetch();
      if (!result.data?.some(a => a.id === saved.id)) throw new Error('Submission could not be verified. Check My Applications before retrying.');
      setReference(saved.id); void adController.afterCompletedSubmission();
    } catch (e) { setError(e instanceof Error ? e.message : 'Application could not be saved. Please retry.'); }
    finally { lock.current = false; setBusy(false); }
  }
  return <AppShell><PageHeading eyebrow="Socilet free offers" title="Your next step starts here" /><div className="max-w-3xl"><Field id="offer" label="Choose your offer"><NativeSelect id="offer" value={offer} onChange={v => { const key = offerKeys.find(k => k === v); if (key) { setOffer(key); setReference(''); setError(''); } }}>{SOCILET_OFFERS.map(o => <option key={o.key} value={o.key}>{o.title}</option>)}</NativeSelect></Field><p className="my-4 text-sm text-muted-foreground">{selected.applicationLimit} applications maximum · {selected.awardLimit} recipients · {offer === 'logo' ? 'All valid applicants receive a custom logo.' : '1 year free. Selection through business/project review.'}</p>
    {reference ? <p role="status" className="my-4 border-l-4 border-leaf bg-leaf/10 p-4 text-sm">Application saved and verified. Reference: <span className="break-all">{reference}</span></p> : null}
    {query.isPending ? <p role="status">Loading your applications…</p> : query.isError ? <div role="alert"><p>{query.error.message}</p><Button variant="outline" onClick={() => void query.refetch()}>Retry</Button></div> : existing ? <article className="my-5 rounded-lg border border-border p-5"><h2 className="font-display text-lg font-bold">Your {offer} application</h2><p className="mt-2 capitalize">{existing.status.replaceAll('_', ' ')}</p><p className="mt-2 break-all text-xs text-muted-foreground">Reference: {existing.id}</p><p className="mt-4 text-sm">{existing.review_note ?? 'Saved for review. No delivery or selection has been confirmed yet.'}</p></article> : <form onSubmit={save} className="space-y-5"><fieldset disabled={busy} className="space-y-5">{([['full_name', 'Full name', 100], ['business_name', 'Business or brand name', 150], ['email', 'Email address', 255]] as const).map(([key, label, max]) => <Field key={key} id={key} label={label} required><Input id={key} type={key === 'email' ? 'email' : 'text'} required maxLength={max} value={form[key]} onChange={e => set(key, e.target.value)} /></Field>)}<Field id="brief" label={offer === 'logo' ? 'Logo brief: brand text, colours, style, symbols and intended use' : offer === 'domain' ? 'Business/project and preferred domain names' : 'Business/project and hosting requirements'} hint="At least 40 characters. Do not include passwords or identity documents." required><Textarea id="brief" rows={5} minLength={40} maxLength={4000} required value={form.brief} onChange={e => set('brief', e.target.value)} /></Field><Field id="reason" label="Why do you need this service?" hint="At least 20 characters." required><Textarea id="reason" minLength={20} maxLength={2000} required value={form.reason} onChange={e => set('reason', e.target.value)} /></Field><details className="border-y border-border py-4"><summary className="cursor-pointer font-semibold">Offer terms & privacy</summary><ul className="mt-4 list-disc space-y-3 pl-5 text-sm text-muted-foreground">{offerTerms.map(t => <li key={t}>{t}</li>)}</ul></details>{([['terms_accepted', 'I accept these offer terms, limits and eligibility rules, including unconfirmed activation and renewal details.'], ['contact_consent', 'I consent to my details being used for application review and delivery contact.']] as const).map(([key, label]) => <label key={key} className="flex items-start gap-3 text-sm"><Checkbox className="mt-0.5" checked={form[key]} onCheckedChange={v => set(key, v === true)} /><span>{label}</span></label>)}<Button variant="brand" type="submit" disabled={busy}>{busy ? 'Saving…' : 'Submit free application'}</Button></fieldset></form>}
    {error ? <p role="alert" className="mt-4 text-sm text-destructive">{error}</p> : null}<Link to="/socilet/offers" className="mt-6 inline-block text-sm text-primary underline">All offers & terms</Link>
    <section className="mt-8 border-t border-border pt-5"><h2 className="font-display text-lg font-bold">My offer applications</h2>{query.data?.map(a => <p key={a.id} className="mt-3 text-sm">{getOffer(a.offer_key).title} · {a.status.replaceAll('_', ' ')}</p>)}</section></div></AppShell>;
}