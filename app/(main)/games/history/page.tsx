import { redirect } from 'next/navigation';
import { getAuthUser } from '@/lib/auth';
import GameHistoryClient from './GameHistoryClient';

export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const fetchCache = 'force-no-store';

export default async function GameHistoryPage() {
  const user = await getAuthUser();
  if (!user) {
    redirect('/login');
  }

  return <GameHistoryClient />;
}


