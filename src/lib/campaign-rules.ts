import { z } from 'zod';
export const CAMPAIGN = { key: 'socilet50', places: 50, maxValue: 50000, developmentFee: 0, termsVersion: '2026-10-17' } as const;
export const campaignStatuses = ['submitted', 'under_review', 'approved', 'rejected', 'more_information_required'] as const;
export const campaignSchema = z.object({
  full_name: z.string().trim().min(2).max(100), business_name: z.string().trim().min(2).max(150),
  email: z.string().trim().email().max(255).transform(v => v.toLowerCase()),
  mobile: z.string().trim().regex(/^\+?[0-9 ()-]{7,25}$/, 'Enter a valid mobile number.').refine(v => v.replace(/\D/g, '').length >= 7 && v.replace(/\D/g, '').length <= 15, 'Enter 7–15 digits.'),
  website: z.union([z.literal(''), z.string().trim().url().max(500).refine(v => /^https?:\/\//i.test(v), 'Use an http or https link.')]),
  category: z.string().trim().min(2).max(100), service: z.enum(['Website', 'Web App', 'Mobile App', 'Other']),
  description: z.string().trim().min(40).max(4000), scope: z.string().trim().min(10).max(1000), reason: z.string().trim().min(20).max(2000),
  terms_accepted: z.literal(true), contact_consent: z.literal(true),
});
export type CampaignInput = z.infer<typeof campaignSchema>;
export type CampaignApplication = { id: string; user_id: string; campaign_key: string; payload: CampaignInput; status: typeof campaignStatuses[number]; review_note: string | null; created_at: string; updated_at: string };
export const campaignDisclosures = [
  'Only 50 qualifying businesses are intended to be selected. Applying does not guarantee selection.',
  'Approved development work may be worth less than ₹50,000. This offer is not cash.',
  'Domain, hosting, paid plugins, APIs and other third-party costs may apply.',
  'Selected participants must publish one genuine short-form video after project delivery.',
  'No positive review, scripted praise or guaranteed endorsement is required.',
];
export function campaignHead(title: string, description: string, privatePage = false) { return { meta: [{ title: `${title} — Goodivo` }, { name: 'description', content: description }, { property: 'og:title', content: `${title} — Goodivo` }, { property: 'og:description', content: description }, { property: 'og:type', content: 'website' }, { name: 'twitter:card', content: 'summary' }, ...(privatePage ? [{ name: 'robots', content: 'noindex' }] : [])] }; }
