import NavBar from '@/components/NavBar';
import Footer from '@/components/Footer';
import BottomNav from '@/components/BottomNav';
import dynamic from 'next/dynamic';
const AnnouncementBar = dynamic(() => import('@/components/AnnouncementBar'), { loading: () => null });

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <NavBar />
      <AnnouncementBar />
      <div className="flex min-h-screen flex-col">
        <main className="flex-1 pb-16 pt-4 lg:pb-0">
          {children}
        </main>
        <div className="pb-16 lg:pb-0"><Footer /></div>
      </div>
      <BottomNav />
    </>
  );
}

