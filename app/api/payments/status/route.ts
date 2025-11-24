import { NextResponse } from 'next/server'
import { getPayment, markPaymentTimeout } from '@/lib/qr-payments-store'

export const dynamic = 'force-dynamic'

function noStoreHeaders() {
  return {
    'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0',
    Pragma: 'no-cache',
    Expires: '0',
  }
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const idPay = searchParams.get('id_pay')
  if (!idPay) {
    return NextResponse.json({ status: 'ERROR', message: 'missing id_pay' }, { status: 400, headers: noStoreHeaders() })
  }

  let payment = await getPayment(idPay)
  if (!payment) {
    return NextResponse.json({ status: 'NOT_FOUND' }, { status: 404, headers: noStoreHeaders() })
  }

  if (
    payment.status === 'PENDING' &&
    typeof payment.expiresAt === 'number' &&
    payment.expiresAt > 0 &&
    Date.now() > payment.expiresAt
  ) {
    payment = (await markPaymentTimeout(idPay)) ?? payment
  }

  return NextResponse.json(
    {
      status: payment.status,
      amount: payment.amount,
      ref1: payment.ref1,
      created_at: payment.createdAt,
      paid_at: payment.paidAt ?? null
    },
    { headers: noStoreHeaders() }
  )
}










