import { createServiceClient } from './supabase'

export type QrConfig = {
  username: string
  password: string
  conId: string
  promptpayId: string
  promptpayType: '01' | '02'
  webhookKey: string
  webhookUrl?: string
}

const SETTING_KEYS = [
  'PAYMENT_QR_USERNAME',
  'PAYMENT_QR_PASSWORD',
  'PAYMENT_QR_CON_ID',
  'PAYMENT_QR_PROMPTPAY_ID',
  'PAYMENT_QR_PROMPTPAY_TYPE',
  'PAYMENT_QR_WEBHOOK_KEY',
  'PAYMENT_QR_WEBHOOK_URL'
] as const

type SettingKey = (typeof SETTING_KEYS)[number]

const CACHE_TTL = 60 * 1000
let cache: { data: QrConfig | null; expiresAt: number } = { data: null, expiresAt: 0 }

function getEnvFallback(): QrConfig | null {
  const username = process.env.QR_USERNAME
  const password = process.env.QR_PASSWORD
  const conId = process.env.QR_CON_ID
  const promptpayId = process.env.QR_PROMPTPAY_ID
  const promptpayType = (process.env.QR_PROMPTPAY_TYPE as '01' | '02' | undefined) || '02'
  const webhookKey = process.env.QR_WEBHOOK_KEY
  const webhookUrl = process.env.QR_WEBHOOK_URL

  if (!username || !password || !conId || !promptpayId || !webhookKey) {
    return null
  }

  return {
    username,
    password,
    conId,
    promptpayId,
    promptpayType: promptpayType === '01' ? '01' : '02',
    webhookKey,
    webhookUrl
  }
}

async function fetchFromSettings(): Promise<QrConfig | null> {
  const sb = createServiceClient()
  const { data, error } = await sb
    .from('settings')
    .select('key,value')
    .in('key', Array.from(SETTING_KEYS))
  if (error) {
    console.error('Failed to load QR config from settings:', error)
    return null
  }

  const map = new Map<string, string>()
  for (const row of data || []) {
    if (row.key && typeof row.value === 'string') {
      map.set(row.key, row.value)
    }
  }

  const username = map.get('PAYMENT_QR_USERNAME')
  const password = map.get('PAYMENT_QR_PASSWORD')
  const conId = map.get('PAYMENT_QR_CON_ID')
  const promptpayId = map.get('PAYMENT_QR_PROMPTPAY_ID')
  const promptpayType = (map.get('PAYMENT_QR_PROMPTPAY_TYPE') as '01' | '02' | undefined) || '02'
  const webhookKey = map.get('PAYMENT_QR_WEBHOOK_KEY')
  const webhookUrl = map.get('PAYMENT_QR_WEBHOOK_URL') || undefined

  if (!username || !password || !conId || !promptpayId || !webhookKey) {
    return null
  }

  return {
    username,
    password,
    conId,
    promptpayId,
    promptpayType: promptpayType === '01' ? '01' : '02',
    webhookKey,
    webhookUrl
  }
}

export async function getQrConfig(forceRefresh = false): Promise<QrConfig | null> {
  const now = Date.now()
  if (!forceRefresh && cache.expiresAt > now && cache.data) {
    return cache.data
  }

  const settingsConfig = await fetchFromSettings()
  const config = settingsConfig || getEnvFallback()

  cache = {
    data: config,
    expiresAt: now + CACHE_TTL
  }

  return config
}

export function invalidateQrConfigCache() {
  cache = { data: null, expiresAt: 0 }
}

export async function requireQrConfig(): Promise<QrConfig> {
  const config = await getQrConfig()
  if (!config) {
    throw new Error('ยังไม่ได้ตั้งค่า QR PromptPay API')
  }
  return config
}

