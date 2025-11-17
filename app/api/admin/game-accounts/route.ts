import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin';
import { createServiceClient } from '@/lib/supabase';

export async function GET(req: Request) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  try {
    const { searchParams } = new URL(req.url);
    const categoryId = searchParams.get('category_id');
    const search = searchParams.get('search');

    const sb = createServiceClient();
    let query = sb
      .from('game_accounts')
      .select('*, game_categories(id, name, slug)')
      .order('created_at', { ascending: false });

    // Filter by category
    if (categoryId) {
      query = query.eq('game_category_id', categoryId);
    }

    // Search
    if (search) {
      query = query.or(`game_name.ilike.%${search}%,title.ilike.%${search}%,description.ilike.%${search}%`);
    }

    const { data, error } = await query;

    if (error) {
      return NextResponse.json({ error: 'db_error', detail: error.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true, data });
  } catch (err) {
    console.error('Admin game accounts GET error:', err);
    return NextResponse.json({ error: 'internal_error' }, { status: 500 });
  }
}

