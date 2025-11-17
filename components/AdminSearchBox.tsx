'use client';

import { useEffect, useState } from 'react';
import { InputGroup, InputGroupAddon, InputGroupInput } from '@/components/ui/input-group';
import { SearchIcon } from 'lucide-react';

export default function AdminSearchBox() {
  const [q, setQ] = useState('');

  useEffect(() => {
    const query = q.trim().toLowerCase();
    const cards = document.querySelectorAll<HTMLElement>('[data-admin-product]');
    cards.forEach((el) => {
      const text = (el.dataset.searchText || '').toLowerCase();
      const show = !query || text.includes(query);
      el.style.display = show ? '' : 'none';
    });
  }, [q]);

  return (
    <div className="flex justify-center mb-4">
      <InputGroup>
        <InputGroupInput placeholder="ค้นหาชื่อหรือคีย์บริการ..." value={q} onChange={(e) => setQ(e.target.value)} />
        <InputGroupAddon>
          <SearchIcon size={16} />
        </InputGroupAddon>
      </InputGroup>
    </div>
  );
}


