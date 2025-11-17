import { redirect } from 'next/navigation';
import { getAuthUser } from '@/lib/auth';
import GamesPageClient from './GamesPageClient';

export default async function GamesPage() {
  const user = await getAuthUser();
  if (!user) {
    redirect('/login');
  }

  return <GamesPageClient />;
}

