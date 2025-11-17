'use client';

import { useRowScrollAnimation } from '@/hooks/useRowScrollAnimation';
import { Check, X, ChevronRight as ChevronRightIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Link from 'next/link';

type SocialService = {
  id: number;
  provider_service_id: number;
  display_name: string;
  price_per_1000: number;
  min_quantity: number;
  max_quantity: number;
  refill: boolean;
  cancel: boolean;
};

type Props = {
  service: SocialService;
  index: number;
  formatCurrency: (value: number) => string;
  onOrder: (serviceId: number) => void;
};

export default function AnimatedSocialServiceRow({ service: svc, index, formatCurrency, onOrder }: Props) {
  const { ref, isVisible } = useRowScrollAnimation();

  return (
    <tr 
      ref={ref}
      className={`hover:bg-white/5 transition-all cursor-pointer md:cursor-default ${
        isVisible 
          ? 'opacity-100 translate-x-0' 
          : 'opacity-0 -translate-x-4'
      }`}
      style={{
        transition: 'opacity 0.5s ease-out, transform 0.5s ease-out',
        transitionDelay: isVisible ? `${index * 30}ms` : '0ms'
      }}
      onClick={() => {
        // บนมือถือให้คลิกแถวไปหน้า add ได้เลย
        if (window.innerWidth < 768) {
          onOrder(svc.id);
        }
      }}
    >
      <td className="px-4 py-3">
        <div className="font-normal text-[color:var(--text)]">{svc.display_name}</div>
      </td>
      <td className="px-4 py-3">
        <div className="text-[color:var(--text)] font-medium">{formatCurrency(svc.price_per_1000)}</div>
      </td>
      <td className="px-4 py-3 text-center text-[color:var(--text)]/80">
        {svc.min_quantity.toLocaleString()}
      </td>
      <td className="px-4 py-3 text-center text-[color:var(--text)]/80">
        {svc.max_quantity.toLocaleString()}
      </td>
      <td className="px-4 py-3 text-center">
        {svc.refill ? (
          <Check className="size-5 text-emerald-500 mx-auto" />
        ) : (
          <X className="size-5 text-red-500 mx-auto" />
        )}
      </td>
      <td className="px-4 py-3 text-center">
        {svc.cancel ? (
          <Check className="size-5 text-emerald-500 mx-auto" />
        ) : (
          <X className="size-5 text-red-500 mx-auto" />
        )}
      </td>
      <td className="px-4 py-3 text-center">
        <Button 
          size="sm" 
          onClick={(e) => {
            e.stopPropagation();
            onOrder(svc.id);
          }}
        >
          สั่งซื้อ
        </Button>
      </td>
    </tr>
  );
}

