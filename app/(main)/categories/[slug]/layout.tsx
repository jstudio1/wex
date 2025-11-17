import type { Metadata } from 'next';

type Props = { children: React.ReactNode; params: { slug: string } };

export async function generateMetadata({ params }: { params: { slug: string } }): Promise<Metadata> {
  const base = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';
  try {
    const res = await fetch(`${base}/api/categories`, { cache: 'no-store' });
    if (!res.ok) return {};
    const json = await res.json();
    const list = json?.data || [];
    const cat = list.find((c: any) => c.slug === params.slug);
    if (!cat) return {};
    const title = `${cat.name}`;
    const description = `หมวดหมู่ ${cat.name} — บริการ/สินค้าในหมวดนี้`;
    const url = `/categories/${params.slug}`;
    return {
      title,
      description,
      keywords: [cat.name, 'หมวดหมู่', 'เติมเกม', 'สินค้าเกม', 'บริการเกม', 'WeXPlus'],
      alternates: { canonical: url },
      openGraph: {
        title,
        description,
        url,
        type: 'website',
      },
      twitter: {
        card: 'summary',
        title,
        description,
      },
    };
  } catch {
    return {};
  }
}

export default function CategoryLayout({ children }: Props) {
  return children;
}


