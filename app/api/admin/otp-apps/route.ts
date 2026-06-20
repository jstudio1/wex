import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin';
import { createServiceClient } from '@/lib/supabase';
import { z } from 'zod';

const otpAppSchema = z.object({
  app_id: z.string().min(1).max(100),
  name: z.string().min(1).max(100),
  name_thai: z.string().min(1).max(100),
  description: z.string().max(500).optional(),
  icon_url: z.string().url().optional().or(z.literal('')),
  image_url: z.string().url().optional().or(z.literal('')),
  color: z.string().max(100).optional(),
  is_published: z.boolean().optional(),
  display_order: z.number().int().optional(),
});

export async function GET() {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const sb = createServiceClient();
  const { data, error } = await sb
    .from('otp_apps')
    .select('*')
    .order('display_order', { ascending: true });

  if (error) {
    console.error('OTP Apps GET error:', error);
    return NextResponse.json({ error: 'db_error', detail: error.message }, { status: 500 });
  }

  return NextResponse.json({ data });
}

export async function POST(req: Request) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  try {
    const body = await req.json();
    const parsed = otpAppSchema.parse(body);

    const sb = createServiceClient();
    const { data, error } = await sb
      .from('otp_apps')
      .insert({
        app_id: parsed.app_id.trim(),
        name: parsed.name.trim(),
        name_thai: parsed.name_thai.trim(),
        description: parsed.description?.trim() || null,
        icon_url: parsed.icon_url?.trim() || null,
        image_url: parsed.image_url?.trim() || null,
        color: parsed.color?.trim() || null,
        is_published: parsed.is_published ?? true,
        display_order: parsed.display_order ?? 0,
        updated_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) {
      if (error.code === '23505') {
        return NextResponse.json({ error: 'app_id นี้มีอยู่แล้ว' }, { status: 409 });
      }
      console.error('OTP Apps POST error:', error);
      return NextResponse.json({ error: 'db_error', detail: error.message }, { status: 500 });
    }

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
    console.error('OTP Apps POST unexpected error:', err);
    return NextResponse.json({ error: 'unexpected' }, { status: 500 });
  }
}

