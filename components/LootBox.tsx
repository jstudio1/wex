'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Package, Coins, Ticket, Gift } from 'lucide-react';

type Prize = {
  id: number;
  name: string;
  type: string;
  value: string;
  image_url?: string | null;
};

type LootBoxProps = {
  gameId: number;
  gameName: string;
  costPoints: number;
  prizes: Prize[];
  onOpenComplete: (prize: any) => void;
};

export default function LootBox({ gameId, gameName, costPoints, prizes, onOpenComplete }: LootBoxProps) {
  const [opening, setOpening] = useState(false);
  const [selectedPrize, setSelectedPrize] = useState<Prize | null>(null);
  const [revealed, setRevealed] = useState(false);

  const openBox = async () => {
    if (opening || prizes.length === 0) return;

    setOpening(true);
    setSelectedPrize(null);
    setRevealed(false);

    try {
      const res = await fetch(`/api/games/${gameId}/play`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });

      const json = await res.json();
      if (!json.ok) {
        alert(json.message || 'เกิดข้อผิดพลาด');
        setOpening(false);
        return;
      }

      const wonPrize = prizes.find(p => p.id === json.data.prize.id);
      if (wonPrize) {
        setTimeout(() => {
          setSelectedPrize(wonPrize);
          setRevealed(true);
          setOpening(false);
          onOpenComplete(json.data.prize);
          window.dispatchEvent(new Event('wallet:changed'));
        }, 2000);
      }
    } catch (err) {
      console.error('Open box error:', err);
      alert('เกิดข้อผิดพลาด');
      setOpening(false);
    }
  };

  const getPrizeIcon = (type: string) => {
    if (type === 'points') return <Coins className="size-5" />;
    if (type === 'coupon') return <Ticket className="size-5" />;
    return <Gift className="size-5" />;
  };

  return (
    <div className="w-full max-w-5xl mx-auto">
      <Card>
        <CardHeader className="pb-3">
            <div>
              <CardTitle className="text-2xl">{gameName}</CardTitle>
              <p className="text-[color:var(--text)]/60 text-sm mt-1">ใช้ {costPoints} พอยต์ / ครั้ง</p>
          </div>
        </CardHeader>
        <CardContent className="p-4">
          <div className="grid md:grid-cols-3 gap-4">
            {/* Box - Left Column */}
            <div className="md:col-span-2 space-y-4">
              <div className="flex justify-center">
                <div className="relative">
                  {!revealed ? (
                    <div
                      className={`w-64 h-64 rounded-xl border-2 transition-all duration-300 ${
                        opening
                          ? 'border-yellow-400 bg-yellow-500/20 scale-105'
                          : 'border-white/20 bg-white/5 hover:border-white/30'
                      } flex items-center justify-center`}
                    >
                      <Package 
                        className={`size-20 transition-all ${
                          opening ? 'text-yellow-400 animate-spin' : 'text-[color:var(--text)]/60'
                        }`} 
                      />
                    </div>
                  ) : (
                    <div className="w-64 h-64 rounded-xl border-2 border-green-500/50 bg-green-500/10 flex flex-col items-center justify-center p-4">
                      {selectedPrize?.image_url ? (
                        <img
                          src={selectedPrize.image_url}
                          alt={selectedPrize.name}
                          className="w-32 h-32 object-cover rounded-lg mb-3"
                        />
                      ) : (
                        <div className="mb-3">{getPrizeIcon(selectedPrize?.type || 'other')}</div>
                      )}
                      <p className="text-[color:var(--text)] font-semibold text-lg text-center">{selectedPrize?.name}</p>
                    </div>
                  )}
                </div>
              </div>
              
              <div className="flex justify-center">
                <Button
                  onClick={openBox}
                  disabled={opening || prizes.length === 0}
                  className="w-full max-w-xs"
                  size="lg"
                >
                  {opening ? (
                    'กำลังเปิดกล่อง...'
                  ) : revealed ? (
                    'เปิดกล่องอีกครั้ง'
                  ) : (
                    'เปิดกล่อง'
                  )}
                </Button>
              </div>
            </div>

            {/* Right Column - Prize List */}
            <div className="space-y-3">
              <div>
                <p className="text-xs text-[color:var(--text)]/60 mb-2 font-medium">รายการรางวัล</p>
                <div className="space-y-2 max-h-[400px] overflow-y-auto pr-2">
                  {prizes.map((prize) => (
                    <div
                      key={prize.id}
                      className="flex items-center gap-2 p-2 rounded-lg border border-white/10 bg-white/5 hover:bg-white/10 transition-colors"
                    >
                      <div>{getPrizeIcon(prize.type)}</div>
                      <span className="text-xs text-[color:var(--text)]/80 flex-1">{prize.name}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
