import { z } from 'zod';

export const SOCILET_OFFERS = [
  { key: 'logo', title: 'Free custom logo design', applicationLimit: 100, awardLimit: 100, freeYears: 0, description: 'A human-designed logo based on your brand, style, colours and design brief.' },
  { key: 'domain', title: 'Free domain for one year', applicationLimit: 200, awardLimit: 50, freeYears: 1, description: '50 domain awards, selected through business and project review from up to 200 applications.' },
  { key: 'hosting', title: 'Free business hosting for one year', applicationLimit: 100, awardLimit: 50, freeYears: 1, description: '50 business hosting awards, selected through business and project review from up to 100 applications.' },
] as const;
export const offerKeys = ['logo', 'domain', 'hosting'] as const;
export type OfferKey = typeof offerKeys[number];
export const offerStatuses = ['submitted', 'under_review', 'more_information_required', 'approved', 'delivered', 'rejected'] as const;
export const offerSchema = z.object({
  full_name: z.string().trim().min(2).max(100),
  business_name: z.string().trim().min(2).max(150),
  email: z.string().trim().email().max(255).transform(v => v.toLowerCase()),
  brief: z.string().trim().min(40).max(4000),
  reason: z.string().trim().min(20).max(2000),
  terms_accepted: z.literal(true), contact_consent: z.literal(true),
});
export type OfferApplication = {
  id: string; offer_key: OfferKey; user_id: string; payload: z.infer<typeof offerSchema>;
  status: typeof offerStatuses[number]; review_note: string | null; created_at: string; awarded_at: string | null;
};
export function getOffer(key: OfferKey) { return SOCILET_OFFERS.find(o => o.key === key) ?? SOCILET_OFFERS[0]; }
export function matchingOffers(search = '') {
  const term = search.trim().toLowerCase();
  return SOCILET_OFFERS.filter(o => `${o.title} ${o.description} Socilet digital services`.toLowerCase().includes(term));
}
export const offerTerms = [
  '₹0 to apply and receive the included service. No ads, tasks, purchases, app installs, ratings, reviews or promotional videos required.',
  'One application per account and contact email per offer. Applications close when the stated application limit is reached; no calendar deadline has been announced.',
  'Logo design covers all 100 valid applications. Include your preferred style and colours; deliverables, revisions and schedule are agreed before work starts. Illegal or infringing requests cannot be fulfilled; trademark clearance is not guaranteed.',
  'Domain and hosting selection is based on business/project fit, legitimate intended use and technical feasibility, not a random draw. Applying does not guarantee selection. Approval and any requests for information are shown privately.',
  'Selected domain and hosting awards include one year from activation. Provider, supported domain extensions, hosting resources, ownership/transfer and post-year renewal terms are not yet confirmed. These must be disclosed and accepted before activation; no automatic paid renewal is authorized by this application.',
  'Your name, business name, email and project brief are used for review and delivery contact. Do not submit passwords, identity documents or other sensitive information. No applicant list is public. Any provider data sharing requires a separate disclosure before activation.',
  'These are independent Socilet offers, not Google-sponsored or Google-certified campaigns. They do not change access to other free Goodivo help.',
];