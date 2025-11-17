import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getAuthUser } from '@/lib/auth';
import { createServiceClient } from '@/lib/supabase';
import { redeemTrueWalletVoucher, extractVoucherCode } from '@/lib/truewallet';
import { logTopupToDiscord } from '@/lib/discord';

// Validation Schema
const redeemVoucherSchema = z.object({
  voucherInput: z.string().min(1, 'กรุณากรอกลิงก์หรือรหัสซอง'),
});

export async function POST(request: NextRequest) {
  try {
    // 1. Check Authentication
    const user = await getAuthUser();
    
    if (!user) {
      return NextResponse.json(
        {
          success: false,
          error: 'กรุณาเข้าสู่ระบบ',
        },
        { status: 401 }
      );
    }

    const userId = user.id;

    // 2. Parse and Validate Request
    const body = await request.json();
    const validatedData = redeemVoucherSchema.parse(body);
    const { voucherInput } = validatedData;

    console.log('🎁 Starting TrueWallet voucher redemption for user:', userId);

    // 3. Extract voucher code from input (URL or direct code)
    const voucherCode = extractVoucherCode(voucherInput);
    
    if (!voucherCode) {
      return NextResponse.json(
        {
          success: false,
          error: 'รหัสซองไม่ถูกต้อง กรุณาตรวจสอบลิงก์หรือรหัสซอง',
        },
        { status: 400 }
      );
    }

    const sb = createServiceClient();

    // 4. Get TrueWallet phone number from settings
    const { data: phoneSettings } = await sb
      .from('settings')
      .select('value')
      .eq('key', 'TRUEWALLET_PHONE')
      .maybeSingle();

    const truewalletPhone = phoneSettings?.value;

    if (!truewalletPhone) {
      return NextResponse.json(
        {
          success: false,
          error: 'ระบบไม่พร้อมใช้งาน กรุณาติดต่อผู้ดูแลระบบ',
        },
        { status: 500 }
      );
    }

    // 5. Check if voucher has been used before (in our system)
    const { data: existingVoucher } = await sb
      .from('truewallet_topup')
      .select('id, status')
      .eq('voucher_code', voucherCode)
      .maybeSingle();

    if (existingVoucher) {
      // Save failed attempt
      await sb.from('truewallet_topup').insert({
        user_id: userId,
        voucher_code: voucherCode,
        amount: 0,
        points: 0,
        status: 'failed',
        error_message: 'ซองนี้เคยถูกใช้ในระบบแล้ว',
      });

      return NextResponse.json(
        {
          success: false,
          error: 'ซองนี้เคยถูกใช้ในระบบแล้ว',
        },
        { status: 400 }
      );
    }

    // 6. Redeem voucher with TrueWallet API
    console.log('🔄 Redeeming voucher with TrueWallet API...');
    
    const redeemResult = await redeemTrueWalletVoucher(voucherCode, truewalletPhone);

    if (!redeemResult.success || !redeemResult.amount) {
      // Save failed attempt
      await sb.from('truewallet_topup').insert({
        user_id: userId,
        voucher_code: voucherCode,
        amount: 0,
        points: 0,
        status: 'failed',
        error_message: redeemResult.error || 'ไม่สามารถแลกซองได้',
      });

      return NextResponse.json(
        {
          success: false,
          error: redeemResult.error || 'ไม่สามารถแลกซองได้',
        },
        { status: 400 }
      );
    }

    const amount = redeemResult.amount;
    const pointsToAdd = amount; // 1 บาท = 1 พ้อยต์

    // 7. Add points to user (using wallet_credit function)
    const { error: creditError } = await sb.rpc('wallet_credit', {
      u: userId,
      amt: pointsToAdd,
    });

    if (creditError) {
      console.error('Error adding points to user:', creditError);
      
      // Save failed attempt (but voucher was redeemed on TrueWallet side)
      await sb.from('truewallet_topup').insert({
        user_id: userId,
        voucher_code: voucherCode,
        amount: amount,
        points: 0,
        status: 'failed',
        error_message: 'ไม่สามารถเติมเงินได้ (แลกซองสำเร็จแล้ว กรุณาติดต่อผู้ดูแล)',
      });

      return NextResponse.json(
        {
          success: false,
          error: 'เกิดข้อผิดพลาดในการเติมเงิน กรุณาติดต่อผู้ดูแลระบบ',
        },
        { status: 500 }
      );
    }

    // 8. Save successful redemption to history
    await sb.from('truewallet_topup').insert({
      user_id: userId,
      voucher_code: voucherCode,
      amount: amount,
      points: pointsToAdd,
      status: 'completed',
      error_message: null,
    });

    // 9. Send Discord notification (optional)
    try {
      await logTopupToDiscord({
        username: user.username,
        userId: userId,
        amount: amount,
        method: 'truewallet',
      });
    } catch (discordError) {
      console.error('Discord webhook error:', discordError);
      // Don't fail the request if Discord notification fails
    }

    console.log('✅ TrueWallet voucher redemption successful');

    // 10. Return success response
    return NextResponse.json({
      success: true,
      data: {
        message: `เติมเงินสำเร็จ! จำนวน ${amount.toFixed(2)} บาท ได้รับ ${pointsToAdd.toFixed(0)} พ้อยต์`,
        amount: amount,
        pointsAdded: pointsToAdd,
      },
    });

  } catch (error) {
    console.error('❌ TrueWallet voucher redemption error:', error);

    // Handle Zod Validation Error
    if (error instanceof z.ZodError) {
      const firstIssueMessage = error.issues[0]?.message ?? 'ข้อมูลไม่ถูกต้อง';

      return NextResponse.json(
        {
          success: false,
          error: firstIssueMessage,
        },
        { status: 400 }
      );
    }

    // Handle Unknown Error
    const errorMessage = error instanceof Error ? error.message : 'เกิดข้อผิดพลาดในระบบ';
    
    return NextResponse.json(
      {
        success: false,
        error: errorMessage,
      },
      { status: 500 }
    );
  }
}

