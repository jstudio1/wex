'use client';

import * as React from 'react';
import { Search } from 'lucide-react';
import { cn } from '@/lib/utils';

const CommandContext = React.createContext<{
  search: string;
  setSearch: (value: string) => void;
  visibleItemsCount: number;
  setVisibleItemsCount: (count: number) => void;
}>({
  search: '',
  setSearch: () => {},
  visibleItemsCount: 0,
  setVisibleItemsCount: () => {},
});

export function Command({ children, className }: { children: React.ReactNode; className?: string }) {
  const [search, setSearch] = React.useState('');
  const [visibleItemsCount, setVisibleItemsCount] = React.useState(0);
  return (
    <CommandContext.Provider value={{ search, setSearch, visibleItemsCount, setVisibleItemsCount }}>
      <div className={cn('flex flex-col rounded-md border border-white/10 bg-[color:var(--bg)] overflow-hidden', className)}>
        {children}
      </div>
    </CommandContext.Provider>
  );
}

export function CommandInput({
  placeholder,
  className,
  value,
  onValueChange,
}: {
  placeholder?: string;
  className?: string;
  value?: string;
  onValueChange?: (value: string) => void;
}) {
  const { search, setSearch } = React.useContext(CommandContext);
  const controlledValue = value !== undefined ? value : search;
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    if (onValueChange) {
      onValueChange(newValue);
    } else {
      setSearch(newValue);
    }
  };
  React.useEffect(() => {
    if (value !== undefined && value !== search) {
      setSearch(value);
    }
  }, [value, search, setSearch]);
  return (
    <div className="flex items-center border-b border-white/10 px-3">
      <Search className="mr-2 h-4 w-4 shrink-0 opacity-50" />
      <input
        type="text"
        placeholder={placeholder}
        value={controlledValue}
        onChange={handleChange}
        className={cn(
          'flex h-9 w-full rounded-md bg-transparent py-1 text-sm outline-none placeholder:text-[color:var(--text)]/50 disabled:cursor-not-allowed disabled:opacity-50',
          className
        )}
      />
    </div>
  );
}

export function CommandList({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={cn('max-h-[300px] overflow-y-auto overflow-x-hidden p-1', className)}>
      {children}
    </div>
  );
}

export function CommandEmpty({ children, className }: { children: React.ReactNode; className?: string }) {
  const { search, visibleItemsCount } = React.useContext(CommandContext);
  // แสดงเฉพาะเมื่อมีการค้นหา และไม่มีรายการใดที่ผ่านการกรอง
  if (search.trim() && visibleItemsCount === 0) {
    return <div className={cn('py-6 text-center text-sm text-[color:var(--text)]/50', className)}>{children}</div>;
  }
  return null;
}

export function CommandGroup({ children, className }: { children: React.ReactNode; className?: string }) {
  const { setVisibleItemsCount } = React.useContext(CommandContext);
  const childrenArray = React.Children.toArray(children);
  const visibleCount = childrenArray.filter((child) => child !== null).length;
  
  React.useEffect(() => {
    setVisibleItemsCount(visibleCount);
  }, [visibleCount, setVisibleItemsCount]);
  
  return <div className={cn('overflow-hidden p-1', className)}>{children}</div>;
}

export function CommandItem({
  children,
  value,
  onSelect,
  className,
}: {
  children: React.ReactNode;
  value: string;
  onSelect: (currentValue: string) => void;
  className?: string;
}) {
  const { search } = React.useContext(CommandContext);
  const itemValue = value.toLowerCase();
  const searchLower = search.toLowerCase().trim();
  
  // ถ้ามีการค้นหา แต่ค่าที่ค้นหาไม่ตรงกับรายการนี้ ให้ซ่อนรายการนี้
  if (searchLower && !itemValue.includes(searchLower)) {
    return null;
  }

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => onSelect(value)}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onSelect(value);
        }
      }}
      className={cn(
        'relative flex cursor-pointer select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none hover:bg-white/10 hover:text-[color:var(--text)] focus:bg-white/10 focus:text-[color:var(--text)] aria-selected:bg-white/10',
        className
      )}
    >
      {children}
    </div>
  );
}

