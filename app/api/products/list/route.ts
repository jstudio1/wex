import { NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase';
import { getGlobalMarkup, computePrice } from '@/lib/pricing';

export async function GET() {
  try {
    const sb = createServiceClient();
    const { pct: gpct, fix: gfix } = await getGlobalMarkup();
    
    // ดึงบริการทั้งหมดที่เผยแพร่
    const { data: products, error: perr } = await sb
      .from('products')
      .select('id, name, key')
      .eq('is_published', true)
      .order('name');
    if (perr) return NextResponse.json({ error: 'db_error', detail: perr.message }, { status: 500 });

    // ดึง items ของทุกบริการ
    const { data: items, error: ierr } = await sb
      .from('product_items')
      .select('id, product_id, name, sku, price, original_price, markup_percent, markup_fixed, icon_url');
    if (ierr) return NextResponse.json({ error: 'db_error', detail: ierr.message }, { status: 500 });

    // ดึง inputs ของทุกบริการ
    const { data: inputs, error: inperr } = await sb
      .from('product_inputs')
      .select('id, product_id, key, title, regex, type, placeholder')
      .order('id');
    if (inperr) return NextResponse.json({ error: 'db_error', detail: inperr.message }, { status: 500 });

    // ดึง options ของ inputs
    const inputIds = (inputs || []).map((x) => x.id);
    let optionsByInput = new Map<number, { label: string; value: string }[]>();
    if (inputIds.length) {
      const { data: options, error: oerr } = await sb
        .from('product_input_options')
        .select('id, input_id, label, value')
        .in('input_id', inputIds)
        .order('id');
      if (oerr) return NextResponse.json({ error: 'db_error', detail: oerr.message }, { status: 500 });
      for (const o of options || []) {
        const arr = optionsByInput.get(o.input_id as number) || [];
        arr.push({ label: o.label, value: o.value });
        optionsByInput.set(o.input_id as number, arr);
      }
    }

    // จัดกลุ่ม items และ inputs ตาม product_id
    const itemsByProduct = new Map<number, any[]>();
    for (const it of items || []) {
      const arr = itemsByProduct.get(it.product_id as number) || [];
      const base = Number(it.price ?? 0);
      const pct = Number((it as any).markup_percent ?? 0);
      const fix = Number((it as any).markup_fixed ?? 0);
      const computed = computePrice(base, pct, fix, gpct, gfix);
      arr.push({
        name: it.name,
        sku: it.sku,
        price: computed.toFixed(2),
        originalPrice: String(it.original_price || computed.toFixed(2)),
        icon_url: (it as any).icon_url || null
      });
      itemsByProduct.set(it.product_id as number, arr);
    }

    const inputsByProduct = new Map<number, any[]>();
    for (const inp of inputs || []) {
      const arr = inputsByProduct.get(inp.product_id as number) || [];
      arr.push({
        key: inp.key,
        title: inp.title,
        regex: inp.regex || '',
        type: inp.type || 'text',
        placeholder: inp.placeholder || '',
        options: optionsByInput.get(inp.id) || []
      });
      inputsByProduct.set(inp.product_id as number, arr);
    }

    // สร้าง response ตามรูปแบบที่ doc กำหนด
    // ใช้ inputs จาก DB โดยตรง ไม่ใส่ default
    const result = (products || []).map((p) => {
      const pid = (p as any).id as number;
      const productInputs = inputsByProduct.get(pid) || [];

      return {
        name: (p as any).name as string,
        key: (p as any).key as string,
        items: itemsByProduct.get(pid) || [],
        inputs: productInputs // ใช้ inputs จาก DB โดยตรง
      };
    });

    return NextResponse.json(result);
  } catch (err) {
    return NextResponse.json({ error: 'unexpected', detail: String(err) }, { status: 500 });
  }
}

