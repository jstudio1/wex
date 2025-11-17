'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { InputGroup, InputGroupAddon, InputGroupInput } from '@/components/ui/input-group';
import { SpinnerCustom } from '@/components/ui/spinner';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/components/ui/use-toast';
import { DropdownMenu, DropdownMenuContent, DropdownMenuCheckboxItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { SearchIcon, ChevronDown, Settings, Package } from 'lucide-react';
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from '@/components/ui/empty';
import Link from 'next/link';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

interface Product {
  id: number;
  name: string;
  key: string;
  image_url: string | null;
  is_published: boolean;
}

export default function PricingContent() {
  const toast = useToast();
  const [loading, setLoading] = useState(true);
  const [products, setProducts] = useState<Product[]>([]);
  const [filter, setFilter] = useState<'all' | 'published' | 'unpublished'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    fetchData();
  }, [filter]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/products?filter=${filter}`);
      if (!res.ok) throw new Error('ไม่สามารถโหลดข้อมูลได้');
      const json = await res.json();
      setProducts(json.data || []);
    } catch (err) {
      toast.show({
        title: 'เกิดข้อผิดพลาด',
        description: (err as Error).message,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleFilterChange = (newFilter: 'all' | 'published' | 'unpublished') => {
    setFilter(newFilter);
  };

  const filterLabel = filter === 'published' ? 'ที่เผยแพร่' : filter === 'unpublished' ? 'ที่ไม่เผยแพร่' : 'ทั้งหมด';

  const filteredProducts = products.filter((p) => {
    const query = searchQuery.toLowerCase();
    return p.name?.toLowerCase().includes(query) || p.key?.toLowerCase().includes(query);
  });

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <Skeleton className="h-8 w-48" />
        </div>
        <div className="space-y-2">
          {Array.from({ length: 10 }).map((_, i) => (
            <div key={i} className="card p-4 flex items-center justify-between flex-wrap gap-2">
              <div className="flex-1 min-w-[200px]">
                <Skeleton className="h-6 w-48 mb-2" />
                <Skeleton className="h-4 w-32" />
              </div>
              <div className="flex items-center gap-2">
                <Skeleton className="h-10 w-32" />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <h2 className="text-2xl font-bold text-white">ตั้งค่าราคาเติมเกม</h2>
      </div>

      <div className="flex justify-between items-center flex-wrap gap-4">
        <div className="flex-1 min-w-[200px] max-w-md">
          <InputGroup>
            <InputGroupInput
              placeholder="ค้นหาชื่อหรือคีย์บริการ..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            <InputGroupAddon>
              <SearchIcon size={16} />
            </InputGroupAddon>
          </InputGroup>
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" className="w-[200px] justify-between text-gray-300 border-gray-700 hover:bg-gray-800">
              <span className="font-medium">แสดง: {filterLabel}</span>
              <ChevronDown className="size-4 text-gray-400" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="w-[200px] bg-[#0a0a0a] border-gray-800">
            <DropdownMenuLabel className="text-white">กรองรายการ</DropdownMenuLabel>
            <DropdownMenuSeparator className="bg-gray-800" />
            <DropdownMenuCheckboxItem
              checked={filter === 'all'}
              onCheckedChange={() => handleFilterChange('all')}
              className="text-white hover:bg-gray-800"
            >
              ทั้งหมด
            </DropdownMenuCheckboxItem>
            <DropdownMenuCheckboxItem
              checked={filter === 'published'}
              onCheckedChange={() => handleFilterChange('published')}
              className="text-white hover:bg-gray-800"
            >
              ที่เผยแพร่
            </DropdownMenuCheckboxItem>
            <DropdownMenuCheckboxItem
              checked={filter === 'unpublished'}
              onCheckedChange={() => handleFilterChange('unpublished')}
              className="text-white hover:bg-gray-800"
            >
              ที่ไม่เผยแพร่
            </DropdownMenuCheckboxItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <div className="rounded-xl border border-gray-800 bg-[#0a0a0a] shadow-sm overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="border-gray-800 bg-gray-900/50 hover:bg-gray-900/50">
              <TableHead className="w-[60px] text-white">รูป</TableHead>
              <TableHead className="text-white">ชื่อบริการ</TableHead>
              <TableHead className="w-[150px] text-white">คีย์</TableHead>
              <TableHead className="w-[120px] text-white">สถานะ</TableHead>
              <TableHead className="w-[150px] text-right text-white">จัดการ</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredProducts.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-8">
                  <Empty className="from-gray-900/50 to-black h-full bg-gradient-to-b from-30%">
                    <EmptyHeader>
                      <EmptyMedia variant="icon">
                        <Package className="size-6 text-emerald-500" />
                      </EmptyMedia>
                      <EmptyTitle className="text-white">ไม่พบบริการ</EmptyTitle>
                      <EmptyDescription className="text-gray-400">
                        ลองค้นหาด้วยคำอื่น หรือเพิ่มบริการใหม่
                      </EmptyDescription>
                    </EmptyHeader>
                  </Empty>
                </TableCell>
              </TableRow>
            ) : (
              filteredProducts.map((product) => (
                <TableRow key={product.id} className="border-gray-800 hover:bg-gray-900/30">
                  <TableCell>
                    {product.image_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={product.image_url}
                        alt={product.name}
                        className="h-10 w-10 rounded object-cover border border-gray-800"
                      />
                    ) : (
                      <div className="h-10 w-10 rounded bg-gray-800 border border-gray-800" />
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="font-medium text-white">{product.name}</div>
                  </TableCell>
                  <TableCell>
                    <div className="text-sm text-gray-400 font-mono">{product.key}</div>
                  </TableCell>
                  <TableCell>
                    <span
                      className={`text-xs px-2 py-1 rounded whitespace-nowrap ${
                        product.is_published
                          ? 'bg-emerald-900/30 text-emerald-400 border border-emerald-800'
                          : 'bg-gray-800 text-gray-400 border border-gray-700'
                      }`}
                    >
                      {product.is_published ? 'เผยแพร่' : 'ยังไม่เผยแพร่'}
                    </span>
                  </TableCell>
                  <TableCell className="text-right">
                    <Link
                      href={`/backoffice/products/${product.id}/pricing`}
                      className="inline-flex items-center justify-center rounded-md border border-emerald-600/30 bg-emerald-900/20 hover:bg-emerald-900/30 text-emerald-400 px-3 py-1.5 text-xs font-medium transition-colors gap-1.5"
                    >
                      <Settings className="size-3" />
                      ตั้งราคา
                    </Link>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

