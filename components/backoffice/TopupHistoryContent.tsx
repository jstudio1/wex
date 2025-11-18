'use client';

import { useEffect, useMemo, useState } from 'react';
import { RefreshCcw, Search, CreditCard, Wallet2, CheckCircle2, XCircle, Clock, TrendingUp } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/components/ui/use-toast';
import { cn } from '@/lib/utils';

type TopupRecord = {
  id: string;
  sourceId: number;
  type: 'slip' | 'truewallet' | 'redeem';
  methodLabel: string;
  amount: number;
  points: number;
  status: string;
  state: 'success' | 'failed' | 'pending' | 'unknown';
  reference: string;
  note: string | null;
  created_at: string;
  user: {
    id: number | string | null;
    username: string | null;
    email: string | null;
  };
};

type HistoryResponse = {
  data: TopupRecord[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
  summary: {
    totalRecords: number;
    totalAmount: number;
    totalPoints: number;
    successCount: number;
    failedCount: number;
  };
};

const statusStyles: Record<TopupRecord['state'], string> = {
  success: 'bg-green-500/10 text-green-400 border-green-500/40',
  failed: 'bg-red-500/10 text-red-400 border-red-500/40',
  pending: 'bg-amber-500/10 text-amber-300 border-amber-500/40',
  unknown: 'bg-gray-500/10 text-gray-300 border-gray-500/40',
};

const statusIcon: Record<TopupRecord['state'], JSX.Element> = {
  success: <CheckCircle2 className="size-3.5" />,
  failed: <XCircle className="size-3.5" />,
  pending: <Clock className="size-3.5" />,
  unknown: <Clock className="size-3.5" />,
};

const methodOptions = [
  { value: 'all', label: 'ทุกวิธี' },
  { value: 'slip', label: 'โอนสลิป' },
  { value: 'truewallet', label: 'TrueMoney' },
  { value: 'redeem', label: 'โค้ดเติมพอยต์' },
] as const;

const statusOptions = [
  { value: 'all', label: 'สถานะทั้งหมด' },
  { value: 'success', label: 'สำเร็จ' },
  { value: 'pending', label: 'รอดำเนินการ' },
  { value: 'failed', label: 'ไม่สำเร็จ' },
] as const;

const PER_PAGE = 25;

export default function TopupHistoryContent() {
  const toast = useToast();
  const [records, setRecords] = useState<TopupRecord[]>([]);
  const [pagination, setPagination] = useState<HistoryResponse['pagination']>({
    total: 0,
    totalPages: 1,
    page: 1,
    limit: PER_PAGE,
  });
  const [summary, setSummary] = useState<HistoryResponse['summary']>({
    totalRecords: 0,
    totalAmount: 0,
    totalPoints: 0,
    successCount: 0,
    failedCount: 0,
  });
  const [loading, setLoading] = useState<boolean>(true);
  const [method, setMethod] = useState<(typeof methodOptions)[number]['value']>('all');
  const [status, setStatus] = useState<(typeof statusOptions)[number]['value']>('all');
  const [page, setPage] = useState(1);
  const [searchValue, setSearchValue] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(searchValue.trim());
      setPage(1);
    }, 500);
    return () => clearTimeout(handler);
  }, [searchValue]);

  useEffect(() => {
    let abort = false;
    const fetchHistory = async () => {
      setLoading(true);
      try {
        const params = new URLSearchParams({
          page: String(page),
          limit: String(PER_PAGE),
        });
        if (debouncedSearch) params.set('search', debouncedSearch);
        if (method !== 'all') params.set('method', method);
        if (status !== 'all') params.set('status', status);

        const res = await fetch(`/api/admin/topup-history?${params.toString()}`, {
          cache: 'no-store',
        });
        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          throw new Error(body.detail || body.error || 'ไม่สามารถดึงข้อมูลได้');
        }
        const json: HistoryResponse = await res.json();
        if (abort) return;
        setRecords(json.data || []);
        setPagination(
          json.pagination || {
            total: 0,
            totalPages: 1,
            page: 1,
            limit: PER_PAGE,
          }
        );
        setSummary(
          json.summary || {
            totalRecords: 0,
            totalAmount: 0,
            totalPoints: 0,
            successCount: 0,
            failedCount: 0,
          }
        );
      } catch (err) {
        if (abort) return;
        toast.show({
          title: 'โหลดประวัติไม่สำเร็จ',
          description: err instanceof Error ? err.message : 'เกิดข้อผิดพลาดไม่ทราบสาเหตุ',
          variant: 'destructive',
        });
      } finally {
        if (!abort) setLoading(false);
      }
    };

    fetchHistory();
    return () => {
      abort = true;
    };
  }, [page, method, status, debouncedSearch, toast]);

  const formatDate = (value: string) => {
    const date = new Date(value);
    return date.toLocaleString('th-TH', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  };

  const totalPages = Math.max(1, pagination.totalPages || Math.ceil(pagination.total / PER_PAGE));

  const pageDisplay = useMemo(
    () => ({
      from: pagination.total === 0 ? 0 : (page - 1) * PER_PAGE + 1,
      to: Math.min(page * PER_PAGE, pagination.total),
    }),
    [page, pagination.total]
  );

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h2 className="text-2xl font-semibold text-white">ประวัติการเติมเงิน</h2>
        <p className="text-sm text-gray-400">
          ตรวจสอบประวัติการเติมเงินจากทุกช่องทาง พร้อมรายละเอียดผู้ใช้และสถานะล่าสุด
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card className="bg-[#0a0a0a] border-gray-800">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <div>
              <CardTitle className="text-sm font-medium text-gray-400">ยอดรวม (บาท)</CardTitle>
              <CardDescription className="text-xs text-gray-500">รวมจากทุกวิธีที่กรอง</CardDescription>
            </div>
            <CreditCard className="size-4 text-purple-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">
              {summary.totalAmount.toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
          </CardContent>
        </Card>
        <Card className="bg-[#0a0a0a] border-gray-800">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <div>
              <CardTitle className="text-sm font-medium text-gray-400">แต้มที่เพิ่ม</CardTitle>
              <CardDescription className="text-xs text-gray-500">รวมแต้มที่ลูกค้าได้รับ</CardDescription>
            </div>
            <Wallet2 className="size-4 text-green-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">
              {summary.totalPoints.toLocaleString('th-TH', { maximumFractionDigits: 0 })}
            </div>
          </CardContent>
        </Card>
        <Card className="bg-[#0a0a0a] border-gray-800">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <div>
              <CardTitle className="text-sm font-medium text-gray-400">ออเดอร์ล่าสุด</CardTitle>
              <CardDescription className="text-xs text-gray-500">
                สำเร็จ {summary.successCount} | ไม่สำเร็จ {summary.failedCount}
              </CardDescription>
            </div>
            <TrendingUp className="size-4 text-blue-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">{summary.totalRecords.toLocaleString('th-TH')}</div>
          </CardContent>
        </Card>
      </div>

      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-1 items-center gap-3">
          <div className="relative w-full">
            <Search className="size-4 text-gray-500 absolute left-3 top-1/2 -translate-y-1/2" />
            <Input
              placeholder="ค้นหาด้วยชื่อผู้ใช้ อีเมล รหัสผู้ใช้ หรืออ้างอิง"
              value={searchValue}
              onChange={(e) => setSearchValue(e.target.value)}
              className="pl-9 bg-[#0f0f0f] border-gray-800 text-white placeholder:text-gray-500"
            />
          </div>
          {searchValue && (
            <Button
              variant="ghost"
              className="text-gray-400 hover:text-white hover:bg-gray-900"
              onClick={() => setSearchValue('')}
            >
              ล้าง
            </Button>
          )}
        </div>
        <div className="flex flex-wrap gap-3">
          <Select
            value={method}
            onValueChange={(value) => {
              setMethod(value as (typeof methodOptions)[number]['value']);
              setPage(1);
            }}
          >
            <SelectTrigger className="w-[180px] border-gray-800 bg-[#0f0f0f] text-gray-200">
              <SelectValue placeholder="วิธีการ" />
            </SelectTrigger>
            <SelectContent className="bg-[#0f0f0f] border-gray-800 text-gray-200">
              {methodOptions.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select
            value={status}
            onValueChange={(value) => {
              setStatus(value as (typeof statusOptions)[number]['value']);
              setPage(1);
            }}
          >
            <SelectTrigger className="w-[180px] border-gray-800 bg-[#0f0f0f] text-gray-200">
              <SelectValue placeholder="สถานะ" />
            </SelectTrigger>
            <SelectContent className="bg-[#0f0f0f] border-gray-800 text-gray-200">
              {statusOptions.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button
            variant="outline"
            size="icon"
            onClick={() => {
              setLoading(true);
              setPage(1);
              setDebouncedSearch(searchValue.trim());
            }}
            className="border-gray-800 text-gray-300 hover:text-white hover:bg-gray-900"
          >
            <RefreshCcw className={cn('size-4', loading && 'animate-spin')} />
          </Button>
        </div>
      </div>

      <div className="rounded-xl border border-gray-800 bg-[#050505] overflow-hidden">
        <div className="overflow-x-auto">
          {loading ? (
            <div className="space-y-2 p-4">
              <Skeleton className="h-10 w-full" />
              {Array.from({ length: 6 }).map((_, idx) => (
                <Skeleton key={idx} className="h-14 w-full" />
              ))}
            </div>
          ) : records.length === 0 ? (
            <div className="p-10 text-center text-gray-400 text-sm">ยังไม่มีข้อมูลตามเงื่อนไขที่เลือก</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="border-gray-800 bg-gray-900/30 text-gray-400">
                  <TableHead className="whitespace-nowrap">วันที่ / เวลา</TableHead>
                  <TableHead className="whitespace-nowrap">ผู้ใช้</TableHead>
                  <TableHead className="whitespace-nowrap">วิธีการ</TableHead>
                  <TableHead className="whitespace-nowrap text-right">จำนวน (บาท)</TableHead>
                  <TableHead className="whitespace-nowrap text-right">แต้ม</TableHead>
                  <TableHead className="whitespace-nowrap">สถานะ</TableHead>
                  <TableHead className="whitespace-nowrap">อ้างอิง</TableHead>
                  <TableHead className="whitespace-nowrap min-w-[200px]">รายละเอียด</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {records.map((record) => (
                  <TableRow key={record.id} className="border-gray-900/70">
                    <TableCell className="text-white text-sm">{formatDate(record.created_at)}</TableCell>
                    <TableCell className="text-sm text-gray-200">
                      <div className="flex flex-col">
                        <span className="font-medium text-white">
                          {record.user.username || record.user.email || 'ไม่ทราบ'}
                        </span>
                        <span className="text-xs text-gray-500">
                          #{record.user.id ?? 'N/A'}
                          {record.user.email ? ` • ${record.user.email}` : ''}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge className="bg-purple-500/10 text-purple-300 border-purple-500/40">
                        {record.methodLabel}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right text-white">
                      {record.amount.toLocaleString('th-TH', { minimumFractionDigits: 2 })}
                    </TableCell>
                    <TableCell className="text-right text-white">
                      {record.points.toLocaleString('th-TH')}
                    </TableCell>
                    <TableCell>
                      <Badge className={cn('gap-1 border', statusStyles[record.state])}>
                        {statusIcon[record.state]}
                        <span>{record.status || record.state}</span>
                      </Badge>
                    </TableCell>
                    <TableCell className="font-mono text-xs text-gray-300">{record.reference || '-'}</TableCell>
                    <TableCell className="text-sm text-gray-300">
                      {record.note ? record.note : <span className="text-gray-500">-</span>}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </div>
      </div>

      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between text-sm text-gray-400">
        <div>
          แสดง {pageDisplay.from}-{pageDisplay.to} จากทั้งหมด {pagination.total.toLocaleString('th-TH')} รายการ
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            disabled={page <= 1 || loading}
            onClick={() => setPage((prev) => Math.max(1, prev - 1))}
            className="border-gray-800 text-gray-300 hover:text-white hover:bg-gray-900"
          >
            ก่อนหน้า
          </Button>
          <span className="text-gray-300">
            หน้า {page}/{totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            disabled={page >= totalPages || loading}
            onClick={() => setPage((prev) => (prev < totalPages ? prev + 1 : prev))}
            className="border-gray-800 text-gray-300 hover:text-white hover:bg-gray-900"
          >
            ถัดไป
          </Button>
        </div>
      </div>
    </div>
  );
}


