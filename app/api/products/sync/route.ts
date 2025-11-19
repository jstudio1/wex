import { NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase';
import wepayCatalog from '../../../../wepay.json';

type WepayGame = {
  company_id: string;
  company_name: string;
  fee?: number;
  denomination?: Array<{ price: number; description: string | null }>;
  gameservers?: Array<{ value: string; name: string }>;
  refs_format?: { ref1?: string };
};

const gtopupProducts: WepayGame[] = ((wepayCatalog as any)?.data?.gtopup || []) as WepayGame[];

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

export async function POST(req: Request) {
  const auth = req.headers.get('authorization');
  if (!auth || auth !== `Bearer ${process.env.WEBHOOK_SECRET}`) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  try {
    const sb = createServiceClient();
    let countProducts = 0;
    let countItems = 0;
    let countInputs = 0;
    let countOptions = 0;
    let countRepriced = 0;

    // รีเซ็ต Global Markup เป็น 0
    await sb.from('settings').upsert(
      [
      { key: 'PRICING_MARKUP_PERCENT', value: '0' },
      { key: 'PRICING_MARKUP_FIXED', value: '0' }
      ],
      { onConflict: 'key' }
    );

    // รีเซ็ต Item Markup ทั้งหมดเป็น 0
    await sb
      .from('product_items')
      .update({
      markup_percent: 0,
      markup_fixed: 0
      })
      .neq('id', 0);

    const { data: existingItemRows, error: existingItemsError } = await sb
      .from('product_items')
      .select('id, product_id, sku, price');
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

    for (const product of gtopupProducts) {
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
            provider_company_id: providerCompanyId
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

        if (existingItem) {
          const { error: updateError } = await sb
            .from('product_items')
            .update({
              name: itemName,
              sku,
              price: priceValue,
              original_price: priceValue,
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
            price: priceValue,
            original_price: priceValue,
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

    const { data: existingProducts } = await sb.from('products').select('id, key');
    for (const ep of existingProducts || []) {
      if (!keepProductKeys.has(ep.key)) {
        await sb.from('products').delete().eq('id', ep.id);
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
    console.error('wePAY sync error:', e);
    return NextResponse.json({ error: 'unexpected' }, { status: 500 });
  }
}
