import { redirect } from 'next/navigation';
import { unstable_noStore as noStore } from 'next/cache';
import { getAuthUser } from '@/lib/auth';
import { createServiceClient } from '@/lib/supabase';
import AccountClient from './AccountClient';

export const dynamic = 'force-dynamic';

interface ProfileData {
  id: number;
  username: string;
  created_at: string;
  updated_at: string;
  points: number;
  is_admin: boolean;
  first_name?: string | null;
  last_name?: string | null;
  email?: string | null;
  phone?: string | null;
  avatar_url?: string | null;
}

async function fetchProfile(userId: number): Promise<ProfileData | null> {
  try {
    const sb = createServiceClient();
    const { data, error } = await sb
      .from('users')
      .select('id, username, created_at, updated_at, points, is_admin, first_name, last_name, email, phone, avatar_url')
      .eq('id', userId)
      .maybeSingle();

    if (error) {
      console.error('Failed to fetch profile - error:', error);
      return null;
    }

    if (!data) {
      console.error('Failed to fetch profile - no data for user:', userId);
      return null;
    }

    return {
      id: data.id,
      username: data.username,
      created_at: data.created_at,
      updated_at: data.updated_at,
      points: Number(data.points),
      is_admin: data.is_admin,
      first_name: data.first_name,
      last_name: data.last_name,
      email: data.email,
      phone: data.phone,
      avatar_url: data.avatar_url,
    };
  } catch (err) {
    console.error('Failed to fetch profile - exception:', err);
    return null;
  }
}

export default async function AccountPage() {
  noStore();
  
  const user = await getAuthUser();
  if (!user) {
    console.log('AccountPage: No user found, redirecting to login');
    redirect('/login?redirect=/account');
  }

  console.log('AccountPage: User found:', user.id, user.username);

  const profile = await fetchProfile(user.id);
  if (!profile) {
    console.log('AccountPage: No profile found for user:', user.id, 'redirecting to login');
    redirect('/login?redirect=/account');
  }

  console.log('AccountPage: Profile loaded successfully:', profile.username);

  return <AccountClient profile={profile} />;
}
