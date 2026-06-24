const FALLBACK_BASE_URL = (
  process.env.NEXT_PUBLIC_SITE_URL ||
  process.env.SITE_URL ||
  (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : null) ||
  'http://localhost:3000'
).replace(/\/+$/, ''); // ตัด trailing slash กัน URL กลายเป็น //api/... (double slash)

export function getBaseUrl(): string {
  if (typeof window !== 'undefined') {
    return window.location.origin;
  }

  // ตอนรัน dev/local ต้อง fetch ข้อมูลตัวเองจาก localhost เสมอ ไม่ใช่จาก SITE_URL (production)
  // ไม่งั้นหน้าที่ fetch ตัวเอง (SSR) จะไปดึงข้อมูลจาก production จริงแทนของ local ที่กำลังทดสอบอยู่
  if (process.env.NODE_ENV !== 'production') {
    return `http://localhost:${process.env.PORT || 3000}`;
  }

  return FALLBACK_BASE_URL;
}



