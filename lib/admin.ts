import { getAuthUser } from './auth';
import { createServiceClient } from './supabase';

export async function requireAdmin() {
  const user = await getAuthUser();
  if (!user) return null;
  const sb = createServiceClient();
  const { data, error } = await sb
    .from('users')
    .select('id, username, is_admin')
    .eq('id', user.id)
    .maybeSingle();
  if (error || !data) return null;
  return data.is_admin ? { id: data.id, username: data.username } : null;
}


