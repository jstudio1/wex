import { NextResponse } from 'next/server'

const BASE = process.env.QR_BASE_URL || 'http://154.215.14.36:4001'

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const { amount, ref1 } = body
    if (!amount || amount <= 0 || !ref1) {
      return NextResponse.json({ status: 0, message: 'Invalid amount or missing ref1' }, { status: 400 })
    }
    
    // แปลง amount เป็นจำนวนเต็ม (บาท) ตามที่ API ต้องการ
    const amountInt = Math.round(Number(amount))
    if (amountInt <= 0 || amountInt > 1000000) {
      return NextResponse.json({ status: 0, message: 'Amount must be between 1 and 1,000,000' }, { status: 400 })
    }
    
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 30000) // 30 seconds timeout
    
    try {
      const res = await fetch(`${BASE}/create_payment`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount: amountInt, ref1: String(ref1) }),
        signal: controller.signal
      })
      clearTimeout(timeoutId)
      
      if (!res.ok) {
        const errorText = await res.text()
        console.error('QR API Error:', res.status, errorText)
        return NextResponse.json({ status: 0, message: `QR API error: ${res.status}` }, { status: res.status })
      }
      
      const json = await res.json()
      return NextResponse.json(json)
    } catch (fetchError: unknown) {
      clearTimeout(timeoutId)
      if (fetchError instanceof Error && fetchError.name === 'AbortError') {
        return NextResponse.json({ status: 0, message: 'Request timeout' }, { status: 504 })
      }
      throw fetchError
    }
  } catch (e: unknown) {
    console.error('QR Payment route error:', e)
    const msg = e instanceof Error ? e.message : 'Unexpected error'
    return NextResponse.json({ status: 0, message: msg }, { status: 500 })
  }
}
