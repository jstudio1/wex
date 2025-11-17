import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin';
import { createServiceClient } from '@/lib/supabase';
import { z } from 'zod';

const createGameAccountSchema = z.object({
  game_name: z.string().min(1),
  game_category_id: z.number().optional().nullable(),
  title: z.string().min(1),
  description: z.string().optional().nullable(),
  cover_image_url: z.string().optional().nullable(),
  additional_images: z.array(z.string()).optional().default([]),
  accounts: z.array(z.object({
    username: z.string().min(1),
    password: z.string().min(1)
  })).min(1), // Array of username/password pairs
  price: z.number().min(0),
  original_price: z.number().min(0).optional().nullable(),
  discount_percent: z.number().int().min(0).max(100).optional().nullable(),
  permission_id: z.number().int().positive().nullable().optional(),
  is_published: z.boolean().optional().default(false)
});

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const categoryId = searchParams.get('category_id');
    const search = searchParams.get('search');
    const categorySlug = searchParams.get('category_slug');
    const permissionId = searchParams.get('permission_id');

    const sb = createServiceClient();
    
    let query = sb
      .from('game_accounts')
      .select('id, game_name, game_category_id, title, description, cover_image_url, additional_images, price, original_price, discount_percent, permission_id, stock, sold_at, created_at')
      .eq('is_published', true);
      // ไม่กรอง sold_at และ stock = 0 เพื่อให้แสดงสินค้าหมดเป็นสีเทา

    // Filter by category
    if (categoryId) {
      query = query.eq('game_category_id', categoryId);
    } else if (categorySlug) {
      const { data: category } = await sb
        .from('game_categories')
        .select('id')
        .eq('slug', categorySlug)
        .eq('is_published', true)
        .single();
      
      if (category) {
        query = query.eq('game_category_id', category.id);
      } else {
        return NextResponse.json({ ok: true, data: [] });
      }
    }

    // Search
    if (search) {
      query = query.or(`game_name.ilike.%${search}%,title.ilike.%${search}%,description.ilike.%${search}%`);
    }

    const { data: allAccounts, error } = await query.order('created_at', { ascending: false });

    if (error) {
      return NextResponse.json({ error: 'db_error', detail: error.message }, { status: 500 });
    }

    // ถ้ามี permission_id ให้ดึงราคาเฉพาะสำหรับ permission นี้
    if (permissionId) {
      const permId = parseInt(permissionId);
      if (!isNaN(permId)) {
        const accountIds = (allAccounts || []).map((acc: any) => acc.id);
        if (accountIds.length > 0) {
          const { data: customPrices } = await sb
            .from('game_account_prices')
            .select('game_account_id, price')
            .in('game_account_id', accountIds)
            .eq('permission_id', permId);
          
          const priceMap = new Map();
          (customPrices || []).forEach((cp: any) => {
            priceMap.set(cp.game_account_id, Number(cp.price));
          });
          
          // อัปเดตราคาใน accounts และเก็บราคาเดิมไว้
          (allAccounts || []).forEach((acc: any) => {
            if (priceMap.has(acc.id)) {
              // เก็บราคาเดิมไว้ใน original_price_for_permission
              if (!acc.original_price_for_permission) {
                acc.original_price_for_permission = acc.price;
              }
              acc.price = priceMap.get(acc.id);
            }
          });
        }
      }
    }

    // Group by game_name and base title (without # suffix) only
    // รวม stock ของไอดีที่เหมือนกัน (ประเภทเดียวกัน) - ใช้ราคาและส่วนลดจากไอดีแรกที่เจอ
    const grouped = new Map<string, any>();
    for (const acc of allAccounts || []) {
      const baseTitle = (acc.title as string).split(' #')[0];
      // ใช้แค่ game_name และ title เป็น key - รวม stock ทั้งหมด
      const key = `${acc.game_name}::${baseTitle}`;
      if (!grouped.has(key)) {
        const accWithPrice = acc as any;
        grouped.set(key, {
          ...acc,
          title: baseTitle,
          stock: 0,
          id: acc.id, // เก็บ id แรกที่เจอ (ใช้สำหรับ detail page)
          original_price_for_permission: accWithPrice.original_price_for_permission || null
        });
      } else {
        // ถ้า account นี้มี custom price ให้ใช้ราคานี้แทน
        const existing = grouped.get(key);
        const accWithPrice = acc as any;
        if (accWithPrice.original_price_for_permission && !existing.original_price_for_permission) {
          existing.price = acc.price;
          existing.original_price_for_permission = accWithPrice.original_price_for_permission;
        }
      }
      // รวม stock เฉพาะไอดีที่ยังไม่ถูกขาย (sold_at == null)
      if (!acc.sold_at) {
        grouped.get(key).stock += acc.stock || 0;
      }
    }
    
    // แสดงสินค้าทั้งหมด รวมถึงที่ stock = 0 (เพื่อแสดงเป็นสีเทา)
    const groupedAccounts = Array.from(grouped.values());

    // Enrich with category info
    const categoryIds = Array.from(new Set(groupedAccounts.map((item: any) => item.game_category_id).filter(Boolean)));
    let categoryMap = new Map();
    
    if (categoryIds.length > 0) {
      const { data: categories } = await sb
        .from('game_categories')
        .select('id, name, slug')
        .in('id', categoryIds);
      
      for (const cat of categories || []) {
        categoryMap.set((cat as any).id, cat);
      }
    }

    const enriched = groupedAccounts.map((item: any) => ({
      ...item,
      category: item.game_category_id ? categoryMap.get(item.game_category_id) : null
    }));

    return NextResponse.json({ ok: true, data: enriched });
  } catch (err) {
    console.error('Game accounts GET error:', err);
    return NextResponse.json({ error: 'internal_error' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  try {
    const body = await req.json();
    const validated = createGameAccountSchema.parse(body);

    const sb = createServiceClient();
    
    // Create multiple accounts, each with different username/password
    const accountsToCreate = [];
    
    for (let i = 0; i < validated.accounts.length; i++) {
      const acc = validated.accounts[i];
      accountsToCreate.push({
        game_name: validated.game_name,
        game_category_id: validated.game_category_id || null,
        title: validated.title + (validated.accounts.length > 1 ? ` #${i + 1}` : ''),
        description: validated.description || null,
        cover_image_url: validated.cover_image_url || null,
        additional_images: validated.additional_images || [],
        username: acc.username,
        password: acc.password,
        price: validated.price,
        original_price: validated.original_price || null,
        discount_percent: validated.discount_percent || null,
        permission_id: validated.permission_id || null,
        stock: 1, // Each account has stock of 1
        is_published: validated.is_published
      });
    }

    const { data, error } = await sb
      .from('game_accounts')
      .insert(accountsToCreate)
      .select();

    if (error) {
      return NextResponse.json({ error: 'db_error', detail: error.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true, data });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: 'validation_error', detail: err.issues }, { status: 400 });
    }
    console.error('Game accounts POST error:', err);
    return NextResponse.json({ error: 'internal_error' }, { status: 500 });
  }
}

