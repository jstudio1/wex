import type { MetadataRoute } from 'next';
import { getBaseUrl } from '@/lib/url';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = getBaseUrl();
  const urls: MetadataRoute.Sitemap = [
    { url: `${base}/`, changeFrequency: 'daily', priority: 1.0 },
    { url: `${base}/products`, changeFrequency: 'daily', priority: 0.8 },
    { url: `${base}/categories`, changeFrequency: 'daily', priority: 0.7 },
  ];

  try {
    const [productsRes, categoriesRes] = await Promise.all([
      fetch(`${base}/api/products`, { cache: 'no-store' }),
      fetch(`${base}/api/categories`, { cache: 'no-store' }),
    ]);
    if (productsRes.ok) {
      const pj = await productsRes.json();
      for (const p of pj?.data || []) {
        if (p?.key) urls.push({ url: `${base}/products/${p.key}`, changeFrequency: 'weekly', priority: 0.6 });
      }
    }
    if (categoriesRes.ok) {
      const cj = await categoriesRes.json();
      for (const c of cj?.data || []) {
        if (c?.slug) urls.push({ url: `${base}/categories/${c.slug}`, changeFrequency: 'weekly', priority: 0.5 });
      }
    }
  } catch {}

  return urls;
}


