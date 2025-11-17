'use client';

import { useMemo, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuCheckboxItem, DropdownMenuContent, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';

export default function AdminProductsFilter() {
  const sp = useSearchParams();
  const router = useRouter();
  const filter = (sp && sp.get('filter')) || 'all';
  const [all, setAll] = useState(filter === 'all');
  const [pub, setPub] = useState(filter === 'published');
  const [unpub, setUnpub] = useState(filter === 'unpublished');

  const label = useMemo(() => {
    if (pub) return 'ที่เผยแพร่';
    if (unpub) return 'ที่ไม่เผยแพร่';
    return 'ทั้งหมด';
  }, [pub, unpub]);

  function pushFilter(val: string) {
    const params = new URLSearchParams(sp?.toString() || '');
    if (val === 'all') params.delete('filter');
    else params.set('filter', val);
    router.push(`/admin/products?${params.toString()}`);
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline">แสดง: {label}</Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-56">
        <DropdownMenuLabel>กรองรายการ</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuCheckboxItem checked={all} onCheckedChange={(v) => { setAll(v); setPub(false); setUnpub(false); pushFilter('all'); }}>ทั้งหมด</DropdownMenuCheckboxItem>
        <DropdownMenuCheckboxItem checked={pub} onCheckedChange={(v) => { setAll(false); setPub(v); setUnpub(false); pushFilter('published'); }}>ที่เผยแพร่</DropdownMenuCheckboxItem>
        <DropdownMenuCheckboxItem checked={unpub} onCheckedChange={(v) => { setAll(false); setPub(false); setUnpub(v); pushFilter('unpublished'); }}>ที่ไม่เผยแพร่</DropdownMenuCheckboxItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}


