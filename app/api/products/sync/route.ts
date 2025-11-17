import { NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase';
import { getApiKey } from '@/lib/api-keys';

const API_BASE = process.env.NEXT_PUBLIC_API_BASE || 'https://x.24payseller.com';

export async function POST(req: Request) {
  const auth = req.headers.get('authorization');
  if (!auth || auth !== `Bearer ${process.env.WEBHOOK_SECRET}`) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }
  const API_KEY = await getApiKey('API_KEY_24PAY');
  if (!API_KEY) return NextResponse.json({ error: 'missing_api_key' }, { status: 500 });

  try {
    let countProducts = 0;
    let countItems = 0;
    let countInputs = 0;
    let countOptions = 0;
    let countRepriced = 0;
    const listRes = await fetch(`${API_BASE}/products/list`, {
      headers: { 'X-Api-Key': API_KEY }
    });
    if (!listRes.ok) return NextResponse.json({ error: 'upstream_error' }, { status: listRes.status });
    const products = (await listRes.json()) as any[];

    const sb = createServiceClient();

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

    // collect keys for cleanup
    const keepProductKeys = new Set<string>();
    const keepInputKeys = new Set<string>(); // product_key::input_key
    const keepOptionKeys = new Set<string>(); // input_id::value (fill later)
    const processedItemKeys = new Set<string>(); // provider_product_key::sku to dedupe within payload

    // upsert products, items, inputs, options
    for (const p of products) {
      keepProductKeys.add(p.key);
      const { data: upsertedProduct } = await sb
        .from('products')
        .upsert({ key: p.key, name: p.name }, { onConflict: 'key' })
        .select('id, key')
        .single();
      if (!upsertedProduct) continue;
      countProducts++;

      // items
      for (const it of p.items || []) {
        if (!it?.sku) continue;
        const providerItemKey = `${p.key}::${it.sku}`;
        if (processedItemKeys.has(providerItemKey)) continue;
        processedItemKeys.add(providerItemKey);
        const basePrice = Number(it.price ?? 0);
        const sourceOriginal = Number(it.originalPrice ?? it.price ?? 0);
        const existingKey = `${upsertedProduct.id}::${it.sku}`;
        const existingItem = existingItemMap.get(existingKey);

        if (existingItem) {
          const { error: updateError } = await sb
            .from('product_items')
            .update({
              name: it.name,
              price: basePrice,
              original_price: sourceOriginal
            })
            .eq('id', existingItem.id);
          if (updateError) {
            console.error('Product item update error', updateError);
            continue;
          }
          if (existingItem.price !== basePrice) {
            countRepriced++;
          }
          existingItemMap.delete(existingKey);
        } else {
          const { error: insertError } = await sb
            .from('product_items')
            .insert({
              product_id: upsertedProduct.id,
              name: it.name,
              sku: it.sku,
              price: basePrice,
              original_price: sourceOriginal
            });
          if (insertError) {
            if ((insertError as any)?.code === '23505') {
              const { data: existingRow, error: fetchError } = await sb
                .from('product_items')
                .select('id, price')
                .eq('product_id', upsertedProduct.id)
                .eq('sku', it.sku)
                .maybeSingle();
              if (fetchError) {
                console.error('Product item fetch-after-duplicate error', fetchError);
                continue;
              }
              if (existingRow) {
                const { error: retryError } = await sb
                  .from('product_items')
                  .update({
                    name: it.name,
                    price: basePrice,
                    original_price: sourceOriginal
                  })
                  .eq('id', existingRow.id);
                if (retryError) {
                  console.error('Product item retry update error', retryError);
                  continue;
                }
                if (Number(existingRow.price ?? 0) !== basePrice) {
                  countRepriced++;
                }
                existingItemMap.delete(existingKey);
                countItems++;
              }
              continue;
            }
            console.error('Product item insert error', insertError);
            continue;
          }
          countRepriced++;
        }
        countItems++;
      }

      // inputs
      const inputArray = p.inputs || [];
      // ถ้า upstream ไม่ส่ง inputs มาเลย ให้ใส่ default uid input
      if (inputArray.length === 0) {
        const { data: upsertedInput } = await sb
          .from('product_inputs')
          .upsert({
            product_id: upsertedProduct.id,
            key: 'uid',
            title: 'UID',
            regex: '',
            type: 'text',
            placeholder: 'UID'
          }, { onConflict: 'product_id,key' })
          .select('id, key')
          .single();
        keepInputKeys.add(`${p.key}::uid`);
        countInputs++;
      } else {
        // ถ้ามี inputs จาก upstream ใช้ตามปกติ
        for (const inp of inputArray) {
          const { data: upsertedInput } = await sb
            .from('product_inputs')
            .upsert({
              product_id: upsertedProduct.id,
              key: inp.key,
              title: inp.title,
              regex: inp.regex || '', // regex column เป็น NOT NULL ต้องใช้ empty string
              type: inp.type || 'text',
              placeholder: inp.placeholder || ''
            }, { onConflict: 'product_id,key' })
            .select('id, key')
            .single();
          keepInputKeys.add(`${p.key}::${inp.key}`);
          countInputs++;

          if (upsertedInput) {
            for (const opt of inp.options || []) {
              await sb
                .from('product_input_options')
                .upsert({
                  input_id: upsertedInput.id,
                  label: opt.label,
                  value: opt.value
                }, { onConflict: 'input_id,value' });
              keepOptionKeys.add(`${upsertedInput.id}::${opt.value}`);
              countOptions++;
            }
          }
        }
      }
    }

    // cleanup removed products/items/inputs/options (hard delete)
    // products
    const { data: existingProducts } = await sb.from('products').select('id, key');
    for (const ep of existingProducts || []) {
      if (!keepProductKeys.has(ep.key)) {
        await sb.from('products').delete().eq('id', ep.id);
      }
    }

    // inputs cleanup per product
    const { data: existingInputs } = await sb
      .from('product_inputs')
      .select('id, key, product_id, products!inner(key)');
    for (const ei of existingInputs || []) {
      const productKey = (ei as any).products.key as string;
      if (!keepInputKeys.has(`${productKey}::${ei.key}`)) {
        await sb.from('product_inputs').delete().eq('id', ei.id);
      }
    }

    // items cleanup per product
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
    return NextResponse.json({ error: 'unexpected' }, { status: 500 });
  }
}
