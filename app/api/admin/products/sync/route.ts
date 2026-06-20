import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin';
import { createServiceClient } from '@/lib/supabase';
import { getWepayServiceInfo, WepayError } from '@/lib/providers/wepay';

type WepayGame = {
  company_id: string;
  company_name: string;
  fee?: number;
  denomination?: Array<{ price: number; description: string | null }>;
  gameservers?: Array<{ value: string; name: string }>;
  refs_format?: { ref1?: string };
};

type WepayMtopup = {
  company_id: string;
  company_name: string;
  fee?: number;
  minimum_amount?: number;
  maximum_amount?: number;
  refundable?: boolean;
  denomination?: Array<{ price: number; description: string | null }>;
};

type WepayCashcard = {
  company_id: string;
  company_name: string;
  fee?: number;
  denomination?: Array<{ price: number; description: string | null }>;
};

const WEPAY_PRODUCTS_URL =
  process.env.WEPAY_PRODUCTS_URL ||
  'https://www.wepay.in.th/comp_export.php?json';

// Cache สำหรับ discount จาก API (cache ระหว่าง sync session)
let discountCache = new Map<string, number>();

// ส่วนลดตัวแทนที่ admin กำหนดไว้ใน product_agent_discounts (แหล่งข้อมูลหลัก เพราะ wePAY client_api
// ต้อง whitelist IP ของ production server เท่านั้น ถ้าเรียกจาก IP อื่นจะถูก Cloudflare บล็อกและ error เงียบๆ)
let agentDiscountOverrides = new Map<string, number>();

async function loadAgentDiscountOverrides() {
  try {
    const sb = createServiceClient();
    const { data, error } = await sb
      .from('product_agent_discounts')
      .select('provider_company_id, discount_percent');
    if (error) {
      console.warn('[ADMIN PRODUCTS][SYNC] Failed to load product_agent_discounts overrides:', error.message);
      return;
    }
    agentDiscountOverrides = new Map(
      (data || []).map((row: any) => [String(row.provider_company_id || '').trim().toUpperCase(), Number(row.discount_percent ?? 0)])
    );
  } catch (err) {
    console.warn('[ADMIN PRODUCTS][SYNC] Unexpected error loading agent discount overrides:', err);
  }
}

async function resolveAgentDiscountPercent(
  providerCompanyId: string | undefined | null,
  productType: 'gtopup' | 'mtopup' | 'cashcard' = 'gtopup'
): Promise<number> {
  if (!providerCompanyId) return 0;

  const cacheKey = `${productType}:${providerCompanyId}`;
  if (discountCache.has(cacheKey)) {
    return discountCache.get(cacheKey) ?? 0;
  }

  // 1. ดึงเปอร์เซ็นต์ส่วนลดจริงจาก wePAY API ก่อน (ต้องเรียกจาก IP ที่ wePAY whitelist ไว้เท่านั้น เช่น production server)
  try {
    const serviceInfo = await getWepayServiceInfo(productType, providerCompanyId);
    if (serviceInfo.discount !== undefined && serviceInfo.discount !== null) {
      const discount = Number(serviceInfo.discount);
      discountCache.set(cacheKey, discount);
      void persistAgentDiscountOverride(providerCompanyId, discount);
      return discount;
    }
  } catch (err) {
    console.warn(`[ADMIN PRODUCTS][SYNC] Failed to get service info for ${providerCompanyId} from wePAY, falling back to saved override:`, err instanceof WepayError ? err.message : 'Unknown error');
  }

  // 2. ถ้าเรียก wePAY ไม่ได้ (เช่น IP ไม่ได้ whitelist) ใช้ค่าที่บันทึกไว้ล่าสุดใน product_agent_discounts แทน
  const overrideKey = providerCompanyId.trim().toUpperCase();
  if (agentDiscountOverrides.has(overrideKey)) {
    const fallback = agentDiscountOverrides.get(overrideKey) ?? 0;
    discountCache.set(cacheKey, fallback);
    return fallback;
  }

  discountCache.set(cacheKey, 0);
  return 0;
}

async function persistAgentDiscountOverride(providerCompanyId: string, discountPercent: number) {
  try {
    const sb = createServiceClient();
    await sb.from('product_agent_discounts').upsert(
      {
        provider_company_id: providerCompanyId.trim(),
        discount_percent: discountPercent,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'provider_company_id' }
    );
  } catch (err) {
    console.warn(`[ADMIN PRODUCTS][SYNC] Failed to persist agent discount override for ${providerCompanyId}:`, err);
  }
}

function computeAgentCost(basePrice: number, discountPercent: number) {
  if (!discountPercent) return basePrice;
  const discounted = basePrice * (1 - discountPercent / 100);
  return Number(discounted.toFixed(4));
}

function slugifyCompany(companyId: string, companyName: string) {
  if (companyId) {
    return companyId.toLowerCase();
  }
  return companyName
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'gtopup-item';
}

function stripHtml(text?: string | null) {
  if (!text) return null;
  return text.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
}

function priceToSku(companyId: string, price: number) {
  const normalized = Number(price || 0);
  const formatted = Number.isInteger(normalized) ? normalized.toString() : normalized.toFixed(2);
  return `${companyId}-${formatted}`;
}

function sanitizeRegex(raw?: string | null) {
  if (!raw) return '';
  let trimmed = raw.trim();
  if (/^\/.*\/[a-z]*$/i.test(trimmed)) {
    const match = trimmed.match(/^\/(.*)\/[a-z]*$/i);
    if (match) {
      trimmed = match[1];
    }
  } else {
    if (trimmed.startsWith('/')) trimmed = trimmed.slice(1);
    if (trimmed.endsWith('/')) trimmed = trimmed.slice(0, -1);
  }
  return trimmed;
}

function buildUidRegex(raw?: string | null, hasServer?: boolean) {
  const cleaned = sanitizeRegex(raw) || '^.+$';
  if (!hasServer) return cleaned;
  const splitIndex = (() => {
    const spaceIndex = cleaned.indexOf(' ');
    const slashSIndex = cleaned.indexOf('\\s');
    const candidates = [spaceIndex, slashSIndex].filter((idx) => idx >= 0);
    if (!candidates.length) return -1;
    return Math.min(...candidates);
  })();
  if (splitIndex === -1) return cleaned;
  let uidPart = cleaned.slice(0, splitIndex).trim();
  if (!uidPart.endsWith('$')) {
    uidPart = `${uidPart}$`;
  }
  return uidPart;
}

async function performSync(productType: 'gtopup' | 'mtopup' | 'cashcard' | null, selectedCompanyIds: string[] | null) {
  discountCache.clear();
  await loadAgentDiscountOverrides();

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 300000);

  try {
    const upstream = await fetch(WEPAY_PRODUCTS_URL, { 
      cache: 'no-store',
      signal: controller.signal 
    });
    if (!upstream.ok) {
      clearTimeout(timeoutId);
      console.error('[wePAY sync] fetch failed', upstream.status, upstream.statusText);
      return NextResponse.json({ error: 'fetch_failed', detail: 'ไม่สามารถดึงข้อมูลจาก wePAY ได้' }, { status: upstream.status || 500 });
    }
    const payload = await upstream.json();
    clearTimeout(timeoutId);
    
    const gtopupProducts: WepayGame[] = Array.isArray(payload?.data?.gtopup) ? payload.data.gtopup : [];
    const mtopupProducts: WepayMtopup[] = Array.isArray(payload?.data?.mtopup) ? payload.data.mtopup : [];
    const cashcardProducts: WepayCashcard[] = Array.isArray(payload?.data?.cashcard) ? payload.data.cashcard : [];
    
    let targetGtopup: WepayGame[] = [];
    let targetMtopup: WepayMtopup[] = [];
    let targetCashcard: WepayCashcard[] = [];
    
    if (productType === 'gtopup') {
      targetGtopup = gtopupProducts;
      if (selectedCompanyIds && selectedCompanyIds.length > 0) {
        const selectedSet = new Set(selectedCompanyIds);
        targetGtopup = targetGtopup.filter((g) => selectedSet.has(g.company_id));
      }
    } else if (productType === 'mtopup') {
      targetMtopup = mtopupProducts;
      if (selectedCompanyIds && selectedCompanyIds.length > 0) {
        const selectedSet = new Set(selectedCompanyIds);
        targetMtopup = targetMtopup.filter((g) => selectedSet.has(g.company_id));
      }
    } else if (productType === 'cashcard') {
      targetCashcard = cashcardProducts;
      if (selectedCompanyIds && selectedCompanyIds.length > 0) {
        const selectedSet = new Set(selectedCompanyIds);
        targetCashcard = targetCashcard.filter((g) => selectedSet.has(g.company_id));
      }
    } else {
      targetGtopup = gtopupProducts;
      targetMtopup = mtopupProducts;
      targetCashcard = cashcardProducts;
    }
    
    if (!targetGtopup.length && !targetMtopup.length && !targetCashcard.length) {
      return NextResponse.json({ error: 'empty_products', detail: 'ไม่พบข้อมูล products จาก wePAY' }, { status: 502 });
    }

    const targetProductType = productType || 'all';
    const sb = createServiceClient();
    let countProducts = 0;
    let countItems = 0;
    let countInputs = 0;
    let countOptions = 0;
    let countRepriced = 0;

    if (targetProductType === 'all') {
    await sb.from('settings').upsert(
      [
      { key: 'PRICING_MARKUP_PERCENT', value: '0' },
      { key: 'PRICING_MARKUP_FIXED', value: '0' }
      ],
      { onConflict: 'key' }
    );

    await sb
      .from('product_items')
      .update({
      markup_percent: 0,
      markup_fixed: 0
      })
      .neq('id', 0);
    } else {
      const { data: targetProducts } = await sb
        .from('products')
        .select('id')
        .eq('product_type', targetProductType);
      
      if (targetProducts && targetProducts.length > 0) {
        const productIds = targetProducts.map(p => p.id);
        await sb
          .from('product_items')
          .update({
            markup_percent: 0,
            markup_fixed: 0
          })
          .in('product_id', productIds);
      }
    }

    let existingItemQuery = sb
      .from('product_items')
      .select('id, product_id, sku, price, products!inner(product_type)');
    
    if (targetProductType !== 'all') {
      existingItemQuery = existingItemQuery.eq('products.product_type', targetProductType);
    }
    
    const { data: existingItemRows, error: existingItemsError } = await existingItemQuery;
    if (existingItemsError) {
      return NextResponse.json({ error: 'db_error', detail: existingItemsError.message }, { status: 500 });
    }

    const existingItemMap = new Map<string, { id: number; price: number }>();
    for (const row of existingItemRows || []) {
      const sku = row.sku as string | null;
      const productId = Number(row.product_id);
      if (!sku || !productId) continue;
      existingItemMap.set(`${productId}::${sku}`, { id: row.id as number, price: Number(row.price ?? 0) });
    }

    const keepProductKeys = new Set<string>();
    const keepInputKeys = new Set<string>();
    const processedItemKeys = new Set<string>();

    for (const product of targetGtopup) {
      if (!product?.company_id) continue;
      const providerCompanyId = product.company_id.trim();
      const productKey = slugifyCompany(providerCompanyId, product.company_name || providerCompanyId);
      keepProductKeys.add(productKey);
      const cleanedName = product.company_name?.trim() || providerCompanyId;

      const { data: upsertedProduct, error: productUpsertError } = await sb
        .from('products')
        .upsert(
          {
            key: productKey,
            name: cleanedName,
            provider_company_id: providerCompanyId,
            product_type: 'gtopup'
          },
          { onConflict: 'key' }
        )
        .select('id, key')
        .single();

      if (productUpsertError) {
        console.error('Product upsert error:', productUpsertError);
        continue;
      }
      if (!upsertedProduct) continue;
      countProducts++;

      for (const denom of product.denomination || []) {
        if (typeof denom?.price !== 'number') continue;
        const providerItemKey = `${providerCompanyId}::${denom.price}`;
        if (processedItemKeys.has(providerItemKey)) continue;
        processedItemKeys.add(providerItemKey);

        const priceValue = Number(denom.price);
        const sku = priceToSku(providerCompanyId, priceValue);
        const itemName = stripHtml(denom.description) || `${priceValue} บาท`;
        const existingKey = `${upsertedProduct.id}::${sku}`;
        const existingItem = existingItemMap.get(existingKey);
        const discountPercent = await resolveAgentDiscountPercent(providerCompanyId, 'gtopup');
        const agentCost = computeAgentCost(priceValue, discountPercent);

        if (existingItem) {
          const { error: updateError } = await sb
            .from('product_items')
            .update({
              name: itemName,
              sku,
              price: agentCost,
              original_price: priceValue,
              agent_discount_percent: discountPercent,
              agent_cost_price: agentCost,
              markup_percent: 0,
              markup_fixed: 0
            })
            .eq('id', existingItem.id);
          if (updateError) {
            console.error('Product item update error', updateError);
            continue;
          }
          if (existingItem.price !== priceValue) {
            countRepriced++;
          }
          existingItemMap.delete(existingKey);
        } else {
          const { error: insertError } = await sb.from('product_items').insert({
              product_id: upsertedProduct.id,
            name: itemName,
            sku,
            price: agentCost,
            original_price: priceValue,
            agent_discount_percent: discountPercent,
            agent_cost_price: agentCost,
              markup_percent: 0,
              markup_fixed: 0
            });
          if (insertError) {
            console.error('Product item insert error', insertError);
            continue;
          }
          countRepriced++;
        }
        countItems++;
      }

      const hasServer = Array.isArray(product.gameservers) && product.gameservers.length > 0;
      const uidRegex = buildUidRegex(product.refs_format?.ref1, hasServer);
      const { data: uidInput, error: uidError } = await sb
          .from('product_inputs')
        .upsert(
          {
            product_id: upsertedProduct.id,
            key: 'uid',
            title: 'UID ผู้เล่น',
            regex: uidRegex,
            type: 'text',
            placeholder: 'กรอก UID ตามในเกม'
          },
          { onConflict: 'product_id,key' }
        )
          .select('id, key')
          .single();
      if (uidError) {
        console.error('UID input upsert error:', uidError);
      } else {
        keepInputKeys.add(`${productKey}::uid`);
        countInputs++;
      }

      if (hasServer) {
        const { data: serverInput, error: serverError } = await sb
            .from('product_inputs')
          .upsert(
            {
              product_id: upsertedProduct.id,
              key: 'server',
              title: 'เซิร์ฟเวอร์',
              regex: '',
              type: 'select',
              placeholder: 'เลือกเซิร์ฟเวอร์'
            },
            { onConflict: 'product_id,key' }
          )
            .select('id, key')
            .single();
        if (serverError) {
          console.error('Server input upsert error:', serverError);
        } else if (serverInput?.id) {
          keepInputKeys.add(`${productKey}::server`);
          countInputs++;
          await sb.from('product_input_options').delete().eq('input_id', serverInput.id);
          const options = (product.gameservers || []).map((server) => ({
            input_id: serverInput.id,
            label: server.name,
            value: server.value
          }));
          if (options.length) {
            const { error: optionError } = await sb.from('product_input_options').insert(options);
            if (optionError) {
              console.error('Server option insert error:', optionError);
            } else {
              countOptions += options.length;
            }
          }
        }
      }
    }

    for (const product of targetMtopup) {
      if (!product?.company_id) continue;
      const providerCompanyId = product.company_id.trim();
      const productKey = slugifyCompany(providerCompanyId, product.company_name || providerCompanyId);
      keepProductKeys.add(productKey);
      const cleanedName = product.company_name?.trim() || providerCompanyId;

      const { data: upsertedProduct, error: productUpsertError } = await sb
        .from('products')
        .upsert(
          {
            key: productKey,
            name: cleanedName,
            provider_company_id: providerCompanyId,
            product_type: 'mtopup'
          },
          { onConflict: 'key' }
        )
        .select('id, key')
        .single();

      if (productUpsertError) {
        console.error('Product upsert error:', productUpsertError);
        continue;
      }
      if (!upsertedProduct) continue;
      countProducts++;

      for (const denom of product.denomination || []) {
        if (typeof denom?.price !== 'number') continue;
        const providerItemKey = `${providerCompanyId}::${denom.price}`;
        if (processedItemKeys.has(providerItemKey)) continue;
        processedItemKeys.add(providerItemKey);

        const priceValue = Number(denom.price);
        const sku = priceToSku(providerCompanyId, priceValue);
        const itemName = stripHtml(denom.description) || `${priceValue} บาท`;
        const existingKey = `${upsertedProduct.id}::${sku}`;
        const existingItem = existingItemMap.get(existingKey);
        const discountPercent = await resolveAgentDiscountPercent(providerCompanyId, 'mtopup');
        const agentCost = computeAgentCost(priceValue, discountPercent);

        if (existingItem) {
          const { error: updateError } = await sb
            .from('product_items')
            .update({
              name: itemName,
              sku,
              price: agentCost,
              original_price: priceValue,
              agent_discount_percent: discountPercent,
              agent_cost_price: agentCost,
              markup_percent: 0,
              markup_fixed: 0
            })
            .eq('id', existingItem.id);
          if (updateError) {
            console.error('Product item update error', updateError);
            continue;
          }
          if (existingItem.price !== priceValue) {
            countRepriced++;
          }
          existingItemMap.delete(existingKey);
        } else {
          const { error: insertError } = await sb.from('product_items').insert({
            product_id: upsertedProduct.id,
            name: itemName,
            sku,
            price: agentCost,
            original_price: priceValue,
            agent_discount_percent: discountPercent,
            agent_cost_price: agentCost,
            markup_percent: 0,
            markup_fixed: 0
          });
          if (insertError) {
            console.error('Product item insert error', insertError);
            continue;
          }
          countRepriced++;
        }
        countItems++;
      }

      const { data: phoneInput, error: phoneError } = await sb
        .from('product_inputs')
        .upsert(
          {
            product_id: upsertedProduct.id,
            key: 'phone_number',
            title: 'เบอร์โทรศัพท์',
            regex: '^0[0-9]{9}$',
            type: 'text',
            placeholder: 'กรอกเบอร์โทรศัพท์ 10 หลัก'
          },
          { onConflict: 'product_id,key' }
        )
        .select('id, key')
        .single();
      if (phoneError) {
        console.error('Phone input upsert error:', phoneError);
      } else {
        keepInputKeys.add(`${productKey}::phone_number`);
        countInputs++;
      }
    }

    for (const product of targetCashcard) {
      if (!product?.company_id) continue;
      const providerCompanyId = product.company_id.trim();
      const productKey = slugifyCompany(providerCompanyId, product.company_name || providerCompanyId);
      keepProductKeys.add(productKey);
      const cleanedName = product.company_name?.trim() || providerCompanyId;

      const { data: upsertedProduct, error: productUpsertError } = await sb
        .from('products')
        .upsert(
          {
            key: productKey,
            name: cleanedName,
            provider_company_id: providerCompanyId,
            product_type: 'cashcard'
          },
          { onConflict: 'key' }
        )
        .select('id, key')
        .single();

      if (productUpsertError) {
        console.error('Product upsert error:', productUpsertError);
        continue;
      }
      if (!upsertedProduct) continue;
      countProducts++;

      for (const denom of product.denomination || []) {
        if (typeof denom?.price !== 'number') continue;
        const providerItemKey = `${providerCompanyId}::${denom.price}`;
        if (processedItemKeys.has(providerItemKey)) continue;
        processedItemKeys.add(providerItemKey);

        const priceValue = Number(denom.price);
        const sku = priceToSku(providerCompanyId, priceValue);
        const itemName = stripHtml(denom.description) || `${priceValue} บาท`;
        const existingKey = `${upsertedProduct.id}::${sku}`;
        const existingItem = existingItemMap.get(existingKey);
        const discountPercent = await resolveAgentDiscountPercent(providerCompanyId, 'cashcard');
        const agentCost = computeAgentCost(priceValue, discountPercent);

        if (existingItem) {
          const { error: updateError } = await sb
            .from('product_items')
            .update({
              name: itemName,
              sku,
              price: agentCost,
              original_price: priceValue,
              agent_discount_percent: discountPercent,
              agent_cost_price: agentCost,
              markup_percent: 0,
              markup_fixed: 0
            })
            .eq('id', existingItem.id);
          if (updateError) {
            console.error('Product item update error', updateError);
            continue;
          }
          if (existingItem.price !== priceValue) {
            countRepriced++;
          }
          existingItemMap.delete(existingKey);
        } else {
          const { error: insertError } = await sb.from('product_items').insert({
            product_id: upsertedProduct.id,
            name: itemName,
            sku,
            price: agentCost,
            original_price: priceValue,
            agent_discount_percent: discountPercent,
            agent_cost_price: agentCost,
            markup_percent: 0,
            markup_fixed: 0
          });
          if (insertError) {
            console.error('Product item insert error', insertError);
            continue;
          }
          countRepriced++;
        }
        countItems++;
      }
    }

    const { data: existingProducts } = await sb
      .from('products')
      .select('id, key, product_type');
    
    for (const ep of existingProducts || []) {
      const epType = (ep as any).product_type as string;
      if (targetProductType === 'all') {
      if (!keepProductKeys.has(ep.key)) {
        await sb.from('products').delete().eq('id', ep.id);
        }
      } else {
        if (epType === targetProductType && !keepProductKeys.has(ep.key)) {
          await sb.from('products').delete().eq('id', ep.id);
        }
      }
    }

    const { data: existingInputs } = await sb
      .from('product_inputs')
      .select('id, key, product_id, products!inner(key)');
    for (const ei of existingInputs || []) {
      const productKey = (ei as any).products.key as string;
      if (!keepInputKeys.has(`${productKey}::${ei.key}`)) {
        await sb.from('product_inputs').delete().eq('id', ei.id);
      }
    }

    for (const leftover of existingItemMap.values()) {
      await sb.from('product_items').delete().eq('id', leftover.id);
    }

    return NextResponse.json({
      ok: true,
      counts: {
        products: countProducts,
        items: countItems,
        inputs: countInputs,
        options: countOptions,
        pricesReplaced: countRepriced
      }
    });
  } catch (e) {
    if ((e as any)?.name === 'AbortError') {
      console.error('wePAY sync timeout');
      return NextResponse.json({ 
        error: 'timeout', 
        detail: 'การ Sync ใช้เวลานานเกินไป กรุณาลองใหม่อีกครั้ง' 
      }, { status: 504 });
    }
    console.error('wePAY sync error:', e);
    return NextResponse.json({ 
      error: 'unexpected', 
      detail: e instanceof Error ? e.message : 'เกิดข้อผิดพลาด' 
    }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  try {
    const { searchParams } = new URL(req.url);
    const productType = searchParams.get('product_type') as 'gtopup' | 'mtopup' | 'cashcard' | null;
    
    let selectedCompanyIds: string[] | null = null;
    try {
      const bodyText = await req.text();
      if (bodyText && bodyText.trim()) {
        const body = JSON.parse(bodyText);
        if (body && Array.isArray(body.company_ids) && body.company_ids.length > 0) {
          selectedCompanyIds = body.company_ids;
        }
      }
    } catch {
      // ถ้าไม่มี body หรือ parse ไม่ได้ ให้ใช้ null
    }
    
    // เรียก internal function แทน external fetch
    return await performSync(productType, selectedCompanyIds);
  } catch (err) {
    console.error('Sync error:', err);
    if ((err as any)?.name === 'AbortError' || (err as any)?.message?.includes('timeout')) {
      return NextResponse.json({ 
        error: 'timeout', 
        detail: 'การ Sync ใช้เวลานานเกินไป กรุณาลองใหม่อีกครั้ง' 
      }, { status: 504 });
    }
    return NextResponse.json({ 
      error: 'unexpected', 
      detail: err instanceof Error ? err.message : 'เกิดข้อผิดพลาด' 
    }, { status: 500 });
  }
}

