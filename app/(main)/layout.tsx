import NavBar from '@/components/NavBar';
import dynamic from 'next/dynamic';
const AnnouncementBar = dynamic(() => import('@/components/AnnouncementBar'), { ssr: false, loading: () => null });

export default function MainLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <NavBar />
      <AnnouncementBar />
      {children}
    </>
  );
}

