const FALLBACK_BASE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ||
  process.env.SITE_URL ||
  (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : null) ||
  'http://localhost:3000';

export function getBaseUrl(): string {
  if (typeof window !== 'undefined') {
    return window.location.origin;
  }

  return FALLBACK_BASE_URL;
}



