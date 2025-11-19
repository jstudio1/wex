import { NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth';
import { createServiceClient } from '@/lib/supabase';
import { getErrorMessage } from '@/lib/error-messages';

export async function POST(req: Request) {
  const user = await getAuthUser();
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  try {
    const formData = await req.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return NextResponse.json({ error: 'no_file' }, { status: 400 });
    }

    // ตรวจสอบประเภทไฟล์
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif'];
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json({ 
        error: 'invalid_file_type',
        message: getErrorMessage('invalid_file_type')
      }, { status: 400 });
    }

    // ตรวจสอบขนาดไฟล์ (5MB)
    const maxSize = 5 * 1024 * 1024; // 5MB
    if (file.size > maxSize) {
      return NextResponse.json({ 
        error: 'file_too_large',
        message: getErrorMessage('file_too_large')
      }, { status: 400 });
    }

    const sb = createServiceClient();
    
    // สร้างชื่อไฟล์: {user_id}/avatar.{extension}
    const fileExt = file.name.split('.').pop() || 'jpg';
    const fileName = `${user.id}/avatar.${fileExt}`;

    // อัปโหลดไฟล์ไปยัง Supabase Storage
    const { data: uploadData, error: uploadError } = await sb.storage
      .from('avatars')
      .upload(fileName, file, {
        cacheControl: '3600',
        upsert: true, // ถ้ามีไฟล์เดิมให้แทนที่
      });

    if (uploadError) {
      console.error('Upload error:', uploadError);
      return NextResponse.json({ 
        error: 'upload_failed',
        message: getErrorMessage('upload_failed')
      }, { status: 500 });
    }

    // สร้าง public URL
    const { data: urlData } = sb.storage
      .from('avatars')
      .getPublicUrl(fileName);

    const avatarUrl = urlData.publicUrl;

    // อัปเดต avatar_url ในฐานข้อมูล
    const { error: updateError } = await sb
      .from('users')
      .update({ avatar_url: avatarUrl })
      .eq('id', user.id);

    if (updateError) {
      console.error('Update error:', updateError);
      // ลบไฟล์ที่อัปโหลดไปแล้ว
      await sb.storage.from('avatars').remove([fileName]);
      return NextResponse.json({ 
        error: 'update_failed',
        message: getErrorMessage('update_failed')
      }, { status: 500 });
    }

    return NextResponse.json({ avatar_url: avatarUrl });
  } catch (err) {
    console.error('Unexpected error:', err);
    return NextResponse.json({ error: 'unexpected' }, { status: 500 });
  }
}

export async function DELETE() {
  const user = await getAuthUser();
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  try {
    const sb = createServiceClient();

    // ลบไฟล์จาก storage (หาไฟล์ที่ขึ้นต้นด้วย {user_id}/)
    const { data: files, error: listError } = await sb.storage
      .from('avatars')
      .list(`${user.id}`, {
        limit: 10,
        sortBy: { column: 'created_at', order: 'desc' },
      });

    if (!listError && files && files.length > 0) {
      const fileNames = files.map((f) => `${user.id}/${f.name}`);
      await sb.storage.from('avatars').remove(fileNames);
    }

    // อัปเดต avatar_url เป็น null
    const { error: updateError } = await sb
      .from('users')
      .update({ avatar_url: null })
      .eq('id', user.id);

    if (updateError) {
      return NextResponse.json({ 
        error: 'update_failed',
        message: getErrorMessage('update_failed')
      }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('Unexpected error:', err);
    return NextResponse.json({ 
      error: 'unexpected',
      message: getErrorMessage('unexpected')
    }, { status: 500 });
  }
}

