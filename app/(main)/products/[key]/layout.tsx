import type { Metadata } from 'next';

type Props = { children: React.ReactNode; params: { key: string } };

export async function generateMetadata({ params }: { params: { key: string } }): Promise<Metadata> {
  const base = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';
  try {
    const res = await fetch(`${base}/api/products/${encodeURIComponent(params.key)}`, { cache: 'no-store' });
    if (!res.ok) return {};
    const json = await res.json();
    const data = json?.data;
    if (!data) return {};
    const title = `${data.name}`;
    const description = data?.badge?.text ? `${data.name} — ${data.badge.text}` : `${data.name} ราคาดี พร้อมตัวเลือกที่หลากหลาย`;
    const url = `/products/${params.key}`;
    const images = data.image_url ? [String(data.image_url)] : undefined;
    return {
      title,
      description,
      keywords: [data.name, 'เติมเกม', 'ซื้อไอเท็ม', 'ราคาถูก', 'โปร', 'ส่วนลด', 'wexplus'],
      alternates: { canonical: url },
      openGraph: {
        title,
        description,
        url,
        type: 'website',
        images,
      },
      twitter: {
        card: 'summary_large_image',
        title,
        description,
        images,
      },
    };
  } catch {
    return {};
  }
}

export default function ProductLayout({ children }: Props) {
  return children;
}


