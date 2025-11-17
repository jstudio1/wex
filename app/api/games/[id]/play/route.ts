import { NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth';
import { createServiceClient } from '@/lib/supabase';
import { logGamePlayToDiscord } from '@/lib/discord';

export async function POST(
  req: Request,
  { params }: { params: { id: string } }
) {
  const user = await getAuthUser();
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  try {
    const gameId = parseInt(params.id);
    if (isNaN(gameId)) {
      return NextResponse.json({ error: 'invalid_id' }, { status: 400 });
    }

    const sb = createServiceClient();

    // ดึงข้อมูลเกมและรางวัลที่เปิดใช้งาน
    const { data: game, error: gameError } = await sb
      .from('game_games')
      .select(`
        *,
        game_prizes (
          id,
          name,
          type,
          value,
          probability,
          quantity,
          remaining_quantity,
          is_active
        )
      `)
      .eq('id', gameId)
      .eq('is_active', true)
      .single();

    if (gameError || !game) {
      return NextResponse.json({ error: 'game_not_found' }, { status: 404 });
    }

    // ตรวจสอบว่าผู้ใช้มีพอยต์พอไหม
    const { data: userData } = await sb
      .from('users')
      .select('points')
      .eq('id', user.id)
      .single();

    const userPoints = Number(userData?.points || 0);
    const costPoints = Number(game.cost_points);

    if (userPoints < costPoints) {
      return NextResponse.json({ 
        error: 'insufficient_points',
        message: `พอยต์ไม่พอ ต้องการ ${costPoints} พอยต์` 
      }, { status: 400 });
    }

    // กรองรางวัลที่เปิดใช้งานและมีจำนวนเหลือ
    const availablePrizes = (game.game_prizes || []).filter((prize: any) => {
      if (!prize.is_active) return false;
      if (prize.quantity !== null && (prize.remaining_quantity === null || prize.remaining_quantity <= 0)) {
        return false;
      }
      return true;
    });

    if (availablePrizes.length === 0) {
      return NextResponse.json({ error: 'no_prizes_available' }, { status: 400 });
    }

    // สุ่มรางวัลตาม probability
    const totalProbability = availablePrizes.reduce((sum: number, prize: any) => 
      sum + Number(prize.probability), 0
    );

    if (totalProbability <= 0) {
      return NextResponse.json({ error: 'invalid_probability' }, { status: 500 });
    }

    let random = Math.random() * totalProbability;
    let selectedPrize: any = null;

    for (const prize of availablePrizes) {
      random -= Number(prize.probability);
      if (random <= 0) {
        selectedPrize = prize;
        break;
      }
    }

    if (!selectedPrize) {
      selectedPrize = availablePrizes[availablePrizes.length - 1];
    }

    // หักพอยต์
    const { error: debitError } = await sb.rpc('wallet_debit', {
      u: user.id,
      amt: costPoints
    });

    if (debitError) {
      return NextResponse.json({ error: 'db_error', details: debitError.message }, { status: 500 });
    }

    let couponId: bigint | null = null;

    // จัดการรางวัลตามประเภท
    if (selectedPrize.type === 'points') {
      // ให้พอยต์ทันที
      const points = Number(selectedPrize.value);
      const { error: creditError } = await sb.rpc('wallet_credit', {
        u: user.id,
        amt: points
      });

      if (creditError) {
        console.error('Failed to credit points:', creditError);
      }
    } else if (selectedPrize.type === 'coupon') {
      // สร้างโค้ดส่วนลด
      const couponCode = `GAME${Date.now()}${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
      const parts = selectedPrize.value.split(':');
      const discountType = parts[0]?.trim() || 'fixed';
      const discountValueStr = parts[1]?.trim() || selectedPrize.value;
      const discountValue = Number(discountValueStr);
      
      if (!isNaN(discountValue) && discountValue > 0) {
        const { data: newCoupon, error: couponError } = await sb
          .from('coupons')
          .insert({
            code: couponCode,
            discount_type: discountType === 'percent' ? 'percent' : 'fixed',
            discount_value: discountValue,
            valid_from: new Date().toISOString(),
            valid_until: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString(), // 90 วัน
            is_active: true,
            description: `รางวัลจากเกม: ${game.name} - ${selectedPrize.name}`,
          })
          .select()
          .single();

        if (!couponError && newCoupon) {
          couponId = newCoupon.id;
        }
      }
    }

    // บันทึกผลลัพธ์
    const { data: result, error: resultError } = await sb
      .from('game_results')
      .insert({
        user_id: user.id,
        game_id: gameId,
        prize_id: selectedPrize.id,
        prize_type: selectedPrize.type,
        prize_name: selectedPrize.name,
        prize_value: selectedPrize.value,
        coupon_id: couponId,
        status: selectedPrize.type === 'points' ? 'redeemed' : 'pending',
      })
      .select()
      .single();

    if (resultError) {
      console.error('Failed to save result:', resultError);
    }

    // ลดจำนวนรางวัลถ้ามี
    if (selectedPrize.quantity !== null && selectedPrize.remaining_quantity !== null) {
      await sb
        .from('game_prizes')
        .update({
          remaining_quantity: selectedPrize.remaining_quantity - 1
        })
        .eq('id', selectedPrize.id);
    }

    // ส่ง Discord webhook log
    try {
      // ดึงข้อมูล prize image ถ้ามี
      const { data: prizeData } = await sb
        .from('game_prizes')
        .select('image_url')
        .eq('id', selectedPrize.id)
        .maybeSingle();

      await logGamePlayToDiscord({
        type: 'game-play',
        username: user.username,
        userId: user.id,
        productName: selectedPrize.name,
        amount: Number(game.cost_points),
        transactionId: result?.id ? `GAME_${result.id}` : undefined,
        status: selectedPrize.type === 'points' ? 'redeemed' : 'pending',
        imageUrl: game.image_url,
        gameName: game.name,
        prizeName: selectedPrize.name,
        prizeValue: selectedPrize.type === 'points' ? `${selectedPrize.value} พอยต์` : selectedPrize.value,
        prizeImageUrl: prizeData?.image_url,
        additionalInfo: {
          '🎰 ประเภทเกม': game.type === 'spin_wheel' ? 'วงล้อ' : 'กล่องสุ่มรางวัล',
          '🎁 ประเภทรางวัล': selectedPrize.type === 'points' ? 'พอยต์' : selectedPrize.type === 'coupon' ? 'คูปอง' : 'อื่นๆ',
        }
      });
    } catch (err) {
      console.error('Discord webhook error:', err);
      // ไม่ throw error
    }

    return NextResponse.json({
      ok: true,
      data: {
        result: result,
        prize: {
          id: selectedPrize.id,
          name: selectedPrize.name,
          type: selectedPrize.type,
          value: selectedPrize.value,
          coupon_id: couponId,
        },
        points_credited: selectedPrize.type === 'points' ? Number(selectedPrize.value) : 0,
      }
    });
  } catch (err) {
    console.error('Play game error:', err);
    return NextResponse.json({ error: 'internal_error' }, { status: 500 });
  }
}

