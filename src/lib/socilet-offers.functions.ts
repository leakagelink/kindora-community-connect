import { createServerFn } from '@tanstack/react-start';
import type { SupabaseClient } from '@supabase/supabase-js';
import { z } from 'zod';
import { requireSupabaseAuth } from '@/integrations/supabase/auth-middleware';
import { offerKeys, offerSchema, offerStatuses, type OfferApplication } from './socilet-offer-rules';

export const submitOffer = createServerFn({ method: 'POST' }).middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => z.object({ offer: z.enum(offerKeys), payload: offerSchema }).parse(data))
  .handler(async ({ data, context }): Promise<OfferApplication> => {
    const result = await (context.supabase as SupabaseClient).rpc('submit_socilet_offer', { p_offer: data.offer, p_payload: data.payload });
    if (result.error) {
      if (result.error.message.includes('Application limit reached')) throw new Error('This offer has reached its application limit.');
      if (result.error.code === '23505') throw new Error('This email already has an application for this offer. Check My Applications or contact support.');
      throw new Error('Your application could not be saved. Your details have not been cleared; please retry.');
    }
    if (!result.data?.id) throw new Error('Saving was not confirmed. Check My Applications before retrying.');
    return result.data;
  });
export const getOfferApplications = createServerFn({ method: 'GET' }).middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<OfferApplication[]> => {
    const result = await (context.supabase as SupabaseClient).from('socilet_offer_applications').select('*').eq('user_id', context.userId).order('created_at', { ascending: false }).limit(3);
    if (result.error) throw new Error('Offer applications could not be loaded. Please retry.');
    return result.data ?? [];
  });
export const getOfferAdmin = createServerFn({ method: 'GET' }).middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => z.object({ page: z.number().int().min(0).max(10000) }).parse(data))
  .handler(async ({ data, context }) => {
    const role = await context.supabase.rpc('has_role', { _user_id: context.userId, _role: 'admin' });
    if (role.error || !role.data) throw new Error('Administrator access required.');
    const result = await (context.supabase as SupabaseClient).from('socilet_offer_applications').select('*', { count: 'exact' }).order('created_at', { ascending: false }).range(data.page * 20, data.page * 20 + 19);
    if (result.error) throw new Error('Offer review could not be loaded. Please retry.');
    return { rows: (result.data ?? []) as OfferApplication[], count: result.count ?? 0 };
  });
export const reviewOffer = createServerFn({ method: 'POST' }).middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => z.object({ id: z.string().uuid(), status: z.enum(offerStatuses), note: z.string().trim().min(5).max(2000) }).parse(data))
  .handler(async ({ data, context }) => {
    const result = await (context.supabase as SupabaseClient).rpc('review_socilet_offer', { p_id: data.id, p_status: data.status, p_note: data.note });
    if (result.error) {
      if (result.error.message.includes('Award limit')) throw new Error('This offer has reached its recipient limit.');
      if (result.error.message.includes('Approve before')) throw new Error('Approve the application before marking it delivered.');
      if (result.error.message.includes('cannot be')) throw new Error('Allocated or delivered awards cannot be removed or reopened.');
      throw new Error('Review could not be saved. Administrator access is required.');
    }
    return { saved: true };
  });