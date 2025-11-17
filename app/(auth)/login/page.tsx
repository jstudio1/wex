import dynamic from 'next/dynamic';
import { redirect } from 'next/navigation';
import { getAuthUser } from '@/lib/auth';

const LoginClient = dynamic(() => import('./LoginClient'));

export default async function LoginPage() {
  const user = await getAuthUser();
  if (user) {
    redirect('/');
  }
  return <LoginClient />;
}


