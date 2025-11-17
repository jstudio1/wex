import { createServiceClient } from './supabase';

export async function getGlobalMarkup() {
  const sb = createServiceClient();
  const { data } = await sb.from('settings').select('key, value').in('key', ['PRICING_MARKUP_PERCENT', 'PRICING_MARKUP_FIXED']);
  const map = new Map<string, string>();
  for (const row of data || []) map.set(row.key as string, row.value as string);
  const pct = Number(map.get('PRICING_MARKUP_PERCENT') || '0');
  const fix = Number(map.get('PRICING_MARKUP_FIXED') || '0');
  return { pct, fix };
}

export function computePrice(base: number, itemPct = 0, itemFix = 0, globalPct = 0, globalFix = 0) {
  const withItem = base * (1 + itemPct / 100) + itemFix;
  const withGlobal = withItem * (1 + globalPct / 100) + globalFix;
  return Math.max(0, withGlobal);
}



