import { requireAdmin } from '@/lib/admin';
import AdminSiteForm from '@/components/AdminSiteForm';

export default async function AdminSitePage() {
  const admin = await requireAdmin();
  if (!admin) return <main className="mx-auto max-w-4xl px-4 py-6">Unauthorized</main>;
  return (
    <main className="mx-auto max-w-4xl px-4 py-6 space-y-4">
      <h1 className="text-xl font-semibold">ตั้งค่าเว็บไซต์</h1>
      {/* client form handles fetch+save+alert */}
      <AdminSiteForm />
    </main>
  );
}


