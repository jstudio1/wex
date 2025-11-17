'use client';

import { useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { SpinnerCustom } from '@/components/ui/spinner';
import { Coins, Ticket, Gift } from 'lucide-react';

type Prize = {
  id: number;
  name: string;
  type: string;
  value: string;
  image_url?: string | null;
};

type SpinWheelProps = {
  gameId: number;
  gameName: string;
  costPoints: number;
  prizes: Prize[];
  onSpinComplete: (prize: any) => void;
};

// Minimal colors - alternating white and gray
const getSliceColor = (index: number) => {
  return index % 2 === 0 
    ? ['rgba(255, 255, 255, 0.1)', 'rgba(255, 255, 255, 0.05)'] // Light
    : ['rgba(255, 255, 255, 0.15)', 'rgba(255, 255, 255, 0.08)']; // Slightly lighter
};

export default function SpinWheel({ gameId, gameName, costPoints, prizes, onSpinComplete }: SpinWheelProps) {
  const [spinning, setSpinning] = useState(false);
  const [selectedPrize, setSelectedPrize] = useState<Prize | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number | null>(null);

  const spin = async () => {
    if (spinning || prizes.length === 0) return;

    setSpinning(true);
    setSelectedPrize(null);

    try {
      const res = await fetch(`/api/games/${gameId}/play`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });

      const json = await res.json();
      if (!json.ok) {
        alert(json.message || 'เกิดข้อผิดพลาด');
        setSpinning(false);
        return;
      }

      const wonPrize = prizes.find(p => p.id === json.data.prize.id);
      if (wonPrize) {
        animateSpin(wonPrize, json.data.prize);
      }
    } catch (err) {
      console.error('Spin error:', err);
      alert('เกิดข้อผิดพลาด');
      setSpinning(false);
    }
  };

  const animateSpin = (prize: Prize, prizeData: any) => {
    if (!canvasRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2;
    const radius = Math.min(centerX, centerY) - 40;
    const prizeIndex = prizes.findIndex(p => p.id === prize.id);
    const sliceAngle = (2 * Math.PI) / prizes.length;
    
    // Pointer อยู่ที่ด้านบน (ตำแหน่ง 3π/2 หรือ -π/2 หรือ 270°)
    // การวาดวงล้อ: แต่ละ slice วาดด้วย ctx.rotate(angle) โดย angle = (index * sliceAngle) + rotation
    // เมื่อ rotation = 0, slice index 0 จะอยู่ที่มุม 0° (ด้านขวา)
    // 
    // ต้องการให้กึ่งกลาง slice ที่ prizeIndex อยู่ตรง pointer (ด้านบน = 3π/2)
    // กึ่งกลาง slice อยู่ที่: prizeIndex * sliceAngle + sliceAngle/2 + rotation
    // ตำแหน่งที่ต้องการ (pointer): 3π/2
    // 
    // ดังนั้น: prizeIndex * sliceAngle + sliceAngle/2 + finalRotation ≡ 3π/2 (mod 2π)
    // finalRotation ≡ 3π/2 - prizeIndex * sliceAngle - sliceAngle/2 (mod 2π)
    // 
    // แต่ finalRotation = totalRotations * 2π + targetAngle
    // ดังนั้น: totalRotations * 2π + targetAngle ≡ 3π/2 - prizeIndex * sliceAngle - sliceAngle/2 (mod 2π)
    // targetAngle ≡ 3π/2 - prizeIndex * sliceAngle - sliceAngle/2 (mod 2π)
    // 
    // Normalize targetAngle ให้อยู่ในช่วง [0, 2π)
    let currentRotation = 0;
    const totalRotations = 6;
    const rawTargetAngle = (3 * Math.PI) / 2 - (prizeIndex * sliceAngle) - (sliceAngle / 2);
    // Normalize ให้อยู่ในช่วง [0, 2π)
    let targetAngle = ((rawTargetAngle % (2 * Math.PI)) + (2 * Math.PI)) % (2 * Math.PI);
    const finalRotation = totalRotations * 2 * Math.PI + targetAngle;
    const duration = 3500;
    const startTime = Date.now();

    const drawWheel = (rotation: number) => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      prizes.forEach((prize, index) => {
        const angle = (index * sliceAngle) + rotation;
        const [color1, color2] = getSliceColor(index);
        
        ctx.save();
        ctx.translate(centerX, centerY);
        ctx.rotate(angle);
        
        const gradient = ctx.createLinearGradient(0, -radius, 0, radius);
        gradient.addColorStop(0, color1);
        gradient.addColorStop(1, color2);
        
        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.arc(0, 0, radius, 0, sliceAngle);
        ctx.lineTo(0, 0);
        ctx.fill();

        ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
        ctx.lineWidth = 1.5;
        ctx.stroke();

        ctx.fillStyle = '#ffffff';
        ctx.font = '500 13px Kanit, sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.rotate(sliceAngle / 2);
        
        // Better text positioning
        const textRadius = radius * 0.65;
        ctx.fillText(prize.name, textRadius, 0);
        ctx.restore();
      });

      // Center circle
      const centerGradient = ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, 50);
      centerGradient.addColorStop(0, 'rgba(255, 255, 255, 0.1)');
      centerGradient.addColorStop(1, 'rgba(0, 0, 0, 0.3)');
      ctx.fillStyle = centerGradient;
      ctx.beginPath();
      ctx.arc(centerX, centerY, 50, 0, 2 * Math.PI);
      ctx.fill();

      // Pointer
      ctx.fillStyle = '#ffffff';
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(centerX, centerY - radius - 10);
      ctx.lineTo(centerX - 20, centerY - radius - 40);
      ctx.lineTo(centerX + 20, centerY - radius - 40);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
    };

    const animate = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const easeOut = 1 - Math.pow(1 - progress, 3);
      currentRotation = easeOut * finalRotation;

      drawWheel(currentRotation);

      if (progress < 1) {
        animationRef.current = requestAnimationFrame(animate);
      } else {
        setSelectedPrize(prize);
        setSpinning(false);
        onSpinComplete(prizeData);
        window.dispatchEvent(new Event('wallet:changed'));
      }
    };

    animate();
  };

  useEffect(() => {
    if (!canvasRef.current || prizes.length === 0) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // เคลียร์ canvas ก่อนวาด
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2;
    const radius = Math.min(centerX, centerY) - 40;
    const sliceAngle = (2 * Math.PI) / prizes.length;

    prizes.forEach((prize, index) => {
      const [color1, color2] = getSliceColor(index);
      
      ctx.save();
      ctx.translate(centerX, centerY);
      // หมุนเพื่อวาง slice ในตำแหน่งที่ถูกต้อง
      const angle = index * sliceAngle;
      ctx.rotate(angle);
      
      const gradient = ctx.createLinearGradient(0, -radius, 0, radius);
      gradient.addColorStop(0, color1);
      gradient.addColorStop(1, color2);
      
      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.arc(0, 0, radius, 0, sliceAngle);
      ctx.lineTo(0, 0);
      ctx.fill();

      ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
      ctx.lineWidth = 1.5;
      ctx.stroke();

      ctx.fillStyle = '#ffffff';
      ctx.font = '500 13px Kanit, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.rotate(sliceAngle / 2);
      
      // Better text positioning
      const textRadius = radius * 0.65;
      ctx.fillText(prize.name, textRadius, 0);
      ctx.restore();
    });

    const centerGradient = ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, 50);
    centerGradient.addColorStop(0, 'rgba(255, 255, 255, 0.1)');
    centerGradient.addColorStop(1, 'rgba(0, 0, 0, 0.3)');
    ctx.fillStyle = centerGradient;
    ctx.beginPath();
    ctx.arc(centerX, centerY, 50, 0, 2 * Math.PI);
    ctx.fill();

    // Pointer
    ctx.fillStyle = '#ffffff';
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(centerX, centerY - radius - 10);
    ctx.lineTo(centerX - 20, centerY - radius - 40);
    ctx.lineTo(centerX + 20, centerY - radius - 40);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [prizes]);

  const getPrizeIcon = (type: string) => {
    if (type === 'points') return <Coins className="size-4" />;
    if (type === 'coupon') return <Ticket className="size-4" />;
    return <Gift className="size-4" />;
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
            {/* Wheel - Left Column */}
            <div className="md:col-span-2 space-y-4">
          <div className="flex justify-center">
            <canvas
              ref={canvasRef}
              width={400}
              height={400}
              className="max-w-full h-auto"
            />
          </div>
              
              <div className="flex justify-center">
                <Button
                  onClick={spin}
                  disabled={spinning || prizes.length === 0}
                  className="w-full max-w-xs"
                  size="lg"
                >
                  {spinning ? (
                    <>
                      <SpinnerCustom className="mr-2 size-4" />
                      กำลังหมุน...
                    </>
                  ) : (
                    'หมุนวงล้อ'
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
                      <div className="text-base">{getPrizeIcon(prize.type)}</div>
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
