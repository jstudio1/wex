import NavBar from '@/components/NavBar';
import dynamic from 'next/dynamic';
const AnnouncementBar = dynamic(() => import('@/components/AnnouncementBar'), { ssr: false, loading: () => null });

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <NavBar />
      <AnnouncementBar />
      <div className="pt-4">
        {children}
      </div>
    </>
  );
}

