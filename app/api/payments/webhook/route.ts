import { NextResponse } from 'next/server'
import crypto from 'node:crypto'
import { getPayment, markPaymentPaid } from '@/lib/qr-payments-store'
import { requireQrConfig } from '@/lib/qr-config'

function parsePayload(req: Request) {
  const contentType = req.headers.get('content-type') || ''
  if (contentType.includes('application/json')) {
    return req.json()
  }
  return req.formData()
}

export const dynamic = 'force-dynamic'

export async function POST(req: Request) {
  try {
    const config = await requireQrConfig()
    const body = await parsePayload(req)
    let dataValue: string | null = null
    let signature: string | null = null

    if (body instanceof FormData) {
      dataValue = body.get('data')?.toString() || null
      signature = body.get('signature')?.toString() || null
    } else {
      dataValue = body?.data ?? null
      signature = body?.signature ?? null
    }

    if (!dataValue || !signature) {
      return NextResponse.json({ status: 0, message: 'Missing data or signature' }, { status: 400 })
    }

    const expected = crypto.createHash('md5').update(`${dataValue}:${config.webhookKey}`).digest('hex')
    if (expected !== signature) {
      return NextResponse.json({ status: 0, message: 'Invalid signature' }, { status: 400 })
    }

    const payload = JSON.parse(dataValue)
    const { id_pay: idPay } = payload
    if (!idPay) {
      return NextResponse.json({ status: 0, message: 'Missing id_pay' }, { status: 400 })
    }

    const payment = await getPayment(idPay)
    if (!payment) {
      return NextResponse.json({ status: 0, message: 'id_pay not found' }, { status: 404 })
    }

    await markPaymentPaid(idPay)
    console.log(`[QR][PAID] id_pay=${idPay} ref1=${payload.ref1 ?? '-'} amount=${payload.amount ?? '-'}`)

    return NextResponse.json({ status: 1 })
  } catch (error) {
    console.error('QR webhook error:', error)
    return NextResponse.json({ status: 0, message: 'Internal error' }, { status: 500 })
  }
}

