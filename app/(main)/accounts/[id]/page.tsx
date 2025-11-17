import { notFound, redirect } from 'next/navigation';
import { getBaseUrl } from '@/lib/url';
import { cache } from 'react';
import { CACHE_CONFIG } from '@/lib/cache';
import GameAccountDetailClient from './GameAccountDetailClient';

type GameAccount = {
  id: number;
  game_name: string;
  game_category_id: number | null;
  title: string;
  description: string | null;
  cover_image_url: string | null;
  additional_images: string[];
  price: number;
  original_price?: number | null;
  discount_percent?: number | null;
  stock: number;
  created_at: string;
  game_categories: { id: number; name: string; slug: string } | null;
};

const fetchAccount = cache(async (id: string): Promise<GameAccount | null> => {
  try {
    const base = getBaseUrl();
    const res = await fetch(`${base}/api/game-accounts/${id}`, { next: { revalidate: 120, tags: ['game-accounts'] } });
    if (!res.ok) {
      return null;
    }
      const json = await res.json();
      if (json.ok && json.data) {
        const accountData = json.data;
        const baseTitle = accountData.title.split(' #')[0];
      return {
          ...accountData,
          title: baseTitle
      };
    }
    return null;
    } catch (err) {
      console.error('Failed to fetch account', err);
    return null;
    }
});

export default async function GameAccountDetailPage({ 
  params 
}: { 
  params: { id: string } 
}) {
  const account = await fetchAccount(params.id);

  if (!account) {
    notFound();
  }

  return <GameAccountDetailClient account={account} />;
}
