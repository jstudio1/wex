import { NextResponse } from 'next/server'

const BASE = process.env.QR_BASE_URL || 'http://154.215.14.36:4001'

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    const id_pay = searchParams.get('id_pay')
    if (!id_pay) return NextResponse.json({ status: 'ERROR', message: 'missing id_pay' }, { status: 400 })
    const res = await fetch(`${BASE}/api/payment_status?id_pay=${encodeURIComponent(id_pay)}`)
    const json = await res.json()
    return NextResponse.json(json, { status: res.status })
  } catch {
    return NextResponse.json({ status: 'ERROR' }, { status: 500 })
  }
}










