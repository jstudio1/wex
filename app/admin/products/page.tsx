import { createServiceClient } from '@/lib/supabase';
import { requireAdmin } from '@/lib/admin';
import { FormSubmit } from '@/components/ui/form-submit';
import Link from 'next/link';
import { getBaseUrl } from '@/lib/url';
import { Package, ShoppingCart, Users, Tag, Gift, Coins, Globe, Grid3x3 } from 'lucide-react';

async function syncAction() {
  'use server';
  const admin = await requireAdmin();
  if (!admin) return { ok: false, error: 'unauthorized' };
  const secret = process.env.WEBHOOK_SECRET;
  if (!secret) return { ok: false, error: 'missing_secret' };
  const res = await fetch(`${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/api/products/sync`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${secret}` }
  });
  return await res.json();
}

async function getStats() {
  const base = getBaseUrl();
  const res = await fetch(`${base}/api/admin/stats`, { cache: 'no-store' });
  return res.ok ? res.json() : {};
}

export default async function AdminProductsDashboard() {
  const admin = await requireAdmin();
  if (!admin) return <main className="mx-auto max-w-6xl px-4 py-6">Unauthorized</main>;

  const stats = await getStats();

  return (
    <main className="mx-auto max-w-7xl px-4 py-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Admin Dashboard</h1>
        <form action={syncAction}><FormSubmit>Sync จากผู้ให้บริการ</FormSubmit></form>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-3">
        <Link href="/admin/products/manage" className="card p-4 hover:bg-white/5 transition-colors">
          <div className="flex items-center gap-2 mb-2">
            <Package className="size-5 text-blue-400" />
            <span className="text-xs text-[color:var(--text)]/70">บริการ</span>
          </div>
          <div className="text-2xl font-bold">{stats.products || 0}</div>
          <div className="text-xs text-[color:var(--text)]/50 mt-1">เผยแพร่: {stats.publishedProducts || 0}</div>
        </Link>
        <Link href="/admin/categories" className="card p-4 hover:bg-white/5 transition-colors">
          <div className="flex items-center gap-2 mb-2">
            <Grid3x3 className="size-5 text-green-400" />
            <span className="text-xs text-[color:var(--text)]/70">หมวดหมู่</span>
          </div>
          <div className="text-2xl font-bold">{stats.categories || 0}</div>
        </Link>
        <Link href="/orders" className="card p-4 hover:bg-white/5 transition-colors">
          <div className="flex items-center gap-2 mb-2">
            <ShoppingCart className="size-5 text-yellow-400" />
            <span className="text-xs text-[color:var(--text)]/70">คำสั่งซื้อ</span>
          </div>
          <div className="text-2xl font-bold">{stats.orders || 0}</div>
        </Link>
        <Link href="/admin/users" className="card p-4 hover:bg-white/5 transition-colors">
          <div className="flex items-center gap-2 mb-2">
            <Users className="size-5 text-purple-400" />
            <span className="text-xs text-[color:var(--text)]/70">ผู้ใช้</span>
          </div>
          <div className="text-2xl font-bold">{stats.users || 0}</div>
        </Link>
        <Link href="/admin/coupons" className="card p-4 hover:bg-white/5 transition-colors">
          <div className="flex items-center gap-2 mb-2">
            <Tag className="size-5 text-pink-400" />
            <span className="text-xs text-[color:var(--text)]/70">คูปอง</span>
          </div>
          <div className="text-2xl font-bold">{stats.coupons || 0}</div>
        </Link>
        <Link href="/admin/redeem-codes" className="card p-4 hover:bg-white/5 transition-colors">
          <div className="flex items-center gap-2 mb-2">
            <Gift className="size-5 text-orange-400" />
            <span className="text-xs text-[color:var(--text)]/70">โค้ดเติม</span>
          </div>
          <div className="text-2xl font-bold">{stats.redeemCodes || 0}</div>
        </Link>
        <Link href="/admin/popup" className="card p-4 hover:bg-white/5 transition-colors">
          <div className="flex items-center gap-2 mb-2">
            <Coins className="size-5 text-cyan-400" />
            <span className="text-xs text-[color:var(--text)]/70">Popup</span>
          </div>
          <div className="text-2xl font-bold">{stats.popups || 0}</div>
        </Link>
        <Link href="/admin/site" className="card p-4 hover:bg-white/5 transition-colors">
          <div className="flex items-center gap-2 mb-2">
            <Globe className="size-5 text-indigo-400" />
            <span className="text-xs text-[color:var(--text)]/70">ตั้งค่า</span>
          </div>
          <div className="text-2xl font-bold">—</div>
        </Link>
      </div>

      {/* Management Links */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <Link href="/admin/products/manage" className="card p-5 hover:bg-white/5 transition-colors border-l-4 border-blue-500">
          <div className="text-lg font-semibold flex items-center gap-2">
            <Package className="size-5" />
            จัดการบริการ
          </div>
          <div className="text-[color:var(--text)]/70 text-sm mt-1">แก้ไขชื่อ รูปภาพ หมวดหมู่ เปิด/ปิด เผยแพร่ และตั้งค่า Badge</div>
        </Link>
        <Link href="/admin/categories" className="card p-5 hover:bg-white/5 transition-colors border-l-4 border-green-500">
          <div className="text-lg font-semibold flex items-center gap-2">
            <Grid3x3 className="size-5" />
            จัดการหมวดหมู่
          </div>
          <div className="text-[color:var(--text)]/70 text-sm mt-1">สร้าง/แก้ไขหมวดหมู่ และเปิด/ปิด เผยแพร่</div>
        </Link>
        <Link href="/admin/pricing" className="card p-5 hover:bg-white/5 transition-colors border-l-4 border-yellow-500">
          <div className="text-lg font-semibold flex items-center gap-2">
            <Tag className="size-5" />
            ควบคุมราคา (ทั้งเว็บ)
          </div>
          <div className="text-[color:var(--text)]/70 text-sm mt-1">กำหนด Markup เปอร์เซ็นต์/จำนวนเงิน</div>
        </Link>
        <Link href="/admin/coupons" className="card p-5 hover:bg-white/5 transition-colors border-l-4 border-pink-500">
          <div className="text-lg font-semibold flex items-center gap-2">
            <Tag className="size-5" />
            จัดการคูปองส่วนลด
          </div>
          <div className="text-[color:var(--text)]/70 text-sm mt-1">สร้าง/แก้ไข/ลบคูปองส่วนลด แบบ % หรือจำนวนเงิน</div>
        </Link>
        <Link href="/admin/redeem-codes" className="card p-5 hover:bg-white/5 transition-colors border-l-4 border-orange-500">
          <div className="text-lg font-semibold flex items-center gap-2">
            <Gift className="size-5" />
            จัดการโค้ดเติมพอยต์
          </div>
          <div className="text-[color:var(--text)]/70 text-sm mt-1">สร้าง/แก้ไข/ลบโค้ดสำหรับเติมพอยต์ให้ผู้ใช้</div>
        </Link>
        <Link href="/admin/site" className="card p-5 hover:bg-white/5 transition-colors border-l-4 border-indigo-500">
          <div className="text-lg font-semibold flex items-center gap-2">
            <Globe className="size-5" />
            ตั้งค่าเว็บ
          </div>
          <div className="text-[color:var(--text)]/70 text-sm mt-1">จัดการข้อมูลเว็บไซต์ ภาพสไลด์ Flash Sale ป้ายประกาศ และ Popup</div>
        </Link>
      </div>
    </main>
  );
}


