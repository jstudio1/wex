import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin';
import { createServiceClient } from '@/lib/supabase';
import { z } from 'zod';

const otpAppUpdateSchema = z.object({
  app_id: z.string().min(1).max(100).optional(),
  name: z.string().min(1).max(100).optional(),
  name_thai: z.string().min(1).max(100).optional(),
  description: z.string().max(500).optional().nullable(),
  icon_url: z.string().url().optional().nullable().or(z.literal('')),
  image_url: z.string().url().optional().nullable().or(z.literal('')),
  color: z.string().max(100).optional().nullable(),
  is_published: z.boolean().optional(),
  display_order: z.number().int().optional(),
});

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const { id } = await params;
  const sb = createServiceClient();
  const { data, error } = await sb
    .from('otp_apps')
    .select('*')
    .eq('id', id)
    .single();

  if (error) {
    if (error.code === 'PGRST116') {
      return NextResponse.json({ error: 'not_found' }, { status: 404 });
    }
    console.error('OTP App GET error:', error);
    return NextResponse.json({ error: 'db_error', detail: error.message }, { status: 500 });
  }

  return NextResponse.json({ data });
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  try {
    const { id } = await params;
    const body = await req.json();
    const parsed = otpAppUpdateSchema.parse(body);

    const updateData: Record<string, any> = {
      updated_at: new Date().toISOString(),
    };

    if (parsed.app_id !== undefined) updateData.app_id = parsed.app_id.trim();
    if (parsed.name !== undefined) updateData.name = parsed.name.trim();
    if (parsed.name_thai !== undefined) updateData.name_thai = parsed.name_thai.trim();
    if (parsed.description !== undefined) updateData.description = parsed.description?.trim() || null;
    if (parsed.icon_url !== undefined) updateData.icon_url = parsed.icon_url?.trim() || null;
    if (parsed.image_url !== undefined) updateData.image_url = parsed.image_url?.trim() || null;
    if (parsed.color !== undefined) updateData.color = parsed.color?.trim() || null;
    if (parsed.is_published !== undefined) updateData.is_published = parsed.is_published;
    if (parsed.display_order !== undefined) updateData.display_order = parsed.display_order;

    const sb = createServiceClient();
    const { data, error } = await sb
      .from('otp_apps')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json({ error: 'not_found' }, { status: 404 });
      }
      if (error.code === '23505') {
        return NextResponse.json({ error: 'app_id นี้มีอยู่แล้ว' }, { status: 409 });
      }
      console.error('OTP App PATCH error:', error);
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
    console.error('OTP App PATCH unexpected error:', err);
    return NextResponse.json({ error: 'unexpected' }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  try {
    const { id } = await params;
    const sb = createServiceClient();
    const { error } = await sb
      .from('otp_apps')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('OTP App DELETE error:', error);
      return NextResponse.json({ error: 'db_error', detail: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('OTP App DELETE unexpected error:', err);
    return NextResponse.json({ error: 'unexpected' }, { status: 500 });
  }
}

