import { NextResponse } from 'next/server'
import { savePayment } from '@/lib/qr-payments-store'
import { requireQrConfig } from '@/lib/qr-config'

const TM_API_URL = process.env.QR_INTERNAL_API_URL || 'http://tmwallet.thaighost.net/api_pph.php'

type TmWalletResponse<T = any> = {
  status: number
  msg?: string
  [key: string]: any
} & T

function buildUrl(params: Record<string, string | number>) {
  const url = new URL(TM_API_URL)
  Object.entries(params).forEach(([key, value]) => url.searchParams.set(key, String(value)))
  return url
}

async function callTmWallet<T = any>(
  config: Awaited<ReturnType<typeof requireQrConfig>>,
  params: Record<string, string | number>
): Promise<TmWalletResponse<T>> {
  const url = buildUrl({
    username: config.username,
    password: config.password,
    con_id: config.conId,
    ...params
  })
  const res = await fetch(url, { cache: 'no-store' })
  if (!res.ok) {
    const text = await res.text()
    throw new Error(`TMwallet error ${res.status}: ${text}`)
  }
  return res.json()
}

async function createPayment(
  config: Awaited<ReturnType<typeof requireQrConfig>>,
  amount: number,
  ref1: string,
  ip: string | null
) {
  const response = await callTmWallet<{ id_pay: string; msg?: string }>(config, {
    method: 'create_pay',
    amount,
    ref1,
    ip: ip ?? ''
  })

  if (response.status !== 1 || !response.id_pay) {
    throw new Error(response.msg || 'ไม่สามารถสร้างรายการชำระเงินได้')
  }
  return response.id_pay as string
}

async function getPaymentDetails(config: Awaited<ReturnType<typeof requireQrConfig>>, idPay: string) {
  const response = await callTmWallet<{
    ref1: string
    amount_check: number
    qr_image_base64: string
    time_out: string
  }>(config, {
    method: 'detail_pay',
    id_pay: idPay,
    promptpay_id: config.promptpayId,
    type: config.promptpayType
  })

  if (response.status !== 1) {
    throw new Error(response.msg || 'ไม่สามารถดึงรายละเอียด QR ได้')
  }

  return {
    ref1: response.ref1,
    amount: (response.amount_check ?? 0) / 100,
    qrImageBase64: response.qr_image_base64,
    timeout: Number(response.time_out ?? 900)
  }
}

function getClientIp(req: Request) {
  const forwarded = req.headers.get('x-forwarded-for')
  if (forwarded) {
    return forwarded.split(',')[0]?.trim() || null
  }
  return req.headers.get('x-real-ip') || null
}

export const dynamic = 'force-dynamic'

export async function POST(req: Request) {
  try {
    const qrConfig = await requireQrConfig()
    const { amount, ref1 } = await req.json()
    if (!amount || !ref1) {
      return NextResponse.json({ status: 0, message: 'จำนวนเงินหรือ ref1 ไม่ถูกต้อง' }, { status: 400 })
    }
    
    const amountNumber = Math.round(Number(amount))
    if (Number.isNaN(amountNumber) || amountNumber <= 0 || amountNumber > 1_000_000) {
      return NextResponse.json({ status: 0, message: 'Amount must be between 1 and 1,000,000' }, { status: 400 })
    }
    
    const clientIp = getClientIp(req)
    const idPay = await createPayment(qrConfig, amountNumber, String(ref1), clientIp)
    const paymentDetails = await getPaymentDetails(qrConfig, idPay)

    await savePayment({
      idPay,
      ref1: paymentDetails.ref1,
      amount: paymentDetails.amount,
      status: 'PENDING',
      createdAt: Date.now(),
      timeoutSeconds: paymentDetails.timeout || 900,
      qrImageBase64: paymentDetails.qrImageBase64,
    })

    return NextResponse.json({
      status: 1,
      id_pay: idPay,
      ref1: paymentDetails.ref1,
      amount: paymentDetails.amount,
      qr_image_base64: paymentDetails.qrImageBase64,
      time_out: paymentDetails.timeout
    })
  } catch (error: unknown) {
    console.error('QR Payment route error:', error)
    const message = error instanceof Error ? error.message : 'Unexpected error'
    return NextResponse.json({ status: 0, message }, { status: 500 })
  }
}
