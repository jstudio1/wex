'use client';

import { useEffect, useState } from 'react';
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
  type: 'slip' | 'truewallet' | 'redeem' | 'admin';
  methodLabel: string;
  amount: number;
  points: number;
  status: string;
  state: 'success' | 'failed' | 'pending' | 'unknown';
  reference: string;
  note: string | null;
  created_at: string;
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
    total: number;
    totalAmount: number;
    totalPoints: number;
    successCount: number;
    failedCount: number;
  };
};

export default function TopupHistoryPage() {
  const toast = useToast();
  const [records, setRecords] = useState<TopupRecord[]>([]);
  const [pagination, setPagination] = useState<HistoryResponse['pagination']>({
    total: 0,
    page: 1,
    limit: 25,
    totalPages: 0,
  });
  const [summary, setSummary] = useState<HistoryResponse['summary']>({
    total: 0,
    totalAmount: 0,
    totalPoints: 0,
    successCount: 0,
    failedCount: 0,
  });
  const [loading, setLoading] = useState(true);
  const [method, setMethod] = useState<string>('all');
  const [status, setStatus] = useState<string>('all');
  const [page, setPage] = useState(1);
  const [searchValue, setSearchValue] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchValue);
      setPage(1);
    }, 500);
    return () => clearTimeout(timer);
  }, [searchValue]);

  useEffect(() => {
    fetchHistory();
  }, [page, method, status, debouncedSearch]);

  const fetchHistory = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: String(page),
        limit: '25',
        method,
        status,
      });
      if (debouncedSearch) params.append('search', debouncedSearch);

      const res = await fetch(`/api/user/topup-history?${params}`);
      if (!res.ok) {
        const json = await res.json();
        throw new Error(json.error || json.detail || 'ไม่สามารถโหลดข้อมูลได้');
      }

      const json: HistoryResponse = await res.json();
      setRecords(json.data || []);
      setPagination(json.pagination || { total: 0, page: 1, limit: 25, totalPages: 0 });
      setSummary(json.summary || { total: 0, totalAmount: 0, totalPoints: 0, successCount: 0, failedCount: 0 });
    } catch (err) {
      toast.show({
        title: 'โหลดประวัติไม่สำเร็จ',
        description: err instanceof Error ? err.message : 'เกิดข้อผิดพลาดไม่ทราบสาเหตุ',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const getStatusIcon = (state: TopupRecord['state']) => {
    switch (state) {
      case 'success':
        return <CheckCircle2 className="size-4 text-green-500" />;
      case 'failed':
        return <XCircle className="size-4 text-red-500" />;
      case 'pending':
        return <Clock className="size-4 text-yellow-500" />;
      default:
        return <Clock className="size-4 text-gray-500" />;
    }
  };

  const getStatusBadge = (state: TopupRecord['state'], status: string) => {
    const baseClasses = 'text-xs font-medium px-2 py-0.5 rounded';
    switch (state) {
      case 'success':
        return <Badge className={cn(baseClasses, 'bg-green-900/30 text-green-400 border-green-600')}>{status}</Badge>;
      case 'failed':
        return <Badge className={cn(baseClasses, 'bg-red-900/30 text-red-400 border-red-600')}>{status}</Badge>;
      case 'pending':
        return <Badge className={cn(baseClasses, 'bg-yellow-900/30 text-yellow-400 border-yellow-600')}>{status}</Badge>;
      default:
        return <Badge className={cn(baseClasses, 'bg-gray-900/30 text-gray-400 border-gray-600')}>{status}</Badge>;
    }
  };

  return (
    <main className="mx-auto max-w-7xl px-4 py-6 md:py-10">
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-white">ประวัติเติมเงิน</h1>
          <p className="text-gray-400 mt-1">ดูประวัติการเติมเงินทั้งหมดของคุณ</p>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="bg-[#0a0a0a] border-gray-800">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-gray-400">ยอดรวม</CardTitle>
              <TrendingUp className="size-4 text-gray-400" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-white">{summary.totalAmount.toFixed(2)}</div>
              <p className="text-xs text-gray-500 mt-1">บาท</p>
            </CardContent>
          </Card>

          <Card className="bg-[#0a0a0a] border-gray-800">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-gray-400">พอยต์รวม</CardTitle>
              <Wallet2 className="size-4 text-gray-400" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-white">{summary.totalPoints.toFixed(2)}</div>
              <p className="text-xs text-gray-500 mt-1">พอยต์</p>
            </CardContent>
          </Card>

          <Card className="bg-[#0a0a0a] border-gray-800">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-gray-400">สำเร็จ</CardTitle>
              <CheckCircle2 className="size-4 text-green-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-white">{summary.successCount}</div>
              <p className="text-xs text-gray-500 mt-1">รายการ</p>
            </CardContent>
          </Card>

          <Card className="bg-[#0a0a0a] border-gray-800">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-gray-400">ไม่สำเร็จ</CardTitle>
              <XCircle className="size-4 text-red-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-white">{summary.failedCount}</div>
              <p className="text-xs text-gray-500 mt-1">รายการ</p>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card className="bg-[#0a0a0a] border-gray-800">
          <CardHeader>
            <CardTitle className="text-white">กรองข้อมูล</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1">
                <Input
                  placeholder="ค้นหา..."
                  value={searchValue}
                  onChange={(e) => setSearchValue(e.target.value)}
                  className="bg-[#1a1a1a] border-gray-700 text-white"
                />
              </div>
              <Select value={method} onValueChange={setMethod}>
                <SelectTrigger className="w-full md:w-[180px] bg-[#1a1a1a] border-gray-700 text-white">
                  <SelectValue placeholder="วิธีเติมเงิน" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">ทั้งหมด</SelectItem>
                  <SelectItem value="slip">โอนผ่านสลิป</SelectItem>
                  <SelectItem value="truewallet">TrueMoney Gift</SelectItem>
                  <SelectItem value="redeem">โค้ดเติมพอยต์</SelectItem>
                  <SelectItem value="admin">เติมเงินโดย Admin</SelectItem>
                </SelectContent>
              </Select>
              <Select value={status} onValueChange={setStatus}>
                <SelectTrigger className="w-full md:w-[180px] bg-[#1a1a1a] border-gray-700 text-white">
                  <SelectValue placeholder="สถานะ" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">ทั้งหมด</SelectItem>
                  <SelectItem value="success">สำเร็จ</SelectItem>
                  <SelectItem value="pending">รอดำเนินการ</SelectItem>
                  <SelectItem value="failed">ไม่สำเร็จ</SelectItem>
                </SelectContent>
              </Select>
              <Button
                variant="outline"
                onClick={fetchHistory}
                className="border-gray-700 text-gray-300 hover:bg-gray-800"
              >
                <RefreshCcw className="size-4 mr-2" />
                รีเฟรช
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Table */}
        <Card className="bg-[#0a0a0a] border-gray-800">
          <CardHeader>
            <CardTitle className="text-white">รายการเติมเงิน</CardTitle>
            <CardDescription className="text-gray-400">
              แสดง {records.length} จาก {pagination.total} รายการ
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="space-y-2">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Skeleton key={i} className="h-12 w-full" />
                ))}
              </div>
            ) : records.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-gray-400">ยังไม่มีประวัติการเติมเงิน</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="border-gray-800">
                      <TableHead className="text-gray-300">วันที่</TableHead>
                      <TableHead className="text-gray-300">วิธีเติมเงิน</TableHead>
                      <TableHead className="text-gray-300">จำนวนเงิน</TableHead>
                      <TableHead className="text-gray-300">พอยต์</TableHead>
                      <TableHead className="text-gray-300">สถานะ</TableHead>
                      <TableHead className="text-gray-300">อ้างอิง</TableHead>
                      <TableHead className="text-gray-300">หมายเหตุ</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {records.map((record) => (
                      <TableRow key={record.id} className="border-gray-800/30">
                        <TableCell className="text-white">
                          {new Date(record.created_at).toLocaleString('th-TH', {
                            year: 'numeric',
                            month: '2-digit',
                            day: '2-digit',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </TableCell>
                        <TableCell className="text-white">{record.methodLabel}</TableCell>
                        <TableCell className="text-white">{record.amount.toFixed(2)}</TableCell>
                        <TableCell className="text-white">{record.points.toFixed(2)}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            {getStatusIcon(record.state)}
                            {getStatusBadge(record.state, record.status)}
                          </div>
                        </TableCell>
                        <TableCell className="text-gray-400">{record.reference}</TableCell>
                        <TableCell className="text-gray-400">{record.note || '-'}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}

            {/* Pagination */}
            {pagination.totalPages > 1 && (
              <div className="flex items-center justify-between mt-4 pt-4 border-t border-gray-800">
                <p className="text-sm text-gray-400">
                  หน้า {pagination.page} จาก {pagination.totalPages}
                </p>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={pagination.page <= 1 || loading}
                    className="border-gray-700 text-gray-300"
                  >
                    ก่อนหน้า
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage((p) => Math.min(pagination.totalPages, p + 1))}
                    disabled={pagination.page >= pagination.totalPages || loading}
                    className="border-gray-700 text-gray-300"
                  >
                    ถัดไป
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </main>
  );
}

