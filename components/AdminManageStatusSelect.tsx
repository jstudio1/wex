'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { DropdownMenu, DropdownMenuContent, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger, DropdownMenuCheckboxItem } from '@/components/ui/dropdown-menu';

export default function AdminManageStatusSelect() {
  const sp = useSearchParams();
  const router = useRouter();
  const cur = (sp && sp.get('filter')) || 'all';
  const label = cur === 'published' ? 'ที่เผยแพร่' : cur === 'unpublished' ? 'ที่ไม่เผยแพร่' : 'ทั้งหมด';

  function push(val: string) {
    const params = new URLSearchParams(sp?.toString() || '');
    if (val === 'all') params.delete('filter');
    else params.set('filter', val);
    router.push(`/admin/products/manage?${params.toString()}`);
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button className="w-[200px] justify-between inline-flex items-center rounded-md border border-white/15 bg-white/5 px-3 py-2 text-sm text-[color:var(--text)] hover:bg-white/10">
          <span>แสดง: {label}</span>
          <span className="i-chevron-down" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-[200px]">
        <DropdownMenuLabel>กรองรายการ</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuCheckboxItem checked={cur === 'all'} onCheckedChange={() => push('all')}>ทั้งหมด</DropdownMenuCheckboxItem>
        <DropdownMenuCheckboxItem checked={cur === 'published'} onCheckedChange={() => push('published')}>ที่เผยแพร่</DropdownMenuCheckboxItem>
        <DropdownMenuCheckboxItem checked={cur === 'unpublished'} onCheckedChange={() => push('unpublished')}>ที่ไม่เผยแพร่</DropdownMenuCheckboxItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}


