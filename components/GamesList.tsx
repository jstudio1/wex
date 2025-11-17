'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import SpinWheel from './SpinWheel';
import LootBox from './LootBox';
import { useToast } from '@/components/ui/use-toast';

type Prize = {
  id: number;
  name: string;
  type: string;
  value: string;
  image_url?: string | null;
  display_order: number;
};

type Game = {
  id: number;
  name: string;
  type: 'spin_wheel' | 'loot_box';
  cost_points: number;
  description?: string | null;
  image_url?: string | null;
  game_prizes: Prize[];
};

type GamesListProps = {
  onGameSelected?: (game: Game | null) => void;
};

export default function GamesList({ onGameSelected }: GamesListProps = {}) {
  const [games, setGames] = useState<Game[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedGame, setSelectedGame] = useState<Game | null>(null);
  const toast = useToast();

  useEffect(() => {
    fetchGames();
  }, []);

  useEffect(() => {
    const handleBack = () => {
      setSelectedGame(null);
      onGameSelected?.(null);
    };
    
    window.addEventListener('game:back', handleBack);
    return () => window.removeEventListener('game:back', handleBack);
  }, [onGameSelected]);

  useEffect(() => {
    onGameSelected?.(selectedGame);
  }, [selectedGame, onGameSelected]);

  const fetchGames = async () => {
    try {
      const res = await fetch('/api/games', {
        cache: 'default',
        headers: { 'Cache-Control': 'max-age=60' }
      });
      const json = await res.json();
      if (json.ok) {
        // กรองเกมที่เปิดใช้งานและมีรางวัล
        const activeGames = (json.data || []).filter((game: any) => 
          game.is_active === true && 
          game.game_prizes && 
          game.game_prizes.length > 0
        );
        console.log('Games fetched:', activeGames);
        setGames(activeGames);
      } else {
        console.error('Failed to fetch games:', json.error, json.details);
        toast.show({
          title: 'เกิดข้อผิดพลาด',
          description: json.details || json.error || 'ไม่สามารถโหลดข้อมูลได้',
          variant: 'destructive',
        });
      }
    } catch (err) {
      console.error('Failed to fetch games:', err);
      toast.show({
        title: 'เกิดข้อผิดพลาด',
        description: 'ไม่สามารถโหลดข้อมูลได้',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handlePlayComplete = (prizeData: any) => {
    if (prizeData.type === 'points') {
      toast.show({
        title: 'ได้รับพอยต์!',
        description: `คุณได้รับ ${prizeData.value} พอยต์`,
      });
    } else {
      toast.show({
        title: 'ได้รับรางวัล!',
        description: `คุณได้รับ ${prizeData.name} ตรวจสอบได้ที่ประวัติการเล่น`,
      });
    }
  };

  if (loading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {[1, 2, 3].map(i => (
          <div key={i} className="bg-black/40 backdrop-blur-sm border border-white/10 rounded-xl overflow-hidden">
            <Skeleton className="h-48 w-full" />
            <div className="p-4 space-y-3">
              <Skeleton className="h-6 w-32" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-3/4" />
              <div className="pt-3 border-t border-white/10">
                <Skeleton className="h-10 w-full" />
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (selectedGame) {
    return (
      <>
        {selectedGame.type === 'spin_wheel' ? (
          <SpinWheel
            gameId={selectedGame.id}
            gameName={selectedGame.name}
            costPoints={Number(selectedGame.cost_points)}
            prizes={selectedGame.game_prizes || []}
            onSpinComplete={handlePlayComplete}
          />
        ) : (
          <LootBox
            gameId={selectedGame.id}
            gameName={selectedGame.name}
            costPoints={Number(selectedGame.cost_points)}
            prizes={selectedGame.game_prizes || []}
            onOpenComplete={handlePlayComplete}
          />
        )}
      </>
    );
  }

  if (games.length === 0) {
    return (
      <div className="bg-black/40 backdrop-blur-sm border border-white/10 rounded-xl p-8 text-center">
          <p className="text-[color:var(--text)]/60">ยังไม่มีเกมที่เปิดใช้งาน</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
      {games.map((game) => {
        const hasPrizes = game.game_prizes && game.game_prizes.length > 0;
        const prizeCount = game.game_prizes?.length || 0;
        
        return (
          <div
            key={game.id}
            className={`group relative bg-black/40 backdrop-blur-sm border border-white/10 rounded-xl overflow-hidden transition-all duration-300 hover:border-accent/50 hover:scale-[1.02] cursor-pointer ${
              !hasPrizes ? 'opacity-60' : ''
            }`}
            onClick={() => hasPrizes && setSelectedGame(game)}
          >
            {/* Image Section */}
            {game.image_url ? (
              <div className="relative w-full h-48 overflow-hidden bg-black/20">
                  <img
                    src={game.image_url}
                    alt={game.name}
                  className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-110"
                  />
                <div className="absolute top-3 right-3">
                  <Badge variant="outline" className="bg-black/60 backdrop-blur-sm text-xs">
                    {game.type === 'spin_wheel' ? '🎡 วงล้อ' : '📦 กล่อง'}
                  </Badge>
                </div>
              </div>
            ) : (
              <div className="relative w-full h-48 bg-white/5 flex items-center justify-center">
                <div className="text-6xl opacity-20">
                  {game.type === 'spin_wheel' ? '🎡' : '📦'}
                </div>
                <div className="absolute top-3 right-3">
                  <Badge variant="outline" className="bg-black/60 backdrop-blur-sm text-xs">
                    {game.type === 'spin_wheel' ? '🎡 วงล้อ' : '📦 กล่อง'}
                  </Badge>
                </div>
                </div>
              )}
              
            {/* Content Section */}
            <div className="p-4 space-y-3">
              <div>
                <h3 className="text-lg font-semibold text-[color:var(--text)] mb-1">{game.name}</h3>
                {game.description && (
                  <p className="text-[color:var(--text)]/60 text-sm line-clamp-2">{game.description}</p>
                )}
              </div>
              
              <div className="flex items-center justify-between pt-3 border-t border-white/10">
                <div className="flex items-center gap-2">
                  <span className="text-accent font-medium text-sm">{game.cost_points} พอยต์</span>
                  {hasPrizes && (
                    <Badge variant="secondary" className="text-xs">
                      {prizeCount} รางวัล
                    </Badge>
                  )}
                </div>
              </div>
              
              <Button 
                className="w-full"
                onClick={(e) => {
                  e.stopPropagation();
                  if (hasPrizes) {
                    setSelectedGame(game);
                  }
                }}
                disabled={!hasPrizes}
                variant={hasPrizes ? 'default' : 'secondary'}
              >
                {hasPrizes ? 'เล่นเลย' : 'ยังไม่มีรางวัล'}
              </Button>
              
              {!hasPrizes && (
                <p className="text-xs text-[color:var(--text)]/40 text-center">
                  ยังไม่มีรางวัลสำหรับเกมนี้
                </p>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

