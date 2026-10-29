import { createServerFn } from '@tanstack/react-start';
import { requireSupabaseAuth } from '@/integrations/supabase/auth-middleware';
export const withdrawAccount = createServerFn({ method: 'POST' }).middleware([requireSupabaseAuth]).handler(async ({ context }) => {
  const result = await context.supabase.rpc('withdraw_goodivo_account');
  if (result.error) throw new Error('Account withdrawal failed. No withdrawal changes were committed. Please retry.');
  return { withdrawn: true };
});

export const requestAccountDeletion = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const identity = await context.supabase.auth.getUser();
    if (identity.error || !identity.data.user?.email_confirmed_at) throw new Error('Verify your email before requesting deletion.');
    const result = await context.supabase.rpc('request_goodivo_account_deletion');
    if (result.error || !result.data) throw new Error('Your deletion request could not be saved. Please retry.');
    return { requestId: result.data, status: 'requested' as const };
  });