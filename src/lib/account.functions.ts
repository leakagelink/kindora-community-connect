import { createServerFn } from '@tanstack/react-start';
import { requireSupabaseAuth } from '@/integrations/supabase/auth-middleware';
export const withdrawAccount = createServerFn({ method: 'POST' }).middleware([requireSupabaseAuth]).handler(async ({ context }) => {
  const result = await context.supabase.rpc('withdraw_goodivo_account');
  if (result.error) throw new Error('Account withdrawal failed. No withdrawal changes were committed. Please retry.');
  return { withdrawn: true };
});