'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/components/ui/use-toast';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Package, Tag, Coins, Clock, Copy, Check, ChevronLeft, ChevronRight } from 'lucide-react';

type GameResult = {
  id: number;
  prize_type: string;
  prize_name: string;
  prize_value: string;
  status: string;
  created_at: string;
  game_games: {
    id: number;
    name: string;
    type: string;
    image_url?: string | null;
  } | null;
  coupons: {
    id: number;
    code: string;
    discount_type: string;
    discount_value: number;
  } | null;
};

const ITEMS_PER_PAGE = 10;

export default function GameHistory() {
  const [results, setResults] = useState<GameResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const toast = useToast();

  useEffect(() => {
    fetchHistory();
  }, []);

  const fetchHistory = async () => {
    try {
      const res = await fetch('/api/games/results');
      const json = await res.json();
      if (json.ok) {
        setResults(json.data || []);
      }
    } catch (err) {
      console.error('Failed to fetch history:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleRedeem = async (resultId: number) => {
    try {
      const res = await fetch(`/api/games/results/${resultId}/redeem`, {
        method: 'POST',
      });

      const json = await res.json();
      if (json.ok) {
        fetchHistory();
        toast.show({
          title: 'สำเร็จ',
          description: 'รับรางวัลสำเร็จ',
        });
        window.dispatchEvent(new Event('wallet:changed'));
      } else {
        toast.show({
          title: 'เกิดข้อผิดพลาด',
          description: json.message || 'ไม่สามารถรับรางวัลได้',
          variant: 'destructive',
        });
      }
    } catch (err) {
      console.error('Redeem error:', err);
      toast.show({
        title: 'เกิดข้อผิดพลาด',
        description: 'ไม่สามารถรับรางวัลได้',
        variant: 'destructive',
      });
    }
  };

  const getPrizeIcon = (type: string) => {
    if (type === 'points') return <Coins className="size-4 text-yellow-400" />;
    if (type === 'coupon') return <Tag className="size-4 text-blue-400" />;
    return <Package className="size-4 text-green-400" />;
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString('th-TH', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const handleCopyCode = async (code: string) => {
    try {
      await navigator.clipboard.writeText(code);
      setCopiedCode(code);
      toast.show({
        title: 'สำเร็จ',
        description: 'คัดลอกโค้ดแล้ว',
      });
      setTimeout(() => setCopiedCode(null), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
      toast.show({
        title: 'เกิดข้อผิดพลาด',
        description: 'ไม่สามารถคัดลอกได้',
        variant: 'destructive',
      });
    }
  };

  // Calculate pagination
  const totalPages = Math.ceil(results.length / ITEMS_PER_PAGE);
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const endIndex = startIndex + ITEMS_PER_PAGE;
  const currentResults = results.slice(startIndex, endIndex);

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="space-y-3">
            {[1, 2, 3, 4, 5].map(i => (
              <Skeleton key={i} className="h-16 w-full" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (results.length === 0) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <Package className="size-16 text-[color:var(--text)]/20 mx-auto mb-4" />
          <p className="text-[color:var(--text)]/60">ยังไม่มีประวัติการเล่น</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[100px]">วันที่</TableHead>
                  <TableHead>เกม</TableHead>
                  <TableHead>รางวัล</TableHead>
                  <TableHead>รายละเอียด</TableHead>
                  <TableHead>สถานะ</TableHead>
                  <TableHead className="w-[120px]">จัดการ</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {currentResults.map((result) => (
                  <TableRow key={result.id}>
                    <TableCell>
                      <div className="flex items-center gap-2 text-sm text-[color:var(--text)]/60">
                        <Clock className="size-3" />
                        <span>{formatDate(result.created_at)}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm text-[color:var(--text)]">{result.game_games?.name || 'ไม่ทราบ'}</div>
                      {result.game_games?.type && (
                        <div className="text-xs text-[color:var(--text)]/40">
                          {result.game_games.type === 'spin_wheel' ? 'วงล้อ' : 'กล่อง'}
                        </div>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {getPrizeIcon(result.prize_type)}
                        <span className="text-sm text-[color:var(--text)] font-medium">{result.prize_name}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      {result.prize_type === 'points' && (
                        <div className="text-sm text-yellow-300">
                          +{result.prize_value} พอยต์
                        </div>
                      )}
                      {result.prize_type === 'coupon' && result.coupons && (
                        <div className="space-y-2">
                          <div className="flex items-center gap-2">
                            <div className="text-sm font-mono text-blue-300">{result.coupons.code}</div>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-6 w-6 p-0"
                              onClick={() => handleCopyCode(result.coupons!.code)}
                            >
                              {copiedCode === result.coupons.code ? (
                                <Check className="size-3 text-green-400" />
                              ) : (
                                <Copy className="size-3 text-[color:var(--text)]/60" />
                              )}
                            </Button>
                          </div>
                          <div className="text-xs text-[color:var(--text)]/60">
                            {result.coupons.discount_type === 'percent'
                              ? `ลด ${result.coupons.discount_value}%`
                              : `ลด ${result.coupons.discount_value} บาท`}
                          </div>
                        </div>
                      )}
                      {result.prize_type === 'other' && (
                        <div className="text-sm text-[color:var(--text)]/80">{result.prize_value}</div>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={result.status === 'redeemed' ? 'default' : 'outline'}
                        className={
                          result.status === 'redeemed'
                            ? 'bg-green-500/20 text-green-300 border-green-500/30'
                            : 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30'
                        }
                      >
                        {result.status === 'redeemed' ? 'รับแล้ว' : 'รอรับ'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {result.status === 'pending' && result.prize_type !== 'points' && (
                        <Button
                          onClick={() => handleRedeem(result.id)}
                          size="sm"
                          className="text-xs"
                        >
                          รับรางวัล
                        </Button>
                      )}
                      {result.status === 'redeemed' && (
                        <span className="text-xs text-[color:var(--text)]/40">-</span>
                      )}
                      {result.prize_type === 'points' && (
                        <span className="text-xs text-[color:var(--text)]/40">เพิ่มอัตโนมัติ</span>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <div className="text-sm text-[color:var(--text)]/60">
            แสดง {startIndex + 1}-{Math.min(endIndex, results.length)} จาก {results.length} รายการ
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
              disabled={currentPage === 1}
            >
              <ChevronLeft className="size-4" />
              ก่อนหน้า
            </Button>
            <div className="flex items-center gap-1">
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => {
                // Show first page, last page, current page, and pages around current
                if (
                  page === 1 ||
                  page === totalPages ||
                  (page >= currentPage - 1 && page <= currentPage + 1)
                ) {
                  return (
                    <Button
                      key={page}
                      variant={currentPage === page ? 'default' : 'outline'}
                      size="sm"
                      className="min-w-[2.5rem]"
                      onClick={() => setCurrentPage(page)}
                    >
                      {page}
                    </Button>
                  );
                } else if (
                  page === currentPage - 2 ||
                  page === currentPage + 2
                ) {
                  return (
                    <span key={page} className="px-2 text-[color:var(--text)]/40">
                      ...
                    </span>
                  );
                }
                return null;
              })}
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
              disabled={currentPage === totalPages}
            >
              ถัดไป
              <ChevronRight className="size-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
