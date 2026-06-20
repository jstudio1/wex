import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin';
import { sendTelegramNotification } from '@/lib/telegram';
import { getErrorMessage } from '@/lib/error-messages';

export async function POST(req: Request) {
  try {
    const admin = await requireAdmin();
    if (!admin) {
      return NextResponse.json({ error: 'unauthorized', message: getErrorMessage('unauthorized') }, { status: 401 });
    }

    const { type } = await req.json();

    if (!['registration', 'order', 'topup', 'ticket'].includes(type)) {
      return NextResponse.json({ error: 'invalid_type', message: 'ประเภทการทดสอบไม่ถูกต้อง' }, { status: 400 });
    }

    // สร้างข้อความทดสอบตามประเภท
    let message = '';
    switch (type) {
      case 'registration':
        message = `👤 <b>ผู้ใช้ใหม่สมัครสมาชิก (ทดสอบ)</b>\n\n<b>Username:</b> demo_user123\n<b>ชื่อ:</b> สมชาย ใจดี\n<b>อีเมล:</b> somchai@example.com\n<b>เบอร์โทร:</b> 0812345678`;
        break;
      case 'order':
        message = `🛍 <b>สั่งซื้อบริการ:</b> เติมเกม Valorant 1000 VP (ทดสอบ)\n<b>ผู้ใช้:</b> demo_user123\n<b>พอยต์:</b> 250.00\n<b>สถานะ:</b> pending\n<b>ID ผู้ใช้ทวิตช์:</b> user1234`;
        break;
      case 'topup':
        message = `💰 <b>เติมเงิน (truewallet) (ทดสอบ)</b>\n<b>ผู้ใช้:</b> demo_user123\n<b>จำนวน:</b> 500.00 พอยต์\n<b>สถานะ:</b> สำเร็จ`;
        break;
      case 'ticket':
        message = `🎫 <b>เปิด Ticket ใหม่:</b> #999 (ทดสอบ)\n<b>ผู้ใช้:</b> demo_user123 (ID: 99)\n<b>หัวข้อ:</b> สอบถามปัญหาการเติมเงินไม่เข้า\n<b>หมวดหมู่:</b> เติมเงิน/แจ้งปัญหาการเงิน\n<b>ข้อความ:</b> เติมเงินผ่าน TrueWallet ไปแล้วแต่ระบบยังไม่ตัดเงินครับ...`;
        break;
    }

    await sendTelegramNotification(message, type as any);

    return NextResponse.json({ success: true, message: 'ส่งข้อความทดสอบเรียบร้อยแล้ว' });
  } catch (error) {
    console.error('Test Telegram error:', error);
    return NextResponse.json({ error: 'unexpected', message: getErrorMessage('unexpected') }, { status: 500 });
  }
}
