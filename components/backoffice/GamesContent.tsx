'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  Trophy,
  Plus,
  Edit3,
  Trash2,
  Save,
  X,
  Coins,
  Ticket,
  Gift,
  CircleDot,
  Box,
  Flame,
  AlertTriangle,
  CheckCircle2,
  Settings2,
  Search,
  Power,
  PowerOff,
  Hash,
  Percent,
  Wallet,
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { Skeleton } from '@/components/ui/skeleton';
import { Spinner } from '@/components/ui/spinner';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/components/ui/use-toast';

// ──────────────────────────────────────────────────────────────────────────
// Types
// ──────────────────────────────────────────────────────────────────────────

type GameType = 'spin_wheel' | 'loot_box';
type PrizeType = 'points' | 'coupon' | 'other';
type CouponKind = 'percent' | 'fixed';

interface Game {
  id: number;
  name: string;
  type: GameType;
  cost_points: number;
  is_active: boolean;
  description: string | null;
  image_url: string | null;
  settings: any;
  created_at: string;
  updated_at: string;
}

interface Prize {
  id: number;
  game_id: number;
  name: string;
  type: PrizeType;
  value: string;
  probability: number;
  quantity: number | null;
  remaining_quantity: number | null;
  is_active: boolean;
  display_order: number;
  image_url: string | null;
  description: string | null;
}

interface GameForm {
  name: string;
  type: GameType;
  cost_points: string;
  is_active: boolean;
  description: string;
  image_url: string;
}

interface PrizeForm {
  name: string;
  type: PrizeType;
  // value form-state — split for couponKind/couponAmount, generic for others
  pointsAmount: string;
  couponKind: CouponKind;
  couponAmount: string;
  otherText: string;
  probability: string;
  quantity: string;
  is_active: boolean;
  display_order: string;
  image_url: string;
  description: string;
}

const emptyGameForm: GameForm = {
  name: '',
  type: 'spin_wheel',
  cost_points: '10',
  is_active: true,
  description: '',
  image_url: '',
};

const emptyPrizeForm: PrizeForm = {
  name: '',
  type: 'points',
  pointsAmount: '50',
  couponKind: 'percent',
  couponAmount: '10',
  otherText: '',
  probability: '10',
  quantity: '',
  is_active: true,
  display_order: '0',
  image_url: '',
  description: '',
};

// ──────────────────────────────────────────────────────────────────────────
// Helpers
// ──────────────────────────────────────────────────────────────────────────

function parseCouponValue(value: string): { kind: CouponKind; amount: string } {
  // ค่าเดิมเก็บแบบ "percent:10" / "fixed:100"
  const m = /^(percent|fixed)\s*:\s*([\d.]+)/i.exec(value || '');
  if (m) return { kind: m[1].toLowerCase() as CouponKind, amount: m[2] };
  // ถ้าเก่าเก็บแค่ตัวเลข ให้ default เป็น percent
  if (/^[\d.]+$/.test(value)) return { kind: 'percent', amount: value };
  return { kind: 'percent', amount: '' };
}

function buildPrizeValue(form: PrizeForm): string {
  switch (form.type) {
    case 'points':
      return form.pointsAmount.trim();
    case 'coupon':
      return `${form.couponKind}:${form.couponAmount.trim()}`;
    case 'other':
      return form.otherText.trim();
  }
}

function describePrizeValue(prize: Prize): string {
  if (prize.type === 'points') return `${prize.value} พอยต์`;
  if (prize.type === 'coupon') {
    const { kind, amount } = parseCouponValue(prize.value);
    return kind === 'percent' ? `ลด ${amount}%` : `ลด ${amount} บาท`;
  }
  return prize.value || '-';
}

const GAME_TYPE_META: Record<GameType, { label: string; icon: any; gradient: string }> = {
  spin_wheel: {
    label: 'วงล้อสุ่ม',
    icon: CircleDot,
    gradient: 'from-purple-600 to-pink-600',
  },
  loot_box: {
    label: 'กล่องสุ่ม',
    icon: Box,
    gradient: 'from-amber-600 to-orange-600',
  },
};

const PRIZE_TYPE_META: Record<PrizeType, { label: string; icon: any; color: string }> = {
  points: { label: 'พอยต์', icon: Coins, color: 'text-yellow-300 bg-yellow-500/15 border-yellow-500/30' },
  coupon: { label: 'ส่วนลด', icon: Ticket, color: 'text-emerald-300 bg-emerald-500/15 border-emerald-500/30' },
  other: { label: 'อื่นๆ', icon: Gift, color: 'text-pink-300 bg-pink-500/15 border-pink-500/30' },
};

// ──────────────────────────────────────────────────────────────────────────
// Main Component
// ──────────────────────────────────────────────────────────────────────────

export default function GamesContent() {
  const toast = useToast();

  const [games, setGames] = useState<Game[]>([]);
  const [prizes, setPrizes] = useState<Prize[]>([]);
  const [loading, setLoading] = useState(true);
  const [prizesLoading, setPrizesLoading] = useState(false);
  const [selectedGameId, setSelectedGameId] = useState<number | null>(null);
  const [search, setSearch] = useState('');

  // Game dialog
  const [gameDialogOpen, setGameDialogOpen] = useState(false);
  const [gameEditingId, setGameEditingId] = useState<number | null>(null);
  const [gameForm, setGameForm] = useState<GameForm>(emptyGameForm);
  const [gameSaving, setGameSaving] = useState(false);

  // Prize dialog
  const [prizeDialogOpen, setPrizeDialogOpen] = useState(false);
  const [prizeEditingId, setPrizeEditingId] = useState<number | null>(null);
  const [prizeForm, setPrizeForm] = useState<PrizeForm>(emptyPrizeForm);
  const [prizeSaving, setPrizeSaving] = useState(false);

  // Delete dialog (works for game OR prize)
  const [deleteTarget, setDeleteTarget] = useState<
    | { kind: 'game'; id: number; name: string }
    | { kind: 'prize'; id: number; name: string }
    | null
  >(null);
  const [deleting, setDeleting] = useState(false);

  // ── Initial fetch ────────────────────────────────────────────────────
  useEffect(() => {
    fetchGames();
  }, []);

  useEffect(() => {
    if (selectedGameId != null) fetchPrizes(selectedGameId);
    else setPrizes([]);
  }, [selectedGameId]);

  const fetchGames = async () => {
    try {
      const res = await fetch('/api/admin/games');
      if (!res.ok) throw new Error('โหลดเกมไม่สำเร็จ');
      const json = await res.json();
      const list = (json.data || []) as Game[];
      setGames(list);
      if (list.length > 0) {
        setSelectedGameId((cur) => cur ?? list[0].id);
      } else {
        setSelectedGameId(null);
      }
    } catch (err) {
      toast.show({ title: 'เกิดข้อผิดพลาด', description: (err as Error).message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const fetchPrizes = async (gameId: number) => {
    setPrizesLoading(true);
    try {
      const res = await fetch(`/api/admin/games/${gameId}/prizes`);
      if (!res.ok) throw new Error('โหลดรางวัลไม่สำเร็จ');
      const json = await res.json();
      setPrizes((json.data || []) as Prize[]);
    } catch (err) {
      toast.show({ title: 'เกิดข้อผิดพลาด', description: (err as Error).message, variant: 'destructive' });
      setPrizes([]);
    } finally {
      setPrizesLoading(false);
    }
  };

  // ── Computed ─────────────────────────────────────────────────────────
  const filteredGames = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return games;
    return games.filter((g) => g.name.toLowerCase().includes(q));
  }, [games, search]);

  const selectedGame = useMemo(
    () => games.find((g) => g.id === selectedGameId) || null,
    [games, selectedGameId]
  );

  const totalProbability = useMemo(
    () => prizes.filter((p) => p.is_active).reduce((s, p) => s + Number(p.probability || 0), 0),
    [prizes]
  );

  // ── Game CRUD ────────────────────────────────────────────────────────
  const openCreateGame = () => {
    setGameEditingId(null);
    setGameForm(emptyGameForm);
    setGameDialogOpen(true);
  };

  const openEditGame = (game: Game) => {
    setGameEditingId(game.id);
    setGameForm({
      name: game.name,
      type: game.type,
      cost_points: String(game.cost_points),
      is_active: game.is_active,
      description: game.description || '',
      image_url: game.image_url || '',
    });
    setGameDialogOpen(true);
  };

  const submitGame = async () => {
    if (!gameForm.name.trim()) {
      toast.show({ title: 'กรอกชื่อเกม', variant: 'destructive' });
      return;
    }
    const cost = Number(gameForm.cost_points);
    if (!Number.isFinite(cost) || cost <= 0) {
      toast.show({ title: 'ราคาพอยต์ต้องมากกว่า 0', variant: 'destructive' });
      return;
    }

    setGameSaving(true);
    try {
      const payload = {
        name: gameForm.name.trim(),
        type: gameForm.type,
        cost_points: cost,
        is_active: gameForm.is_active,
        description: gameForm.description.trim() || null,
        image_url: gameForm.image_url.trim() || null,
      };
      const url = gameEditingId ? `/api/admin/games/${gameEditingId}` : '/api/admin/games';
      const method = gameEditingId ? 'PUT' : 'POST';
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.message || json.error || 'บันทึกไม่สำเร็จ');

      toast.show({
        title: 'สำเร็จ',
        description: gameEditingId ? 'บันทึกข้อมูลเกมเรียบร้อย' : 'สร้างเกมใหม่เรียบร้อย',
      });
      setGameDialogOpen(false);
      await fetchGames();
      if (!gameEditingId && json.data?.id) {
        setSelectedGameId(json.data.id);
      }
    } catch (err) {
      toast.show({ title: 'เกิดข้อผิดพลาด', description: (err as Error).message, variant: 'destructive' });
    } finally {
      setGameSaving(false);
    }
  };

  const toggleGameActive = async (game: Game, value: boolean) => {
    // optimistic update
    setGames((prev) => prev.map((g) => (g.id === game.id ? { ...g, is_active: value } : g)));
    try {
      const res = await fetch(`/api/admin/games/${game.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: game.name,
          type: game.type,
          cost_points: game.cost_points,
          is_active: value,
          description: game.description,
          image_url: game.image_url,
        }),
      });
      if (!res.ok) throw new Error('อัพเดตไม่สำเร็จ');
    } catch (err) {
      // revert
      setGames((prev) => prev.map((g) => (g.id === game.id ? { ...g, is_active: !value } : g)));
      toast.show({ title: 'เกิดข้อผิดพลาด', description: (err as Error).message, variant: 'destructive' });
    }
  };

  // ── Prize CRUD ───────────────────────────────────────────────────────
  const openCreatePrize = () => {
    if (!selectedGameId) return;
    setPrizeEditingId(null);
    setPrizeForm({ ...emptyPrizeForm, display_order: String(prizes.length) });
    setPrizeDialogOpen(true);
  };

  const openEditPrize = (prize: Prize) => {
    const coupon = prize.type === 'coupon' ? parseCouponValue(prize.value) : { kind: 'percent' as CouponKind, amount: '' };
    setPrizeEditingId(prize.id);
    setPrizeForm({
      name: prize.name,
      type: prize.type,
      pointsAmount: prize.type === 'points' ? prize.value : '50',
      couponKind: coupon.kind,
      couponAmount: coupon.amount,
      otherText: prize.type === 'other' ? prize.value : '',
      probability: String(prize.probability),
      quantity: prize.quantity != null ? String(prize.quantity) : '',
      is_active: prize.is_active,
      display_order: String(prize.display_order),
      image_url: prize.image_url || '',
      description: prize.description || '',
    });
    setPrizeDialogOpen(true);
  };

  const submitPrize = async () => {
    if (!selectedGameId) return;
    if (!prizeForm.name.trim()) {
      toast.show({ title: 'กรอกชื่อรางวัล', variant: 'destructive' });
      return;
    }
    const value = buildPrizeValue(prizeForm);
    if (!value) {
      toast.show({ title: 'ระบุค่าของรางวัล', variant: 'destructive' });
      return;
    }
    const prob = Number(prizeForm.probability);
    if (!Number.isFinite(prob) || prob <= 0 || prob > 100) {
      toast.show({ title: 'ความน่าจะเป็นต้องเป็น 0.01 - 100', variant: 'destructive' });
      return;
    }

    setPrizeSaving(true);
    try {
      const payload: any = {
        name: prizeForm.name.trim(),
        type: prizeForm.type,
        value,
        probability: prob,
        is_active: prizeForm.is_active,
        display_order: Number(prizeForm.display_order) || 0,
        description: prizeForm.description.trim() || null,
        image_url: prizeForm.image_url.trim() || null,
      };
      if (prizeForm.quantity.trim()) payload.quantity = Number(prizeForm.quantity);

      const url = prizeEditingId
        ? `/api/admin/games/${selectedGameId}/prizes/${prizeEditingId}`
        : `/api/admin/games/${selectedGameId}/prizes`;
      const method = prizeEditingId ? 'PUT' : 'POST';
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      if (!res.ok) {
        if (json.error === 'probability_exceeds_100') {
          throw new Error('ความน่าจะเป็นรวมเกิน 100% กรุณาปรับลด');
        }
        throw new Error(json.message || json.error || 'บันทึกไม่สำเร็จ');
      }

      toast.show({
        title: 'สำเร็จ',
        description: prizeEditingId ? 'แก้ไขรางวัลเรียบร้อย' : 'เพิ่มรางวัลเรียบร้อย',
      });
      setPrizeDialogOpen(false);
      fetchPrizes(selectedGameId);
    } catch (err) {
      toast.show({ title: 'เกิดข้อผิดพลาด', description: (err as Error).message, variant: 'destructive' });
    } finally {
      setPrizeSaving(false);
    }
  };

  const togglePrizeActive = async (prize: Prize, value: boolean) => {
    if (!selectedGameId) return;
    setPrizes((prev) => prev.map((p) => (p.id === prize.id ? { ...p, is_active: value } : p)));
    try {
      const couponParts = prize.type === 'coupon' ? parseCouponValue(prize.value) : null;
      const res = await fetch(`/api/admin/games/${selectedGameId}/prizes/${prize.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: prize.name,
          type: prize.type,
          value: prize.value,
          probability: Number(prize.probability),
          quantity: prize.quantity,
          is_active: value,
          display_order: prize.display_order,
          image_url: prize.image_url,
          description: prize.description,
        }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j.message || j.error || 'อัพเดตไม่สำเร็จ');
      }
      // ใช้ couponParts ถ้าจำเป็นในอนาคต
      void couponParts;
    } catch (err) {
      setPrizes((prev) => prev.map((p) => (p.id === prize.id ? { ...p, is_active: !value } : p)));
      toast.show({ title: 'เกิดข้อผิดพลาด', description: (err as Error).message, variant: 'destructive' });
    }
  };

  // ── Delete ───────────────────────────────────────────────────────────
  const performDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      let url = '';
      if (deleteTarget.kind === 'game') {
        url = `/api/admin/games/${deleteTarget.id}`;
      } else {
        if (!selectedGameId) return;
        url = `/api/admin/games/${selectedGameId}/prizes/${deleteTarget.id}`;
      }
      const res = await fetch(url, { method: 'DELETE' });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j.message || j.error || 'ลบไม่สำเร็จ');
      }
      toast.show({
        title: 'สำเร็จ',
        description: deleteTarget.kind === 'game' ? 'ลบเกมเรียบร้อย' : 'ลบรางวัลเรียบร้อย',
      });
      if (deleteTarget.kind === 'game') {
        const wasSelected = deleteTarget.id === selectedGameId;
        await fetchGames();
        if (wasSelected) setSelectedGameId(null);
      } else if (selectedGameId) {
        fetchPrizes(selectedGameId);
      }
      setDeleteTarget(null);
    } catch (err) {
      toast.show({ title: 'เกิดข้อผิดพลาด', description: (err as Error).message, variant: 'destructive' });
    } finally {
      setDeleting(false);
    }
  };

  // ──────────────────────────────────────────────────────────────────────
  // Render
  // ──────────────────────────────────────────────────────────────────────
  if (loading) return <LoadingSkeleton />;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="flex items-center gap-2 text-2xl font-bold text-white">
            <Trophy className="size-6 text-amber-400" />
            มินิเกมและรางวัล
          </h2>
          <p className="mt-1 text-sm text-gray-400">
            ทั้งหมด {games.length} เกม · เปิดใช้งาน {games.filter((g) => g.is_active).length} เกม
          </p>
        </div>
        <Button
          onClick={openCreateGame}
          className="gap-2 bg-gradient-to-r from-purple-600 to-pink-600 text-white shadow-lg hover:from-purple-700 hover:to-pink-700"
        >
          <Plus className="size-4" />
          สร้างเกมใหม่
        </Button>
      </div>

      {games.length === 0 ? (
        <EmptyState onCreate={openCreateGame} />
      ) : (
        <div className="grid gap-6 lg:grid-cols-[320px_minmax(0,1fr)]">
          {/* ── Game List ── */}
          <div className="space-y-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-gray-400" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="ค้นหาเกม..."
                className="border-gray-700 bg-[#0a0a0a] pl-9 text-white"
              />
            </div>

            <div className="max-h-[calc(100vh-250px)] space-y-2 overflow-y-auto pr-1">
              {filteredGames.map((g) => (
                <GameListItem
                  key={g.id}
                  game={g}
                  selected={g.id === selectedGameId}
                  prizeCount={g.id === selectedGameId ? prizes.length : undefined}
                  onSelect={() => setSelectedGameId(g.id)}
                />
              ))}
              {filteredGames.length === 0 && (
                <div className="rounded-lg border border-dashed border-gray-700 p-6 text-center text-sm text-gray-400">
                  ไม่พบเกมที่ตรงกับการค้นหา
                </div>
              )}
            </div>
          </div>

          {/* ── Detail Panel ── */}
          <div>
            {selectedGame ? (
              <GameDetail
                game={selectedGame}
                prizes={prizes}
                prizesLoading={prizesLoading}
                totalProbability={totalProbability}
                onEditGame={() => openEditGame(selectedGame)}
                onDeleteGame={() =>
                  setDeleteTarget({ kind: 'game', id: selectedGame.id, name: selectedGame.name })
                }
                onToggleGameActive={(v) => toggleGameActive(selectedGame, v)}
                onCreatePrize={openCreatePrize}
                onEditPrize={openEditPrize}
                onDeletePrize={(p) => setDeleteTarget({ kind: 'prize', id: p.id, name: p.name })}
                onTogglePrizeActive={togglePrizeActive}
              />
            ) : (
              <div className="rounded-2xl border border-dashed border-gray-700 bg-[#0a0a0a] p-12 text-center text-gray-400">
                เลือกเกมจากด้านซ้ายเพื่อจัดการรายละเอียด
              </div>
            )}
          </div>
        </div>
      )}

      {/* Game Dialog */}
      <GameFormDialog
        open={gameDialogOpen}
        onOpenChange={setGameDialogOpen}
        editing={gameEditingId != null}
        form={gameForm}
        setForm={setGameForm}
        saving={gameSaving}
        onSubmit={submitGame}
      />

      {/* Prize Dialog */}
      <PrizeFormDialog
        open={prizeDialogOpen}
        onOpenChange={setPrizeDialogOpen}
        editing={prizeEditingId != null}
        form={prizeForm}
        setForm={setPrizeForm}
        saving={prizeSaving}
        onSubmit={submitPrize}
        currentTotalProbability={totalProbability - (prizeEditingId ? Number(prizes.find((p) => p.id === prizeEditingId)?.probability || 0) : 0)}
      />

      {/* Delete Confirm */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(o) => !o && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="size-5 text-red-400" />
              ยืนยันการลบ
            </AlertDialogTitle>
            <AlertDialogDescription>
              {deleteTarget?.kind === 'game'
                ? `คุณกำลังจะลบเกม "${deleteTarget?.name}" รางวัลทั้งหมดของเกมนี้จะถูกลบไปด้วย การกระทำนี้ไม่สามารถยกเลิกได้`
                : `คุณกำลังจะลบรางวัล "${deleteTarget?.name}" การกระทำนี้ไม่สามารถยกเลิกได้`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>ยกเลิก</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                performDelete();
              }}
              className="bg-red-600 text-white hover:bg-red-700"
              disabled={deleting}
            >
              {deleting ? <Spinner className="mr-2 size-4" /> : <Trash2 className="mr-2 size-4" />}
              ลบ
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

// ──────────────────────────────────────────────────────────────────────────
// Sub-components
// ──────────────────────────────────────────────────────────────────────────

function LoadingSkeleton() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-10 w-64" />
      <div className="grid gap-6 lg:grid-cols-[320px_minmax(0,1fr)]">
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-20 w-full" />
          ))}
        </div>
        <Skeleton className="h-96 w-full" />
      </div>
    </div>
  );
}

function EmptyState({ onCreate }: { onCreate: () => void }) {
  return (
    <div className="rounded-3xl border border-dashed border-purple-500/30 bg-gradient-to-br from-purple-900/10 to-pink-900/10 p-12 text-center">
      <div className="mx-auto mb-4 flex size-20 items-center justify-center rounded-2xl bg-gradient-to-br from-purple-600 to-pink-600 shadow-xl">
        <Flame className="size-10 text-white" />
      </div>
      <h3 className="mb-2 text-xl font-bold text-white">ยังไม่มีมินิเกม</h3>
      <p className="mb-6 text-sm text-gray-400">เริ่มต้นสร้างวงล้อสุ่มหรือกล่องสุ่มเพื่อให้ผู้ใช้แลกพอยต์ลุ้นรางวัล</p>
      <Button
        onClick={onCreate}
        className="gap-2 bg-gradient-to-r from-purple-600 to-pink-600 text-white hover:from-purple-700 hover:to-pink-700"
      >
        <Plus className="size-4" />
        สร้างเกมแรก
      </Button>
    </div>
  );
}

function GameListItem({
  game,
  selected,
  prizeCount,
  onSelect,
}: {
  game: Game;
  selected: boolean;
  prizeCount?: number;
  onSelect: () => void;
}) {
  const meta = GAME_TYPE_META[game.type];
  const Icon = meta.icon;

  return (
    <button
      onClick={onSelect}
      className={`flex w-full items-center gap-3 rounded-xl border p-3 text-left transition-all ${
        selected
          ? 'border-purple-500 bg-gradient-to-r from-purple-900/30 to-pink-900/20 shadow-lg shadow-purple-500/10'
          : 'border-gray-800 bg-[#0a0a0a] hover:border-purple-500/50 hover:bg-purple-900/5'
      }`}
    >
      <div className={`flex size-12 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br ${meta.gradient} shadow-md`}>
        {game.image_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={game.image_url} alt={game.name} className="size-12 rounded-lg object-cover" />
        ) : (
          <Icon className="size-6 text-white" />
        )}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <p className="truncate font-semibold text-white">{game.name}</p>
          <span
            className={`size-2 shrink-0 rounded-full ${
              game.is_active ? 'bg-emerald-400 shadow-[0_0_8px_#34d399]' : 'bg-gray-600'
            }`}
          />
        </div>
        <div className="mt-0.5 flex items-center gap-2 text-xs text-gray-400">
          <span>{meta.label}</span>
          <span>·</span>
          <span className="inline-flex items-center gap-1 text-yellow-300">
            <Coins className="size-3" />
            {game.cost_points}
          </span>
          {prizeCount != null && (
            <>
              <span>·</span>
              <span>{prizeCount} รางวัล</span>
            </>
          )}
        </div>
      </div>
    </button>
  );
}

function GameDetail({
  game,
  prizes,
  prizesLoading,
  totalProbability,
  onEditGame,
  onDeleteGame,
  onToggleGameActive,
  onCreatePrize,
  onEditPrize,
  onDeletePrize,
  onTogglePrizeActive,
}: {
  game: Game;
  prizes: Prize[];
  prizesLoading: boolean;
  totalProbability: number;
  onEditGame: () => void;
  onDeleteGame: () => void;
  onToggleGameActive: (v: boolean) => void;
  onCreatePrize: () => void;
  onEditPrize: (p: Prize) => void;
  onDeletePrize: (p: Prize) => void;
  onTogglePrizeActive: (p: Prize, v: boolean) => void;
}) {
  const meta = GAME_TYPE_META[game.type];
  const Icon = meta.icon;

  const probState =
    totalProbability > 100
      ? { tone: 'text-red-300', bar: 'bg-red-500', label: `เกิน ${(totalProbability - 100).toFixed(2)}%` }
      : totalProbability === 100
        ? { tone: 'text-emerald-300', bar: 'bg-emerald-500', label: 'ครบ 100% พร้อมใช้งาน' }
        : { tone: 'text-yellow-300', bar: 'bg-yellow-500', label: `เหลืออีก ${(100 - totalProbability).toFixed(2)}%` };

  return (
    <div className="space-y-5">
      {/* Hero Card */}
      <div className={`relative overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-br ${meta.gradient} p-6 shadow-xl`}>
        <div className="absolute right-0 top-0 size-48 translate-x-12 -translate-y-12 rounded-full bg-white/10 blur-3xl" />
        <div className="relative flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4">
            <div className="flex size-16 shrink-0 items-center justify-center rounded-2xl bg-white/15 backdrop-blur">
              {game.image_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={game.image_url} alt={game.name} className="size-16 rounded-2xl object-cover" />
              ) : (
                <Icon className="size-8 text-white" />
              )}
            </div>
            <div>
              <div className="mb-1 flex items-center gap-2">
                <Badge className="border-white/30 bg-white/20 text-xs text-white">{meta.label}</Badge>
                <Badge className={`text-xs ${game.is_active ? 'bg-emerald-500/30 text-emerald-100' : 'bg-gray-700/50 text-gray-200'}`}>
                  {game.is_active ? 'เปิดใช้งาน' : 'ปิดใช้งาน'}
                </Badge>
              </div>
              <h3 className="text-2xl font-bold text-white">{game.name}</h3>
              {game.description && <p className="mt-1 text-sm text-white/80">{game.description}</p>}
              <div className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-black/25 px-3 py-1 text-sm font-semibold text-yellow-200">
                <Coins className="size-4" />
                {game.cost_points} พอยต์ / ครั้ง
              </div>
            </div>
          </div>

          <div className="flex flex-col items-end gap-2">
            <div className="flex items-center gap-2 rounded-full bg-black/25 px-3 py-1.5">
              <Switch checked={game.is_active} onCheckedChange={onToggleGameActive} />
              <span className="text-xs text-white">
                {game.is_active ? <Power className="size-3 inline" /> : <PowerOff className="size-3 inline" />}
              </span>
            </div>
            <div className="flex gap-2">
              <Button size="sm" variant="secondary" onClick={onEditGame} className="gap-1.5">
                <Edit3 className="size-3.5" />
                แก้ไข
              </Button>
              <Button size="sm" variant="destructive" onClick={onDeleteGame} className="gap-1.5">
                <Trash2 className="size-3.5" />
                ลบเกม
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Prize Manager */}
      <Tabs defaultValue="prizes" className="w-full">
        <TabsList className="bg-[#0a0a0a]">
          <TabsTrigger value="prizes" className="gap-2">
            <Gift className="size-4" />
            รางวัล ({prizes.length})
          </TabsTrigger>
          <TabsTrigger value="settings" className="gap-2">
            <Settings2 className="size-4" />
            ข้อมูลเกม
          </TabsTrigger>
        </TabsList>

        <TabsContent value="prizes" className="mt-4 space-y-4">
          {/* Probability bar */}
          <div className="rounded-2xl border border-white/10 bg-[#0a0a0a] p-5">
            <div className="mb-2 flex items-center justify-between">
              <span className="text-sm font-medium text-gray-300">ความน่าจะเป็นรวม (รางวัลที่เปิดใช้งาน)</span>
              <span className={`text-lg font-bold tabular-nums ${probState.tone}`}>
                {totalProbability.toFixed(2)}%
              </span>
            </div>
            <div className="relative h-3 w-full overflow-hidden rounded-full bg-gray-800">
              <div
                className={`absolute inset-y-0 left-0 transition-all ${probState.bar}`}
                style={{ width: `${Math.min(100, totalProbability)}%` }}
              />
              {totalProbability > 100 && (
                <div className="absolute inset-y-0 right-0 w-1 bg-red-700" />
              )}
            </div>
            <p className={`mt-2 text-xs ${probState.tone}`}>
              {totalProbability === 100 ? <CheckCircle2 className="mr-1 inline size-3.5" /> : <AlertTriangle className="mr-1 inline size-3.5" />}
              {probState.label}
            </p>
          </div>

          {/* Action row */}
          <div className="flex items-center justify-between">
            <p className="text-sm text-gray-400">{prizes.length} รางวัลทั้งหมด</p>
            <Button onClick={onCreatePrize} className="gap-2 bg-emerald-600 hover:bg-emerald-700">
              <Plus className="size-4" />
              เพิ่มรางวัล
            </Button>
          </div>

          {/* Prizes list */}
          {prizesLoading ? (
            <div className="space-y-2">
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-20 w-full" />
              ))}
            </div>
          ) : prizes.length === 0 ? (
            <div className="rounded-xl border border-dashed border-gray-700 bg-[#0a0a0a] p-10 text-center">
              <Gift className="mx-auto mb-3 size-10 text-gray-500" />
              <p className="text-gray-400">ยังไม่มีรางวัล กดปุ่มด้านบนเพื่อเพิ่ม</p>
            </div>
          ) : (
            <div className="space-y-2">
              {prizes.map((prize) => (
                <PrizeRow
                  key={prize.id}
                  prize={prize}
                  onEdit={() => onEditPrize(prize)}
                  onDelete={() => onDeletePrize(prize)}
                  onToggle={(v) => onTogglePrizeActive(prize, v)}
                />
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="settings" className="mt-4">
          <div className="rounded-2xl border border-white/10 bg-[#0a0a0a] p-6">
            <dl className="grid gap-4 sm:grid-cols-2">
              <InfoRow label="ชื่อเกม" value={game.name} />
              <InfoRow label="ประเภท" value={meta.label} />
              <InfoRow label="ราคา/ครั้ง" value={`${game.cost_points} พอยต์`} />
              <InfoRow label="สถานะ" value={game.is_active ? 'เปิดใช้งาน' : 'ปิดใช้งาน'} />
              <InfoRow label="สร้างเมื่อ" value={new Date(game.created_at).toLocaleString('th-TH')} />
              <InfoRow label="อัพเดตล่าสุด" value={new Date(game.updated_at).toLocaleString('th-TH')} />
              <div className="sm:col-span-2">
                <dt className="text-xs uppercase tracking-wider text-gray-500">คำอธิบาย</dt>
                <dd className="mt-1 text-sm text-gray-200">{game.description || '-'}</dd>
              </div>
            </dl>
            <div className="mt-6 flex justify-end">
              <Button variant="outline" onClick={onEditGame} className="gap-2">
                <Edit3 className="size-4" />
                แก้ไขข้อมูลเกม
              </Button>
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs uppercase tracking-wider text-gray-500">{label}</dt>
      <dd className="mt-1 text-sm text-gray-200">{value}</dd>
    </div>
  );
}

function PrizeRow({
  prize,
  onEdit,
  onDelete,
  onToggle,
}: {
  prize: Prize;
  onEdit: () => void;
  onDelete: () => void;
  onToggle: (v: boolean) => void;
}) {
  const meta = PRIZE_TYPE_META[prize.type];
  const TypeIcon = meta.icon;

  return (
    <div
      className={`flex items-center gap-4 rounded-xl border p-3 transition ${
        prize.is_active ? 'border-gray-800 bg-[#0a0a0a]' : 'border-gray-800/50 bg-[#0a0a0a]/50 opacity-60'
      }`}
    >
      <div className="flex size-12 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-white/10 bg-[#1a1a1a]">
        {prize.image_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={prize.image_url} alt={prize.name} className="size-12 object-cover" />
        ) : (
          <TypeIcon className="size-5 text-gray-400" />
        )}
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-medium text-white">{prize.name}</span>
          <Badge className={`text-xs ${meta.color}`} variant="outline">
            <TypeIcon className="mr-1 size-3" />
            {meta.label}
          </Badge>
        </div>
        <div className="mt-0.5 flex flex-wrap gap-x-3 text-xs text-gray-400">
          <span className="text-gray-200">{describePrizeValue(prize)}</span>
          <span>· โอกาส {Number(prize.probability).toFixed(2)}%</span>
          {prize.quantity != null && (
            <span>
              · เหลือ {prize.remaining_quantity ?? 0}/{prize.quantity}
            </span>
          )}
        </div>
      </div>

      <div className="flex items-center gap-2">
        <Switch checked={prize.is_active} onCheckedChange={onToggle} />
        <Button size="icon" variant="outline" onClick={onEdit} className="size-9">
          <Edit3 className="size-4" />
        </Button>
        <Button size="icon" variant="outline" onClick={onDelete} className="size-9 text-red-300 hover:bg-red-500/10 hover:text-red-200">
          <Trash2 className="size-4" />
        </Button>
      </div>
    </div>
  );
}

// ──────────────────────────────────────────────────────────────────────────
// Game Form Dialog
// ──────────────────────────────────────────────────────────────────────────

function GameFormDialog({
  open,
  onOpenChange,
  editing,
  form,
  setForm,
  saving,
  onSubmit,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  editing: boolean;
  form: GameForm;
  setForm: (f: GameForm) => void;
  saving: boolean;
  onSubmit: () => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Trophy className="size-5 text-amber-400" />
            {editing ? 'แก้ไขเกม' : 'สร้างเกมใหม่'}
          </DialogTitle>
          <DialogDescription>
            กำหนดข้อมูลพื้นฐานของเกม รางวัลสามารถเพิ่มได้หลังจากบันทึกเกม
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5 py-2">
          {/* ประเภทเกม - card selector */}
          <div className="space-y-2">
            <Label>ประเภทเกม</Label>
            <div className="grid grid-cols-2 gap-3">
              {(Object.keys(GAME_TYPE_META) as GameType[]).map((t) => {
                const m = GAME_TYPE_META[t];
                const Icon = m.icon;
                const active = form.type === t;
                return (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setForm({ ...form, type: t })}
                    className={`flex items-center gap-3 rounded-xl border-2 p-4 text-left transition ${
                      active
                        ? 'border-purple-500 bg-purple-500/10'
                        : 'border-gray-700 bg-[#0a0a0a] hover:border-purple-500/50'
                    }`}
                  >
                    <div className={`flex size-10 items-center justify-center rounded-lg bg-gradient-to-br ${m.gradient}`}>
                      <Icon className="size-5 text-white" />
                    </div>
                    <div>
                      <p className="font-semibold text-white">{m.label}</p>
                      <p className="text-xs text-gray-400">
                        {t === 'spin_wheel' ? 'หมุนวงล้อลุ้นรางวัล' : 'เปิดกล่องลุ้นรางวัล'}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="g-name">ชื่อเกม *</Label>
              <Input
                id="g-name"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="เช่น วงล้อโชคดี"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="g-cost">ราคาต่อครั้ง (พอยต์) *</Label>
              <div className="relative">
                <Coins className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-yellow-400" />
                <Input
                  id="g-cost"
                  type="number"
                  min={1}
                  className="pl-9"
                  value={form.cost_points}
                  onChange={(e) => setForm({ ...form, cost_points: e.target.value })}
                />
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="g-image">URL รูปภาพ (ถ้ามี)</Label>
            <Input
              id="g-image"
              type="url"
              value={form.image_url}
              onChange={(e) => setForm({ ...form, image_url: e.target.value })}
              placeholder="https://..."
            />
            {form.image_url && (
              <div className="mt-2 flex items-center gap-3 rounded-lg border border-gray-800 bg-[#0a0a0a] p-3">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={form.image_url}
                  alt="preview"
                  className="size-16 rounded-lg border border-gray-800 object-cover"
                  onError={(e) => ((e.currentTarget.style.display = 'none'))}
                />
                <span className="text-xs text-gray-400">พรีวิวรูปภาพ</span>
              </div>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="g-desc">คำอธิบาย</Label>
            <Textarea
              id="g-desc"
              rows={3}
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              placeholder="คำอธิบายสั้นๆ"
            />
          </div>

          <div className="flex items-center justify-between rounded-xl border border-gray-800 p-3">
            <div>
              <p className="text-sm font-medium text-white">เปิดใช้งานทันที</p>
              <p className="text-xs text-gray-400">ผู้ใช้จะเห็นเกมนี้บนหน้าเว็บ</p>
            </div>
            <Switch
              checked={form.is_active}
              onCheckedChange={(v) => setForm({ ...form, is_active: v })}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
            <X className="mr-2 size-4" />
            ยกเลิก
          </Button>
          <Button onClick={onSubmit} disabled={saving} className="bg-purple-600 hover:bg-purple-700">
            {saving ? <Spinner className="mr-2 size-4" /> : <Save className="mr-2 size-4" />}
            {editing ? 'บันทึกการเปลี่ยนแปลง' : 'สร้างเกม'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ──────────────────────────────────────────────────────────────────────────
// Prize Form Dialog
// ──────────────────────────────────────────────────────────────────────────

function PrizeFormDialog({
  open,
  onOpenChange,
  editing,
  form,
  setForm,
  saving,
  onSubmit,
  currentTotalProbability,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  editing: boolean;
  form: PrizeForm;
  setForm: (f: PrizeForm) => void;
  saving: boolean;
  onSubmit: () => void;
  currentTotalProbability: number;
}) {
  const projected = currentTotalProbability + Number(form.probability || 0);
  const exceeds = form.is_active && projected > 100;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Gift className="size-5 text-pink-400" />
            {editing ? 'แก้ไขรางวัล' : 'เพิ่มรางวัล'}
          </DialogTitle>
          <DialogDescription>กำหนดประเภท ค่า โอกาสได้รับ และจำนวนของรางวัล</DialogDescription>
        </DialogHeader>

        <div className="space-y-5 py-2">
          {/* ประเภทรางวัล cards */}
          <div className="space-y-2">
            <Label>ประเภทรางวัล</Label>
            <div className="grid grid-cols-3 gap-2">
              {(Object.keys(PRIZE_TYPE_META) as PrizeType[]).map((t) => {
                const m = PRIZE_TYPE_META[t];
                const Icon = m.icon;
                const active = form.type === t;
                return (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setForm({ ...form, type: t })}
                    className={`flex flex-col items-center gap-1.5 rounded-xl border-2 p-3 transition ${
                      active ? 'border-emerald-500 bg-emerald-500/10' : 'border-gray-700 bg-[#0a0a0a] hover:border-emerald-500/50'
                    }`}
                  >
                    <Icon className={`size-5 ${active ? 'text-emerald-400' : 'text-gray-300'}`} />
                    <span className="text-sm font-medium text-white">{m.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="p-name">ชื่อรางวัล *</Label>
              <Input
                id="p-name"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="เช่น 100 พอยต์ฟรี"
              />
            </div>

            {/* Type-specific value editor */}
            {form.type === 'points' && (
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="p-points">จำนวนพอยต์ที่จะได้รับ *</Label>
                <div className="relative">
                  <Coins className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-yellow-400" />
                  <Input
                    id="p-points"
                    type="number"
                    min={1}
                    className="pl-9"
                    value={form.pointsAmount}
                    onChange={(e) => setForm({ ...form, pointsAmount: e.target.value })}
                  />
                </div>
              </div>
            )}

            {form.type === 'coupon' && (
              <>
                <div className="space-y-2">
                  <Label>ประเภทส่วนลด *</Label>
                  <Select
                    value={form.couponKind}
                    onValueChange={(v) => setForm({ ...form, couponKind: v as CouponKind })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="percent">
                        <span className="inline-flex items-center gap-2">
                          <Percent className="size-4" /> ลดเป็นเปอร์เซ็นต์ (%)
                        </span>
                      </SelectItem>
                      <SelectItem value="fixed">
                        <span className="inline-flex items-center gap-2">
                          <Wallet className="size-4" /> ลดเป็นจำนวนเงิน (บาท)
                        </span>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="p-coupon-amt">
                    จำนวน{form.couponKind === 'percent' ? ' (%)' : ' (บาท)'} *
                  </Label>
                  <div className="relative">
                    {form.couponKind === 'percent' ? (
                      <Percent className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-emerald-400" />
                    ) : (
                      <Wallet className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-emerald-400" />
                    )}
                    <Input
                      id="p-coupon-amt"
                      type="number"
                      min={1}
                      max={form.couponKind === 'percent' ? 100 : undefined}
                      className="pl-9"
                      value={form.couponAmount}
                      onChange={(e) => setForm({ ...form, couponAmount: e.target.value })}
                    />
                  </div>
                </div>
              </>
            )}

            {form.type === 'other' && (
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="p-other">คำอธิบายรางวัล *</Label>
                <Input
                  id="p-other"
                  value={form.otherText}
                  onChange={(e) => setForm({ ...form, otherText: e.target.value })}
                  placeholder="เช่น เสื้อยืดของแบรนด์"
                />
              </div>
            )}
          </div>

          {/* Probability */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="p-prob">โอกาสได้รับ (%) *</Label>
              {form.is_active && (
                <span className={`text-xs ${exceeds ? 'text-red-400' : 'text-gray-400'}`}>
                  รวมหลังเพิ่ม: {projected.toFixed(2)}%
                  {exceeds && ' (เกิน 100%)'}
                </span>
              )}
            </div>
            <div className="flex items-center gap-3">
              <input
                type="range"
                min={0.01}
                max={100}
                step={0.01}
                value={Number(form.probability) || 0}
                onChange={(e) => setForm({ ...form, probability: e.target.value })}
                className="h-2 flex-1 cursor-pointer appearance-none rounded-full bg-gray-800 accent-purple-500"
              />
              <Input
                id="p-prob"
                type="number"
                min={0.01}
                max={100}
                step={0.01}
                value={form.probability}
                onChange={(e) => setForm({ ...form, probability: e.target.value })}
                className="w-24"
              />
            </div>
          </div>

          {/* Quantity & display order */}
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="p-qty">จำนวนสต็อก</Label>
              <div className="relative">
                <Hash className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-gray-500" />
                <Input
                  id="p-qty"
                  type="number"
                  min={1}
                  className="pl-9"
                  value={form.quantity}
                  onChange={(e) => setForm({ ...form, quantity: e.target.value })}
                  placeholder="เว้นว่าง = ไม่จำกัด"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="p-order">ลำดับการแสดง</Label>
              <Input
                id="p-order"
                type="number"
                value={form.display_order}
                onChange={(e) => setForm({ ...form, display_order: e.target.value })}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="p-image">URL รูปรางวัล</Label>
            <Input
              id="p-image"
              type="url"
              value={form.image_url}
              onChange={(e) => setForm({ ...form, image_url: e.target.value })}
              placeholder="https://..."
            />
            {form.image_url && (
              <div className="mt-2 flex items-center gap-3 rounded-lg border border-gray-800 bg-[#0a0a0a] p-3">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={form.image_url}
                  alt="preview"
                  className="size-12 rounded-lg border border-gray-800 object-cover"
                  onError={(e) => ((e.currentTarget.style.display = 'none'))}
                />
                <span className="text-xs text-gray-400">พรีวิวรูปรางวัล</span>
              </div>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="p-desc">คำอธิบาย</Label>
            <Textarea
              id="p-desc"
              rows={2}
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
            />
          </div>

          <div className="flex items-center justify-between rounded-xl border border-gray-800 p-3">
            <div>
              <p className="text-sm font-medium text-white">เปิดใช้งานรางวัล</p>
              <p className="text-xs text-gray-400">เฉพาะรางวัลที่เปิดอยู่จะถูกใช้สุ่ม</p>
            </div>
            <Switch
              checked={form.is_active}
              onCheckedChange={(v) => setForm({ ...form, is_active: v })}
            />
          </div>

          {exceeds && (
            <div className="flex items-start gap-2 rounded-xl border border-red-500/40 bg-red-500/10 p-3 text-sm text-red-200">
              <AlertTriangle className="mt-0.5 size-4" />
              <p>ความน่าจะเป็นรวมจะเกิน 100% หลังบันทึก กรุณาปรับลดค่าก่อน หรือปิดรางวัลตัวอื่นก่อน</p>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
            <X className="mr-2 size-4" />
            ยกเลิก
          </Button>
          <Button
            onClick={onSubmit}
            disabled={saving || exceeds}
            className="bg-emerald-600 hover:bg-emerald-700"
          >
            {saving ? <Spinner className="mr-2 size-4" /> : <Save className="mr-2 size-4" />}
            {editing ? 'บันทึก' : 'เพิ่มรางวัล'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

