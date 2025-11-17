'use client';

import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import clsx from 'clsx';

type Props = {
  href?: string;
  className?: string;
  label?: string;
};

export default function AdminBackButton({ href = '/admin/products', className, label = 'ย้อนกลับ' }: Props) {
  return (
    <Link
      href={href}
      className={clsx('inline-flex items-center gap-2 rounded-md border border-white/20 px-3 py-2 text-xs hover:bg-white/10', className)}
      aria-label={label}
    >
      <ArrowLeft className="size-4" />
      <span>{label}</span>
    </Link>
  );
}











