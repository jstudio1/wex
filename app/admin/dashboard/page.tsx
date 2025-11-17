import { requireAdmin } from '@/lib/admin';
import { getBaseUrl } from '@/lib/url';
import Link from 'next/link';
import { Package, ShoppingCart, Users, Tag, Gift, Coins, Globe, Grid3x3, ArrowRight } from 'lucide-react';

async function getStats() {
  const base = getBaseUrl();
  const res = await fetch(`${base}/api/admin/stats`, { cache: 'no-store' });
  return res.ok ? res.json() : {};
}

export default async function AdminDashboardPage() {
  const admin = await requireAdmin();
  if (!admin) return <main className="mx-auto max-w-6xl px-4 py-6">Unauthorized</main>;

  const stats = await getStats();

  const crudSections = [
    {
      title: 'บริการ',
      href: '/admin/products/manage',
      icon: Package,
      color: 'blue',
      count: stats.products || 0,
      description: 'จัดการบริการ (Create, Read, Update, Delete)',
    },
    {
      title: 'หมวดหมู่',
      href: '/admin/categories',
      icon: Grid3x3,
      color: 'green',
      count: stats.categories || 0,
      description: 'จัดการหมวดหมู่ (Create, Read, Update, Delete)',
    },
    {
      title: 'คำสั่งซื้อ',
      href: '/orders',
      icon: ShoppingCart,
      color: 'yellow',
      count: stats.orders || 0,
      description: 'ดูและจัดการคำสั่งซื้อ',
    },
    {
      title: 'ผู้ใช้',
      href: '/admin/users',
      icon: Users,
      color: 'purple',
      count: stats.users || 0,
      description: 'จัดการผู้ใช้ (Read, Update, Delete)',
    },
    {
      title: 'คูปองส่วนลด',
      href: '/admin/coupons',
      icon: Tag,
      color: 'pink',
      count: stats.coupons || 0,
      description: 'จัดการคูปอง (Create, Read, Update, Delete)',
    },
    {
      title: 'โค้ดเติมพอยต์',
      href: '/admin/redeem-codes',
      icon: Gift,
      color: 'orange',
      count: stats.redeemCodes || 0,
      description: 'จัดการโค้ดเติมพอยต์ (Create, Read, Update, Delete)',
    },
    {
      title: 'Popup',
      href: '/admin/popup',
      icon: Coins,
      color: 'cyan',
      count: stats.popups || 0,
      description: 'จัดการ Popup (Create, Read, Update, Delete)',
    },
    {
      title: 'ตั้งค่าเว็บ',
      href: '/admin/site',
      icon: Globe,
      color: 'indigo',
      count: null,
      description: 'ตั้งค่าเว็บไซต์ Flash Sale ป้ายประกาศ',
    },
  ];

  const colorClasses = {
    blue: 'border-blue-500 bg-blue-500/10',
    green: 'border-green-500 bg-green-500/10',
    yellow: 'border-yellow-500 bg-yellow-500/10',
    purple: 'border-purple-500 bg-purple-500/10',
    pink: 'border-pink-500 bg-pink-500/10',
    orange: 'border-orange-500 bg-orange-500/10',
    cyan: 'border-cyan-500 bg-cyan-500/10',
    indigo: 'border-indigo-500 bg-indigo-500/10',
  };

  const iconColors = {
    blue: 'text-blue-400',
    green: 'text-green-400',
    yellow: 'text-yellow-400',
    purple: 'text-purple-400',
    pink: 'text-pink-400',
    orange: 'text-orange-400',
    cyan: 'text-cyan-400',
    indigo: 'text-indigo-400',
  };

  return (
    <main className="mx-auto max-w-7xl px-4 py-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl md:text-3xl font-bold">Admin Dashboard</h1>
      </div>

      {/* Statistics Overview */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-3">
        {crudSections.map((section) => {
          const Icon = section.icon;
          return (
            <Link
              key={section.href}
              href={section.href}
              className="card p-4 hover:bg-white/5 transition-colors border-l-4"
              style={{ borderLeftColor: `var(--color-${section.color})` }}
            >
              <div className="flex items-center gap-2 mb-2">
                <Icon className={`size-5 ${iconColors[section.color as keyof typeof iconColors]}`} />
                <span className="text-xs text-[color:var(--text)]/70">{section.title}</span>
              </div>
              <div className="text-2xl font-bold">
                {section.count !== null ? section.count : '—'}
              </div>
            </Link>
          );
        })}
      </div>

      {/* CRUD Management Sections */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {crudSections.map((section) => {
          const Icon = section.icon;
          return (
            <Link
              key={section.href}
              href={section.href}
              className={`card p-6 hover:bg-white/5 transition-colors border-l-4 ${colorClasses[section.color as keyof typeof colorClasses]}`}
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className={`p-3 rounded-lg ${colorClasses[section.color as keyof typeof colorClasses]}`}>
                    <Icon className={`size-6 ${iconColors[section.color as keyof typeof iconColors]}`} />
                  </div>
                  <div>
                    <h2 className="text-lg font-semibold">{section.title}</h2>
                    {section.count !== null && (
                      <p className="text-sm text-[color:var(--text)]/50">{section.count} รายการ</p>
                    )}
                  </div>
                </div>
                <ArrowRight className="size-5 text-[color:var(--text)]/40" />
              </div>
              <p className="text-sm text-[color:var(--text)]/70">{section.description}</p>
            </Link>
          );
        })}
      </div>
    </main>
  );
}

