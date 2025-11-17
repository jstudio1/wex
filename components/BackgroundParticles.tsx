'use client';

import { useEffect, useRef } from 'react';

export default function BackgroundParticles() {
  const ref = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = ref.current!;
    const ctx = canvas.getContext('2d')!;
    let raf = 0;

    const DPR = Math.min(window.devicePixelRatio || 1, 2);
    type P = { x: number; y: number; vx: number; vy: number; r: number; a: number; hue: number; pulse: number };
    const particles: P[] = [];

    function resize() {
      const { innerWidth: w, innerHeight: h } = window;
      canvas.width = Math.floor(w * DPR);
      canvas.height = Math.floor(h * DPR);
      canvas.style.width = w + 'px';
      canvas.style.height = h + 'px';
    }
    resize();
    window.addEventListener('resize', resize);

    // init
    const count = Math.min(140, Math.floor((window.innerWidth * window.innerHeight) / 16000));
    for (let i = 0; i < count; i++) {
      particles.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        // ลอยจากทุกทิศแบบสุ่ม ฟุ้ง ๆ ช้า ๆ
        vx: (Math.random() - 0.5) * 0.22 * DPR,
        vy: (Math.random() - 0.5) * 0.22 * DPR,
        r: (Math.random() * 1.2 + 0.5) * DPR,
        a: Math.random() * 0.17 + 0.18,
        hue: 30 + Math.random() * 60, // โทนทอง-ส้ม
        pulse: Math.random() * Math.PI * 2
      });
    }

    function step() {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      // ไล่เฉดพื้นหลังบางมากให้ดูมีมิติ
      const bg = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
      bg.addColorStop(0, 'rgba(255,255,255,0.01)');
      bg.addColorStop(1, 'rgba(0,0,0,0.0)');
      ctx.fillStyle = bg;
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      ctx.globalCompositeOperation = 'lighter'; // additive แสงสวยนุ่ม
      for (const p of particles) {
        p.pulse += 0.01 + (p.r * 0.003);
        const amp = (Math.sin(p.pulse) + 1) * 0.5; // 0..1
        const alpha = p.a * (0.5 + 0.5 * amp); // โดยรวมจางลง

        // เคลื่อนที่สุ่มจากทุกทิศ และมี drift จาง ๆ ตามจังหวะ
        p.x += p.vx + Math.sin(p.pulse * 0.9) * 0.04 * DPR;
        p.y += p.vy + Math.cos(p.pulse * 1.1) * 0.04 * DPR;

        // wrap รอบทุกขอบให้วนกลับมา
        if (p.y > canvas.height + 12) p.y = -12;
        if (p.y < -12) p.y = canvas.height + 12;
        if (p.x < -12) p.x = canvas.width + 12;
        if (p.x > canvas.width + 12) p.x = -12;

        const rg = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.r * 2.5);
        rg.addColorStop(0, `hsla(${p.hue}, 90%, 72%, ${Math.min(0.9, alpha)})`);
        rg.addColorStop(0.35, `hsla(${p.hue}, 90%, 60%, ${alpha * 0.45})`);
        rg.addColorStop(1, `rgba(255,255,255,0)`);
        ctx.fillStyle = rg;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r * 2.5, 0, Math.PI * 2);
        ctx.fill();

        // flare เส้นบาง ๆ จางลงกว่าเดิม
        ctx.strokeStyle = `hsla(${p.hue}, 100%, 75%, ${alpha * 0.28})`;
        ctx.lineWidth = 0.5 * DPR;
        ctx.beginPath();
        ctx.moveTo(p.x - p.r * 1.6, p.y);
        ctx.lineTo(p.x + p.r * 1.6, p.y);
        ctx.stroke();
      }
      ctx.globalCompositeOperation = 'source-over';
      raf = requestAnimationFrame(step);
    }
    raf = requestAnimationFrame(step);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', resize);
    };
  }, []);

  return <canvas ref={ref} className="pointer-events-none fixed inset-0 -z-10" />;
}


