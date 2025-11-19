import NavBar from '@/components/NavBar';
import Footer from '@/components/Footer';
import dynamic from 'next/dynamic';
const AnnouncementBar = dynamic(() => import('@/components/AnnouncementBar'), { ssr: false, loading: () => null });

export default function MainLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <NavBar />
      <AnnouncementBar />
      <div className="flex min-h-screen flex-col">
        <main className="flex-1">
          {children}
        </main>
        <Footer />
      </div>
    </>
  );
}

