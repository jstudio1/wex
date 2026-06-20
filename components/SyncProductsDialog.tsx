'use client'

import * as React from 'react'
import { Button } from '@/components/ui/button'
import { Spinner } from '@/components/ui/spinner'
import { Progress } from '@/components/ui/progress'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"

interface SyncProductsDialogProps {
  label?: string
  productType?: string
  action: (productType: string | undefined, options: { 
    resetProductName: boolean; 
    resetItemName: boolean;
    resetPrice: boolean;
    resetInputs: boolean;
    deleteRemoved: boolean;
  }) => Promise<void>
}

export default function SyncProductsDialog({ label = 'Sync จากผู้ให้บริการ', productType, action }: SyncProductsDialogProps) {
  const [open, setOpen] = React.useState(false)
  const [pending, setPending] = React.useState(false)
  const [progress, setProgress] = React.useState(0)
  
  const [resetProductName, setResetProductName] = React.useState(false)
  const [resetItemName, setResetItemName] = React.useState(false)
  const [resetPrice, setResetPrice] = React.useState(false)
  const [resetInputs, setResetInputs] = React.useState(false)
  const [deleteRemoved, setDeleteRemoved] = React.useState(true)

  React.useEffect(() => {
    if (!pending) {
      setProgress(0)
      return
    }
    setProgress(10)
    const id = setInterval(() => {
      setProgress((p) => (p < 90 ? p + 8 : 90))
    }, 300)
    return () => clearInterval(id)
  }, [pending])

  const handleSync = async () => {
    setPending(true)
    try {
      await action(productType, { resetProductName, resetItemName, resetPrice, resetInputs, deleteRemoved })
      setOpen(false)
    } catch (err) {
      console.error(err)
    } finally {
      setPending(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={(val) => !pending && setOpen(val)}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline">
          {label}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>ตั้งค่าการดึงข้อมูล (Sync)</DialogTitle>
          <DialogDescription>
            เลือกข้อมูลที่คุณต้องการรีเซ็ตใหม่จากการดึงข้อมูลระบบต้นทาง (wePAY)
            ข้อมูลที่ไม่ได้เลือกจะยังคงเป็นข้อมูลเดิมที่คุณเคยแก้ไขไว้
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4 max-h-[60vh] overflow-y-auto">
          <div className="flex items-start space-x-3">
            <Checkbox 
              id="resetProductName" 
              checked={resetProductName} 
              onChange={(e) => setResetProductName(e.target.checked)} 
              disabled={pending}
            />
            <div className="grid gap-1.5 leading-none">
              <Label htmlFor="resetProductName" className="font-semibold cursor-pointer">ชื่อเกม / ชื่อแอป</Label>
              <p className="text-sm text-[color:var(--text)]/60">เปลี่ยนชื่อหลักของบริการกลับเป็นชื่อดั้งเดิม</p>
            </div>
          </div>

          <div className="flex items-start space-x-3">
            <Checkbox 
              id="resetItemName" 
              checked={resetItemName} 
              onChange={(e) => setResetItemName(e.target.checked)} 
              disabled={pending}
            />
            <div className="grid gap-1.5 leading-none">
              <Label htmlFor="resetItemName" className="font-semibold cursor-pointer">ชื่อแพ็กเกจสินค้า</Label>
              <p className="text-sm text-[color:var(--text)]/60">เช่น "100 VP" กลับเป็นชื่อดั้งเดิม</p>
            </div>
          </div>

          <div className="flex items-start space-x-3">
            <Checkbox 
              id="resetInputs" 
              checked={resetInputs} 
              onChange={(e) => setResetInputs(e.target.checked)} 
              disabled={pending}
            />
            <div className="grid gap-1.5 leading-none">
              <Label htmlFor="resetInputs" className="font-semibold cursor-pointer">กล่องข้อมูล ID & เซิร์ฟเวอร์</Label>
              <p className="text-sm text-[color:var(--text)]/60">รีเซ็ตชื่อช่องกรอกตั้งค่า และอัปเดตรายชื่อเซิร์ฟเวอร์</p>
            </div>
          </div>
          
          <div className="flex items-start space-x-3">
            <Checkbox 
              id="resetPrice" 
              checked={resetPrice} 
              onChange={(e) => setResetPrice(e.target.checked)} 
              disabled={pending}
            />
            <div className="grid gap-1.5 leading-none">
              <Label htmlFor="resetPrice" className="font-semibold cursor-pointer text-red-500">ราคาสินค้า / รีเซ็ตกำไร</Label>
              <p className="text-sm text-[color:var(--text)]/60">รีเซ็ตกำไรที่คุณตั้งบวกเอาไว้เป็น 0 ทั้งหมด</p>
            </div>
          </div>

          <div className="flex items-start space-x-3">
            <Checkbox 
              id="deleteRemoved" 
              checked={deleteRemoved} 
              onChange={(e) => setDeleteRemoved(e.target.checked)} 
              disabled={pending}
            />
            <div className="grid gap-1.5 leading-none">
              <Label htmlFor="deleteRemoved" className="font-semibold cursor-pointer text-red-500">ลบแพ็กเกจที่ไม่มีขายแล้ว</Label>
              <p className="text-sm text-[color:var(--text)]/60">ถ้าผู้ให้บริการเอาแพ็กเกจไหนออก ระบบจะลบออกด้วย</p>
            </div>
          </div>
          
          <div className="text-xs text-[color:var(--text)]/50 border-t border-white/10 pt-4 mt-2">
            หมายเหตุ: รูปภาพ วิดีโอ ตัวเลือกเสริม หรือสถานะการแสดงผลต่างๆ จะถูกเก็บไว้เหมือนเดิมไม่โดนลบ
          </div>
        </div>
        
        <DialogFooter className="flex-col sm:flex-row gap-2">
          {pending && <Progress value={progress} className="w-full sm:w-40 mt-1" />}
          <Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={pending}>
            ยกเลิก
          </Button>
          <Button type="button" onClick={handleSync} disabled={pending}>
            {pending ? (<><Spinner className="mr-2 h-4 w-4" /> กำลังซิงก์...</>) : 'เริ่มซิงก์ข้อมูล'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
