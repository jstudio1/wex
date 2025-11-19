import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase';
import { requireAdmin } from '@/lib/admin';
import { BLOG_BUCKET, buildBlogImagePath } from '@/lib/blog';

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const ALLOWED_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];

export async function POST(req: NextRequest) {
  try {
    const admin = await requireAdmin();
    if (!admin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const formData = await req.formData();
    const file = formData.get('file') as File;
    const postId = formData.get('post_id') as string;

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json({ error: 'File size exceeds 5MB' }, { status: 400 });
    }

    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json({ error: 'Invalid file type' }, { status: 400 });
    }

    const sb = createServiceClient();

    try {
      await sb.storage.createBucket(BLOG_BUCKET, {
        public: true,
        fileSizeLimit: MAX_FILE_SIZE,
      });
    } catch (error: any) {
      if (error?.statusCode !== '409' && !error?.message?.includes('already exists')) {
        console.error('[blog][upload] createBucket error', error);
      }
    }

    const fileExt = file.name.split('.').pop();
    const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
    const filePath = postId ? buildBlogImagePath(parseInt(postId), fileName) : `temp/${fileName}`;

    const { data, error: uploadError } = await sb.storage.from(BLOG_BUCKET).upload(filePath, file, {
      contentType: file.type,
      upsert: false,
    });

    if (uploadError) {
      console.error('[blog][upload] upload error:', uploadError);
      return NextResponse.json({ error: 'Failed to upload file' }, { status: 500 });
    }

    const {
      data: { publicUrl },
    } = sb.storage.from(BLOG_BUCKET).getPublicUrl(filePath);

    return NextResponse.json({
      url: publicUrl,
      path: filePath,
    });
  } catch (error: any) {
    console.error('[blog][upload] error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

