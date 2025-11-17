import { redirect } from 'next/navigation';
import { getAuthUser } from '@/lib/auth';
import GameHistoryClient from './GameHistoryClient';

export default async function GameHistoryPage() {
  const user = await getAuthUser();
  if (!user) {
    redirect('/login');
  }

  return <GameHistoryClient />;
}


