import { headers } from 'next/headers';

const FALLBACK_BASE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ||
  process.env.SITE_URL ||
  (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : null) ||
  'http://localhost:3000';

const IS_STATIC_BUILD = process.env.NEXT_PHASE === 'phase-production-build';

function firstHeaderValue(value: string | null): string | null {
  if (!value) return null;
  const [first] = value.split(',');
  return first?.trim() || null;
}

export function getBaseUrl(): string {
  if (typeof window !== 'undefined') {
    return window.location.origin;
  }

  if (!IS_STATIC_BUILD) {
    try {
      const h = headers();
      const proto = firstHeaderValue(h.get('x-forwarded-proto')) ?? 'http';
      const host =
        firstHeaderValue(h.get('x-forwarded-host')) ??
        firstHeaderValue(h.get('host'));
      if (host) {
        return `${proto}://${host.replace(/^\/*/, '')}`;
      }
    } catch {
      // headers() is unavailable during static rendering or when no request context exists
    }
  }

  return FALLBACK_BASE_URL;
}



