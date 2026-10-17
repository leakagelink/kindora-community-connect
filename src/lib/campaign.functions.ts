import { createServerFn } from '@tanstack/react-start';
import { z } from 'zod';
import type { SupabaseClient } from '@supabase/supabase-js';
import { requireSupabaseAuth } from '@/integrations/supabase/auth-middleware';
import { campaignSchema, campaignStatuses, type CampaignApplication } from './campaign-rules';
function check(error: { code?: string; message: string } | null) {
  if (!error) return;
  if (['42P01', 'PGRST202', 'PGRST205'].includes(error.code ?? '')) throw new Error('Campaign applications are temporarily unavailable. Your entered details have not been cleared. Please try again later.');
  if (error.code === '23505') throw new Error('An application already exists for these details. Check My Applications or contact support.');
  throw new Error('The application could not be saved or loaded. Please retry; your entered details have not been cleared.');
}
export const submitCampaign = createServerFn({ method: 'POST' }).middleware([requireSupabaseAuth]).inputValidator((data: unknown) => campaignSchema.parse(data)).handler(async ({ data, context }): Promise<CampaignApplication> => {
  const result = await (context.supabase as SupabaseClient).rpc('submit_socilet_application', { p_payload: data });
  check(result.error); if (!result.data?.id) throw new Error('Saving was not confirmed. Please check My Applications before retrying.');
  return result.data;
});
export const getCampaignApplications = createServerFn({ method: 'GET' }).middleware([requireSupabaseAuth]).handler(async ({ context }): Promise<CampaignApplication[]> => {
  const result = await (context.supabase as SupabaseClient).from('campaign_applications').select('*').eq('user_id', context.userId).eq('campaign_key', 'socilet50').order('created_at', { ascending: false }).limit(20);
  check(result.error); return result.data ?? [];
});
export const getCampaignAdmin = createServerFn({ method: 'GET' }).middleware([requireSupabaseAuth]).inputValidator((data: unknown) => z.object({ page: z.number().int().min(0).max(100000) }).parse(data)).handler(async ({ data, context }) => {
  const role = await context.supabase.rpc('has_role', { _user_id: context.userId, _role: 'admin' });
  if (role.error || !role.data) throw new Error('Administrator access required.');
  const result = await (context.supabase as SupabaseClient).from('campaign_applications').select('*', { count: 'exact' }).eq('campaign_key', 'socilet50').order('created_at', { ascending: false }).range(data.page * 20, data.page * 20 + 19);
  check(result.error); return { rows: (result.data ?? []) as CampaignApplication[], count: result.count ?? 0 };
});
export const reviewCampaign = createServerFn({ method: 'POST' }).middleware([requireSupabaseAuth]).inputValidator((data: unknown) => z.object({ id: z.string().uuid(), status: z.enum(campaignStatuses), note: z.string().trim().min(5).max(2000) }).parse(data)).handler(async ({ data, context }) => {
  const result = await (context.supabase as SupabaseClient).rpc('review_socilet_application', { p_id: data.id, p_status: data.status, p_note: data.note });
  if (result.error?.message.includes('50')) throw new Error('The campaign has reached its 50 approved applications.');
  check(result.error); return { saved: true };
});
