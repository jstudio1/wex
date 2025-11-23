import { NextResponse } from 'next/server';
import { revalidateTag } from 'next/cache';
import { requireAdmin } from '@/lib/admin';
import { createServiceClient } from '@/lib/supabase';
import { z } from 'zod';

const categorySchema = z.object({
  name: z.string().min(1).max(100),
  slug: z.string().min(1).max(100), // อนุญาตให้ใช้ภาษาไทยได้
});

// ฟังก์ชันสร้าง slug จากชื่อ (ถ้าต้องการแปลงเป็นภาษาอังกฤษ)
function generateSlug(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[\s_]+/g, '-')
    .replace(/[^a-z0-9_-]/g, '')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '')
    || 'category';
}

export async function GET() {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const sb = createServiceClient();
  const { data, error } = await sb
    .from('categories')
    .select('*')
    .order('name');

  if (error) {
    return NextResponse.json({ error: 'db_error' }, { status: 500 });
  }

  return NextResponse.json({ data });
}

export async function POST(req: Request) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  try {
    const body = await req.json();
    
    // ถ้า slug ไม่ได้กรอก ให้สร้างอัตโนมัติจากชื่อ
    let finalSlug = body.slug?.trim() || '';
    if (!finalSlug) {
      finalSlug = generateSlug(body.name || '');
    }
    
    const parsed = categorySchema.parse({
      name: body.name,
      slug: finalSlug,
    });

    const sb = createServiceClient();
    const { data, error } = await sb
      .from('categories')
      .insert({
        name: parsed.name.trim(),
        slug: parsed.slug.trim(), // ไม่ต้อง toLowerCase() เพื่อให้รองรับภาษาไทย
      })
      .select()
      .single();

    if (error) {
      if (error.code === '23505') {
        return NextResponse.json({ error: 'slug นี้มีอยู่แล้ว' }, { status: 409 });
      }
      return NextResponse.json({ error: 'db_error' }, { status: 500 });
    }

    try { revalidateTag('categories'); } catch {}
    return NextResponse.json({ data });
  } catch (err) {
    if (err instanceof z.ZodError) {
      const errorMessages = err.issues.map(issue => {
        if (issue.path && issue.path.length > 0) {
          return `${issue.path.join('.')}: ${issue.message}`;
        }
        return issue.message;
      });
      return NextResponse.json({ error: errorMessages.join(', ') }, { status: 400 });
    }
    return NextResponse.json({ error: 'unexpected' }, { status: 500 });
  }
}

