import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/admin'
import { createServiceClient } from '@/lib/supabase'
import { invalidateQrConfigCache } from '@/lib/qr-config'

const SETTING_KEYS = {
  username: 'PAYMENT_QR_USERNAME',
  password: 'PAYMENT_QR_PASSWORD',
  conId: 'PAYMENT_QR_CON_ID',
  promptpayId: 'PAYMENT_QR_PROMPTPAY_ID',
  promptpayType: 'PAYMENT_QR_PROMPTPAY_TYPE',
  webhookKey: 'PAYMENT_QR_WEBHOOK_KEY',
  webhookUrl: 'PAYMENT_QR_WEBHOOK_URL'
} as const

type BodyPayload = {
  username?: string
  password?: string
  conId?: string
  promptpayId?: string
  promptpayType?: '01' | '02'
  webhookKey?: string
  webhookUrl?: string
}

function normalizeString(value: unknown) {
  return typeof value === 'string' ? value.trim() : ''
}

export async function GET() {
  const admin = await requireAdmin()
  if (!admin) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  const sb = createServiceClient()
  const { data } = await sb
    .from('settings')
    .select('key,value')
    .in('key', Object.values(SETTING_KEYS))

  const map = new Map<string, string>()
  for (const row of data || []) {
    if (row.key && typeof row.value === 'string') {
      map.set(row.key, row.value)
    }
  }

  return NextResponse.json({
    username: map.get(SETTING_KEYS.username) || '',
    password: map.get(SETTING_KEYS.password) || '',
    conId: map.get(SETTING_KEYS.conId) || '',
    promptpayId: map.get(SETTING_KEYS.promptpayId) || '',
    promptpayType: (map.get(SETTING_KEYS.promptpayType) as '01' | '02' | undefined) || '02',
    webhookKey: map.get(SETTING_KEYS.webhookKey) || '',
    webhookUrl: map.get(SETTING_KEYS.webhookUrl) || ''
  })
}

export async function PUT(req: Request) {
  const admin = await requireAdmin()
  if (!admin) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  const body = (await req.json().catch(() => ({}))) as BodyPayload

  const username = normalizeString(body.username)
  const password = normalizeString(body.password)
  const conId = normalizeString(body.conId)
  const promptpayId = normalizeString(body.promptpayId)
  const promptpayType = body.promptpayType === '01' ? '01' : '02'
  const webhookKey = normalizeString(body.webhookKey)
  const webhookUrl = normalizeString(body.webhookUrl)

  if (!username || !password || !conId || !promptpayId || !webhookKey) {
    return NextResponse.json({ error: 'missing_fields' }, { status: 400 })
  }

  const updates = [
    { key: SETTING_KEYS.username, value: username },
    { key: SETTING_KEYS.password, value: password },
    { key: SETTING_KEYS.conId, value: conId },
    { key: SETTING_KEYS.promptpayId, value: promptpayId },
    { key: SETTING_KEYS.promptpayType, value: promptpayType },
    { key: SETTING_KEYS.webhookKey, value: webhookKey },
    { key: SETTING_KEYS.webhookUrl, value: webhookUrl || '' }
  ]

  const sb = createServiceClient()
  await sb.from('settings').upsert(updates, { onConflict: 'key' })
  invalidateQrConfigCache()

  return NextResponse.json({ ok: true })
}

