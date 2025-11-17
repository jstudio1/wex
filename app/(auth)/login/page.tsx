import { redirect } from 'next/navigation';
import { getAuthUser } from '@/lib/auth';
import LoginClient from './LoginClient';

export default async function LoginPage() {
  const user = await getAuthUser();
  if (user) {
    redirect('/');
  }
  return <LoginClient />;
}


