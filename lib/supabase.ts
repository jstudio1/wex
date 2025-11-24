import { createClient } from '@supabase/supabase-js';

export const supabaseUrl = process.env.SUPABASE_URL;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;

// ไม่ throw error ตอน build time (module load time)
// จะ throw ตอน runtime แทน
export const supabase = (() => {
if (!supabaseUrl || !supabaseAnonKey) {
    // Return a dummy client during build, will fail at runtime if not set
    return createClient(
      supabaseUrl || 'https://placeholder.supabase.co',
      supabaseAnonKey || 'placeholder-key',
      { auth: { persistSession: false } }
    );
  }
  return createClient(supabaseUrl as string, supabaseAnonKey as string, {
  auth: { persistSession: false }
});
})();

export function createServiceClient() {
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE;
  if (!serviceKey) {
    throw new Error('SUPABASE_SERVICE_ROLE is not set');
  }
  if (!supabaseUrl) {
    throw new Error('SUPABASE_URL is not set');
  }
  if (process.env.NODE_ENV !== 'production') {
    console.log('[supabase] createServiceClient using URL', supabaseUrl);
  }
  return createClient(supabaseUrl as string, serviceKey, { auth: { persistSession: false } });
}


