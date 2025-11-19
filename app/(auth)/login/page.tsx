import { redirect } from 'next/navigation';
import { Suspense } from 'react';
import { getAuthUser } from '@/lib/auth';
import LoginClient from './LoginClient';
import { Spinner } from '@/components/ui/spinner';

export default async function LoginPage({
  searchParams,
}: {
  searchParams: { redirect?: string };
}) {
  const user = await getAuthUser();
  if (user) {
    const redirectTo = searchParams?.redirect || '/';
    redirect(redirectTo);
  }
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <Spinner className="size-8" />
      </div>
    }>
      <LoginClient />
    </Suspense>
  );
}


