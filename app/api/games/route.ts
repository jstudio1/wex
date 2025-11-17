import { NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET() {
  const sb = createServiceClient();
  
  try {
    // ดึงเกมที่เปิดใช้งาน
    const { data: games, error: gamesError } = await sb
      .from('game_games')
      .select('*')
      .eq('is_active', true)
      .order('created_at', { ascending: false });

    if (gamesError) {
      return NextResponse.json({ error: 'db_error', details: gamesError.message }, { status: 500 });
    }

    if (!games || games.length === 0) {
      return NextResponse.json({ ok: true, data: [] });
    }

    // ดึงรางวัลทั้งหมดที่เปิดใช้งาน
    const gameIds = games.map(g => g.id);
    const { data: prizes, error: prizesError } = await sb
      .from('game_prizes')
      .select('*')
      .in('game_id', gameIds)
      .eq('is_active', true)
      .order('display_order', { ascending: true })
      .order('created_at', { ascending: true });

    if (prizesError) {
      console.error('Failed to fetch prizes:', prizesError);
    }

    // จัดกลุ่มรางวัลตาม game_id
    const prizesByGameId = (prizes || []).reduce((acc: any, prize: any) => {
      if (!acc[prize.game_id]) {
        acc[prize.game_id] = [];
      }
      acc[prize.game_id].push(prize);
      return acc;
    }, {});

    // รวมเกมกับรางวัล
    const gamesWithPrizes = (games || []).map(game => ({
      ...game,
      game_prizes: prizesByGameId[game.id] || []
    }));

    return NextResponse.json({ ok: true, data: gamesWithPrizes });
  } catch (err) {
    console.error('Games API error:', err);
    return NextResponse.json({ error: 'internal_error', details: (err as Error).message }, { status: 500 });
  }
}

