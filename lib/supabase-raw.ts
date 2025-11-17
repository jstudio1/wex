import { createServiceClient } from './supabase';

/**
 * Execute raw SQL query using Supabase service client
 * This bypasses schema cache issues
 */
export async function executeRawSQL(query: string, params: any[] = []) {
  const sb = createServiceClient();
  
  // Use Supabase's rpc to execute raw SQL if available
  // Otherwise, we'll need to use a different approach
  try {
    // Try using PostgREST's stored procedure approach
    // Note: This requires a database function to be created
    // For now, we'll use a workaround
    const result = await sb.rpc('exec_sql', { 
      query, 
      params 
    } as any);
    
    return { data: result.data, error: result.error };
  } catch (err) {
    return { data: null, error: err };
  }
}

/**
 * Update icon_url directly using REST API
 */
export async function updateProductIconUrl(productId: number, iconUrl: string | null) {
  const supabaseUrl = process.env.SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE;
  
  if (!supabaseUrl || !serviceKey) {
    throw new Error('Supabase configuration missing');
  }
  
  // Use PostgREST format: filter by id using query parameter
  const restUrl = `${supabaseUrl}/rest/v1/products?id=eq.${productId}`;
  
  console.log(`[supabase-raw] Updating icon_url for product ${productId} via REST API:`, iconUrl);
  console.log(`[supabase-raw] REST URL:`, restUrl);
  
  const response = await fetch(restUrl, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      'apikey': serviceKey,
      'Authorization': `Bearer ${serviceKey}`,
      'Prefer': 'return=minimal'
    },
    body: JSON.stringify({ icon_url: iconUrl })
  });
  
  const responseText = await response.text();
  
  if (!response.ok) {
    console.error(`[supabase-raw] REST API error:`, response.status, responseText);
    throw new Error(`REST API error: ${response.status} - ${responseText}`);
  }
  
  console.log(`[supabase-raw] Icon URL updated successfully for product ${productId}`);
  return { success: true };
}

