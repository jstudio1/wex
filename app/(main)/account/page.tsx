import { redirect } from 'next/navigation';
import { getAuthUser } from '@/lib/auth';
import { createServiceClient } from '@/lib/supabase';
import { cache } from 'react';
import AccountClient from './AccountClient';

interface ProfileData {
  id: number;
  username: string;
  created_at: string;
  updated_at: string;
  points: number;
  is_admin: boolean;
}

const fetchProfile = cache(async (userId: number): Promise<ProfileData | null> => {
  try {
    const sb = createServiceClient();
    const { data, error } = await sb
      .from('users')
      .select('id, username, created_at, updated_at, points, is_admin')
      .eq('id', userId)
      .maybeSingle();

    if (error || !data) {
      return null;
    }

    return {
      id: data.id,
      username: data.username,
      created_at: data.created_at,
      updated_at: data.updated_at,
      points: Number(data.points),
      is_admin: data.is_admin,
    };
  } catch (err) {
    console.error('Failed to fetch profile', err);
    return null;
  }
});

export default async function AccountPage() {
  const user = await getAuthUser();
  if (!user) {
    redirect('/login');
  }

  const profile = await fetchProfile(user.id);
  if (!profile) {
    redirect('/login');
  }

  return <AccountClient profile={profile} />;
}
