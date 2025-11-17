#!/bin/bash

# Script สำหรับ deploy TermGame ด้วย Docker
# Usage: ./deploy.sh [production|development]

set -e

MODE=${1:-production}

echo "🚀 TermGame Docker Deployment Script"
echo "Mode: $MODE"
echo ""

# ตรวจสอบว่ามี Docker หรือไม่
if ! command -v docker &> /dev/null; then
    echo "❌ Docker ไม่พบ! กรุณาติดตั้ง Docker ก่อน"
    exit 1
fi

# ตรวจสอบว่ามี Docker Compose หรือไม่
if ! command -v docker-compose &> /dev/null && ! docker compose version &> /dev/null; then
    echo "❌ Docker Compose ไม่พบ! กรุณาติดตั้ง Docker Compose ก่อน"
    exit 1
fi

# ตรวจสอบไฟล์ .env.local
if [ ! -f ".env.local" ]; then
    echo "⚠️  ไฟล์ .env.local ไม่พบ"
    echo "📝 สร้างจากไฟล์ .env.example"
    if [ -f ".env.example" ]; then
        cp .env.example .env.local
        echo "✅ สร้างไฟล์ .env.local แล้ว กรุณาแก้ไขค่าภายในก่อนรัน script อีกครั้ง"
        exit 1
    else
        echo "❌ ไฟล์ .env.example ไม่พบด้วย! กรุณาสร้างไฟล์ .env.local เอง"
        exit 1
    fi
fi

# ตรวจสอบค่า SUPABASE_URL ใน .env.local
if ! grep -q "SUPABASE_URL=" .env.local || grep -q "SUPABASE_URL=your_supabase" .env.local; then
    echo "⚠️  ยังไม่ได้ตั้งค่า SUPABASE_URL ในไฟล์ .env.local"
    echo "กรุณาแก้ไขไฟล์ .env.local ก่อนรัน script อีกครั้ง"
    exit 1
fi

echo "✅ ไฟล์ .env.local พบแล้ว"
echo ""

# หยุด containers ที่ทำงานอยู่
echo "🛑 หยุด containers ที่ทำงานอยู่..."
if [ "$MODE" = "production" ]; then
    docker-compose down 2>/dev/null || true
else
    docker-compose -f docker-compose.dev.yml down 2>/dev/null || true
fi

# Build และ start
echo "🔨 Build และ start containers..."
if [ "$MODE" = "production" ]; then
    docker-compose up -d --build
    echo ""
    echo "✅ Deploy สำเร็จ!"
    echo "📊 ตรวจสอบ logs: docker-compose logs -f"
    echo "🌐 เข้าใช้งาน: http://localhost:3000"
else
    docker-compose -f docker-compose.dev.yml up -d --build
    echo ""
    echo "✅ Deploy สำเร็จ (Development Mode)!"
    echo "📊 ตรวจสอบ logs: docker-compose -f docker-compose.dev.yml logs -f"
    echo "🌐 เข้าใช้งาน: http://localhost:3000"
fi

echo ""
echo "📋 สถานะ containers:"
if [ "$MODE" = "production" ]; then
    docker-compose ps
else
    docker-compose -f docker-compose.dev.yml ps
fi

