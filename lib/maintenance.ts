import { createServiceClient } from './supabase';
import { getAuthUser } from './auth';

export async function isMaintenanceMode(): Promise<boolean> {
  try {
    const sb = createServiceClient();
    const { data } = await sb
      .from('settings')
      .select('value')
      .eq('key', 'MAINTENANCE_MODE')
      .maybeSingle();
    
    return data?.value === 'true';
  } catch {
    return false;
  }
}

export async function isAdminUser(): Promise<boolean> {
  try {
    const user = await getAuthUser();
    if (!user) return false;
    
    const sb = createServiceClient();
    const { data } = await sb
      .from('users')
      .select('is_admin')
      .eq('id', user.id)
      .maybeSingle();
    
    return data?.is_admin === true;
  } catch {
    return false;
  }
}

export async function shouldShowMaintenancePage(): Promise<boolean> {
  const maintenanceMode = await isMaintenanceMode();
  if (!maintenanceMode) return false;
  
  const isAdmin = await isAdminUser();
  return !isAdmin; // Show maintenance page only if not admin
}

