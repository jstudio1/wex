import { ReactNode } from 'react';
import { getAuthUser } from '@/lib/auth';
import { requireAdmin } from '@/lib/admin';
import { redirect } from 'next/navigation';
import dynamic from 'next/dynamic';

const PricingLayoutClient = dynamic(() => import('./layout-client'));

export default async function PricingLayout({ children }: { children: ReactNode }) {
  const user = await getAuthUser();
  const admin = await requireAdmin();
  
  if (!user || !admin) {
    redirect('/');
  }

  return <PricingLayoutClient>{children}</PricingLayoutClient>;
}

