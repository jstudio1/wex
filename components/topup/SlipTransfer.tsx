'use client';

import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Spinner } from '@/components/ui/spinner';
import { useToast } from '@/components/ui/use-toast';
import { QrCode, CheckCircle2, Info, Upload, X } from 'lucide-react';
import jsQR from 'jsqr';

type BankAccount = {
  bankName: string;
  accountName: string;
  accountNumber: string;
  branch?: string;
};

type SlipTransferProps = {
  accounts?: BankAccount[];
};

export default function SlipTransfer({ accounts = [] }: SlipTransferProps) {
  const [selectedBank, setSelectedBank] = useState(0);
  const [slipImage, setSlipImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [verifying, setVerifying] = useState(false);
  const [extractedQrPayload, setExtractedQrPayload] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const toast = useToast();

  useEffect(() => {
    if (accounts.length === 0) {
      setSelectedBank(0);
      return;
    }
    if (selectedBank >= accounts.length) {
      setSelectedBank(0);
    }
  }, [accounts, selectedBank]);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file
    if (file.size > 5 * 1024 * 1024) {
      toast.show({
        title: 'ไฟล์ใหญ่เกินไป',
        description: 'กรุณาอัปโหลดไฟล์ขนาดไม่เกิน 5 MB',
        variant: 'destructive',
      });
      return;
    }

    if (!file.type.startsWith('image/')) {
      toast.show({
        title: 'รูปแบบไฟล์ไม่ถูกต้อง',
        description: 'กรุณาอัปโหลดไฟล์รูปภาพ',
        variant: 'destructive',
      });
      return;
    }

    setSlipImage(file);
    setExtractedQrPayload(null);

    // Create preview
    const reader = new FileReader();
    reader.onloadend = async () => {
      const result = reader.result as string;
      setImagePreview(result);

      // Extract QR code from image
      try {
        await extractQRCodeFromImage(result);
      } catch (error) {
        console.error('Error extracting QR code:', error);
        toast.show({
          title: 'ไม่สามารถอ่าน QR Code ได้',
          description: 'กรุณาตรวจสอบว่าสลิปมี QR Code ชัดเจน',
          variant: 'destructive',
        });
      }
    };
    reader.readAsDataURL(file);
  };

  const extractQRCodeFromImage = async (imageDataUrl: string): Promise<void> => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        // Create canvas to process image
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('Cannot get canvas context'));
          return;
        }

        canvas.width = img.width;
        canvas.height = img.height;
        ctx.drawImage(img, 0, 0);

        // Get image data
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);

        // Try to decode QR code
        const qrCode = jsQR(imageData.data, imageData.width, imageData.height);

        if (qrCode) {
          setExtractedQrPayload(qrCode.data);
          resolve();
        } else {
          reject(new Error('QR code not found in image'));
        }
      };
      img.onerror = () => reject(new Error('Failed to load image'));
      img.src = imageDataUrl;
    });
  };

  const handleRemoveImage = () => {
    setSlipImage(null);
    setImagePreview(null);
    setExtractedQrPayload(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleVerifySlip = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!slipImage) {
      toast.show({
        title: 'กรุณาอัปโหลดสลิป',
        description: 'โปรดอัปโหลดรูปสลิปโอนเงิน',
        variant: 'destructive',
      });
      return;
    }

    if (!extractedQrPayload) {
      toast.show({
        title: 'ไม่พบ QR Code',
        description: 'ไม่สามารถอ่าน QR Code จากสลิปได้ กรุณาตรวจสอบว่าสลิปมี QR Code ชัดเจน',
        variant: 'destructive',
      });
      return;
    }

    setVerifying(true);

    try {
      const res = await fetch('/api/wallet/verify-slip', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ qrPayload: extractedQrPayload }),
      });

      const json = await res.json();

      if (!res.ok || !json.success) {
        throw new Error(json.error || 'ตรวจสอบสลิปไม่สำเร็จ');
      }

      toast.show({
        title: 'เติมเงินสำเร็จ!',
        description: json.data?.message || `ได้รับ ${json.data?.pointsAdded} พ้อยต์`,
      });

      // Reset form
      handleRemoveImage();
      
      // Refresh wallet balance (if needed)
      setTimeout(() => {
        window.location.reload();
      }, 1500);
      
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'เกิดข้อผิดพลาด';
      toast.show({
        title: 'เกิดข้อผิดพลาด',
        description: errorMsg,
        variant: 'destructive',
      });
    } finally {
      setVerifying(false);
    }
  };

  const bank = accounts[selectedBank];

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="p-2 rounded-lg bg-blue-50 border border-blue-200">
          <QrCode className="h-5 w-5 text-blue-600" />
        </div>
        <div>
          <h2 className="text-xl font-semibold text-gray-900">เติมเงินด้วยสลิปโอนเงิน</h2>
          <p className="text-sm text-gray-600">อัปโหลดสลิปและตรวจสอบอัตโนมัติ</p>
        </div>
      </div>

      {/* Bank Account Info */}
      {accounts.length > 0 ? (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 space-y-3">
          <div className="flex items-center justify-between">
            <Label className="text-blue-700 font-semibold">บัญชีรับโอน</Label>
            <select
              value={selectedBank}
              onChange={(e) => setSelectedBank(parseInt(e.target.value, 10))}
              className="bg-white border border-gray-300 rounded px-3 py-1 text-sm text-gray-900 focus:border-blue-500 focus:ring-blue-500"
            >
              {accounts.map((b, idx) => (
                <option key={`${b.bankName}-${idx}`} value={idx}>
                  {b.bankName}
                </option>
              ))}
            </select>
          </div>
          {bank && (
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">ธนาคาร:</span>
                <span className="text-gray-900 font-medium">{bank.bankName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">ชื่อบัญชี:</span>
                <span className="text-gray-900 font-medium">{bank.accountName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">เลขที่บัญชี:</span>
                <span className="text-gray-900 font-mono font-medium">{bank.accountNumber}</span>
              </div>
              {bank.branch && (
                <div className="flex justify-between">
                  <span className="text-gray-600">สาขา:</span>
                  <span className="text-gray-900 font-medium">{bank.branch}</span>
                </div>
              )}
            </div>
          )}
        </div>
      ) : (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 space-y-2 text-sm text-yellow-800">
          <div className="flex items-center gap-2 font-semibold">
            <Info className="h-4 w-4" />
            ยังไม่มีข้อมูลบัญชีธนาคาร
          </div>
          <p>กรุณาติดต่อผู้ดูแลระบบเพื่อให้ตั้งค่าบัญชีรับโอน</p>
        </div>
      )}

      {/* Info Box */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex items-start gap-3">
          <Info className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" />
          <div className="space-y-1 text-sm text-blue-800">
            <p className="font-semibold">วิธีใช้งาน:</p>
            <ol className="list-decimal list-inside space-y-1 text-blue-700">
              <li>โอนเงินเข้าบัญชีธนาคารด้านบน</li>
              <li>เปิดสลิปโอนเงินจากแอปธนาคาร</li>
              <li>อัปโหลดรูปสลิปโอนเงิน (ระบบจะอ่าน QR Code อัตโนมัติ)</li>
              <li>กดปุ่ม "ตรวจสอบสลิปและเติมเงิน"</li>
            </ol>
            <p className="text-xs text-blue-600 mt-2">
              ระบบจะตรวจสอบสลิปอัตโนมัติและเติมเงินทันที (1 บาท = 1 พ้อยต์)
            </p>
          </div>
        </div>
      </div>

      {/* Upload Slip Form */}
      <form onSubmit={handleVerifySlip} className="space-y-4">
        <div>
          <Label htmlFor="slip_image" className="text-gray-700 font-medium">
            อัปโหลดสลิปโอนเงิน
          </Label>
          
          {!imagePreview ? (
            <div className="mt-2">
              <label
                htmlFor="slip_image"
                className="flex flex-col items-center justify-center w-full h-48 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:bg-gray-50 hover:border-blue-300 transition-colors"
              >
                <div className="flex flex-col items-center gap-2 p-4">
                  <Upload className="h-10 w-10 text-gray-400" />
                  <span className="text-sm text-gray-600 font-medium">คลิกเพื่ออัปโหลดสลิป</span>
                  <span className="text-xs text-gray-500">รองรับไฟล์รูปภาพขนาดไม่เกิน 5 MB</span>
                </div>
                <input
                  ref={fileInputRef}
                  id="slip_image"
                  type="file"
                  accept="image/*"
                  onChange={handleFileChange}
                  disabled={verifying}
                  className="hidden"
                />
              </label>
            </div>
          ) : (
            <div className="mt-2 relative">
              <div className="relative border-2 border-gray-300 rounded-lg overflow-hidden">
                <img
                  src={imagePreview}
                  alt="Slip preview"
                  className="w-full h-auto max-h-96 object-contain bg-gray-50"
                />
                <button
                  type="button"
                  onClick={handleRemoveImage}
                  disabled={verifying}
                  className="absolute top-2 right-2 p-2 bg-red-500 text-white rounded-full hover:bg-red-600 transition-colors disabled:opacity-50"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
              
              {extractedQrPayload ? (
                <div className="mt-3 p-3 bg-green-50 border border-green-200 rounded-lg">
                  <div className="flex items-center gap-2 text-green-700">
                    <CheckCircle2 className="h-4 w-4" />
                    <span className="text-sm font-medium">อ่าน QR Code สำเร็จ</span>
                  </div>
                  <p className="text-xs text-green-600 mt-1">
                    พร้อมตรวจสอบสลิปและเติมเงิน
                  </p>
                </div>
              ) : (
                <div className="mt-3 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <div className="flex items-center gap-2 text-yellow-700">
                    <Info className="h-4 w-4" />
                    <span className="text-sm font-medium">ไม่พบ QR Code</span>
                  </div>
                  <p className="text-xs text-yellow-600 mt-1">
                    กรุณาตรวจสอบว่าสลิปมี QR Code ชัดเจน หรือลองอัปโหลดใหม่
                  </p>
                </div>
              )}
            </div>
          )}

          <p className="text-xs text-gray-500 mt-2">
            อัปโหลดรูปสลิปโอนเงินที่มี QR Code ระบบจะอ่านและตรวจสอบอัตโนมัติ
          </p>
        </div>

        <Button
          type="submit"
          disabled={verifying || !slipImage || !extractedQrPayload}
          className="w-full h-12 bg-blue-600 hover:bg-blue-700 text-white text-base font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {verifying ? (
            <span className="inline-flex items-center gap-2">
              <Spinner className="h-5 w-5" />
              กำลังตรวจสอบสลิป...
            </span>
          ) : (
            <span className="inline-flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5" />
              ตรวจสอบสลิปและเติมเงิน
            </span>
          )}
        </Button>
      </form>
    </div>
  );
}

