'use client';

import { useEffect, useState } from 'react';
import { Spinner } from '@/components/ui/spinner';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/components/ui/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogClose } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Edit, Trash2, Save, X, Plus, Lock, Coins } from 'lucide-react';

interface User {
  id: string;
  username: string | null;
  points: number;
  created_at: string;
  is_admin: boolean;
  is_active: boolean;
}

export default function UsersContent() {
  const toast = useToast();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [editForm, setEditForm] = useState<Partial<User & { newPassword: string; topupPoints: number; topupNote: string }>>({});
  const [saving, setSaving] = useState(false);
  const [deleteDialog, setDeleteDialog] = useState<{ open: boolean; userId: string | null }>({ open: false, userId: null });
  const [showPasswordDialog, setShowPasswordDialog] = useState(false);
  const [showTopupDialog, setShowTopupDialog] = useState(false);
  const [topupSaving, setTopupSaving] = useState(false);

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      const res = await fetch('/api/admin/users');
      if (!res.ok) throw new Error('ไม่สามารถโหลดข้อมูลได้');
      const json = await res.json();
      setUsers(json.data || []);
    } catch (err) {
      toast.show({
        title: 'เกิดข้อผิดพลาด',
        description: (err as Error).message,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (user: User) => {
    setEditingUser(user);
    setEditForm({
      username: user.username || '',
      points: user.points,
      is_admin: user.is_admin,
      is_active: user.is_active,
      newPassword: '',
      topupPoints: 0,
      topupNote: '',
    });
  };

  const handleCloseModal = () => {
    setEditingUser(null);
    setEditForm({});
    setShowPasswordDialog(false);
    setShowTopupDialog(false);
  };

  const handleSave = async () => {
    if (!editingUser) return;
    
    setSaving(true);
    try {
      const updateData: any = {
        username: editForm.username?.trim() || null,
        points: Math.max(0, editForm.points || 0),
        is_admin: editForm.is_admin ?? false,
        is_active: editForm.is_active ?? true,
      };

      const res = await fetch(`/api/admin/users/${editingUser.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updateData),
      });

      if (!res.ok) {
        const json = await res.json();
        const errorMsg = json.message || json.error || json.details?.[0]?.message || 'บันทึกไม่สำเร็จ';
        throw new Error(errorMsg);
      }

      toast.show({ title: 'สำเร็จ', description: 'บันทึกข้อมูลเรียบร้อย' });
      await fetchUsers();
      handleCloseModal();
    } catch (err) {
      toast.show({
        title: 'เกิดข้อผิดพลาด',
        description: (err as Error).message,
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  const handleResetPassword = async () => {
    if (!editingUser) return;
    
    if (!editForm.newPassword || editForm.newPassword.length < 6) {
      toast.show({
        title: 'เกิดข้อผิดพลาด',
        description: 'รหัสผ่านต้องมีอย่างน้อย 6 ตัวอักษร',
        variant: 'destructive',
      });
      return;
    }

    setSaving(true);
    try {
      const res = await fetch(`/api/admin/users/${editingUser.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          reset_password: true,
          new_password: editForm.newPassword,
        }),
      });

      if (!res.ok) {
        const json = await res.json();
        throw new Error(json.message || json.error || 'รีเซ็ตรหัสผ่านไม่สำเร็จ');
      }

      toast.show({ title: 'สำเร็จ', description: 'รีเซ็ตรหัสผ่านเรียบร้อย' });
      setEditForm({ ...editForm, newPassword: '' });
      setShowPasswordDialog(false);
    } catch (err) {
      toast.show({
        title: 'เกิดข้อผิดพลาด',
        description: (err as Error).message,
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  const handleTopup = async () => {
    if (!editingUser) return;
    
    if (!editForm.topupPoints || editForm.topupPoints <= 0) {
      toast.show({
        title: 'เกิดข้อผิดพลาด',
        description: 'กรุณากรอกจำนวนพอยต์ที่ถูกต้อง',
        variant: 'destructive',
      });
      return;
    }

    setTopupSaving(true);
    try {
      const res = await fetch(`/api/admin/users/${editingUser.id}/topup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          points: editForm.topupPoints,
          note: editForm.topupNote || null,
        }),
      });

      if (!res.ok) {
        const json = await res.json();
        throw new Error(json.message || json.error || 'เพิ่มพอยต์ไม่สำเร็จ');
      }

      const json = await res.json();
      toast.show({ 
        title: 'สำเร็จ', 
        description: `เพิ่มพอยต์สำเร็จ (พอยต์ใหม่: ${json.newPoints?.toFixed(2) || '0.00'})` 
      });
      await fetchUsers();
      // อัปเดต points ใน form
      setEditForm({ ...editForm, points: json.newPoints || editingUser.points, topupPoints: 0, topupNote: '' });
      setShowTopupDialog(false);
    } catch (err) {
      toast.show({
        title: 'เกิดข้อผิดพลาด',
        description: (err as Error).message,
        variant: 'destructive',
      });
    } finally {
      setTopupSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteDialog.userId) return;

    setSaving(true);
    try {
      const res = await fetch(`/api/admin/users/${deleteDialog.userId}`, {
        method: 'DELETE',
      });

      if (!res.ok) {
        const json = await res.json();
        throw new Error(json.message || json.error || 'ลบไม่สำเร็จ');
      }

      toast.show({ title: 'สำเร็จ', description: 'ลบผู้ใช้เรียบร้อย' });
      setDeleteDialog({ open: false, userId: null });
      await fetchUsers();
    } catch (err) {
      toast.show({
        title: 'เกิดข้อผิดพลาด',
        description: (err as Error).message,
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-32" />
        <div className="card p-4 overflow-x-auto">
          <div className="w-full space-y-2">
            <div className="grid grid-cols-6 gap-2 pb-2 border-b border-border">
              {Array.from({ length: 6 }).map((_, i) => (
                <Skeleton key={i} className="h-6 w-full" />
              ))}
            </div>
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="grid grid-cols-6 gap-2 py-2 border-b border-border/50">
                {Array.from({ length: 6 }).map((_, j) => (
                  <Skeleton key={j} className="h-6 w-full" />
                ))}
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-white">จัดการผู้ใช้</h2>
      </div>

      <div className="rounded-xl border border-gray-800 bg-[#0a0a0a] shadow-sm p-4 overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-800 bg-gray-900/50 text-gray-300">
              <th className="text-left p-3">ชื่อผู้ใช้</th>
              <th className="text-left p-3">พอยต์</th>
              <th className="text-left p-3">สถานะ</th>
              <th className="text-left p-3">บทบาท</th>
              <th className="text-left p-3">วันที่สมัคร</th>
              <th className="text-left p-3">จัดการ</th>
            </tr>
          </thead>
          <tbody>
            {users.length === 0 ? (
              <tr>
                <td colSpan={6} className="text-center p-8 text-gray-400">
                  ยังไม่มีผู้ใช้
                </td>
              </tr>
            ) : (
              users.map((user) => (
                  <tr key={user.id} className="border-b border-gray-800 hover:bg-gray-900/30">
                  <td className="p-3">
                        <span className="text-white">{user.username || '-'}</span>
                  </td>
                  <td className="p-3">
                    <span className="text-white">{Number(user.points || 0).toFixed(2)}</span>
                    </td>
                  <td className="p-3">
                    <Badge
                              variant="outline"
                      className={
                        user.is_active
                          ? 'border-green-600 text-green-400 bg-green-900/30'
                          : 'border-red-600 text-red-400 bg-red-900/30'
                      }
                    >
                      {user.is_active ? 'ใช้งาน' : 'ปิดใช้งาน'}
                    </Badge>
                    </td>
                  <td className="p-3">
                        <Badge
                          variant="outline"
                          className={
                            user.is_admin
                              ? 'border-purple-600 text-purple-400 bg-purple-900/30'
                              : 'border-gray-700 text-gray-300 bg-gray-800'
                          }
                        >
                          {user.is_admin ? 'Admin' : 'User'}
                        </Badge>
                    </td>
                  <td className="p-3 text-gray-400">
                      {new Date(user.created_at).toLocaleDateString('th-TH')}
                    </td>
                  <td className="p-3">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleEdit(user)}
                            className="border-gray-700 text-gray-300 hover:bg-gray-800"
                          >
                      <Edit className="size-3 mr-1" />
                      แก้ไข
                          </Button>
                    </td>
                  </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Edit User Modal */}
      <Dialog open={editingUser !== null} onOpenChange={(open) => !open && handleCloseModal()}>
        <DialogContent className="max-w-2xl w-[95vw] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>แก้ไขผู้ใช้: {editingUser?.username || '-'}</DialogTitle>
            <DialogDescription>แก้ไขข้อมูลผู้ใช้และจัดการสิทธิ์</DialogDescription>
          </DialogHeader>

          {editingUser && (
            <div className="space-y-4 py-4">
              {/* Username */}
              <div className="space-y-2">
                <Label htmlFor="edit-username">ชื่อผู้ใช้</Label>
                <Input
                  id="edit-username"
                  value={editForm.username ?? ''}
                  onChange={(e) => setEditForm({ ...editForm, username: e.target.value })}
                  placeholder="ชื่อผู้ใช้"
                  className="bg-[#1a1a1a] border-gray-700 text-white"
                />
              </div>

              {/* Points */}
              <div className="space-y-2">
                <Label htmlFor="edit-points">พอยต์</Label>
                <Input
                  id="edit-points"
                  type="number"
                  step="0.01"
                  value={editForm.points ?? 0}
                  onChange={(e) => setEditForm({ ...editForm, points: parseFloat(e.target.value) || 0 })}
                  className="bg-[#1a1a1a] border-gray-700 text-white"
                />
              </div>

              {/* Status & Role */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="edit-is-active">สถานะ</Label>
                  <div className="flex items-center gap-2">
                    <Switch
                      id="edit-is-active"
                      checked={editForm.is_active ?? true}
                      onCheckedChange={(checked) => setEditForm({ ...editForm, is_active: checked })}
                    />
                    <span className="text-sm text-gray-300">
                      {editForm.is_active ? 'ใช้งาน' : 'ปิดใช้งาน'}
                    </span>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="edit-is-admin">บทบาท</Label>
                  <div className="flex items-center gap-2">
                    <Switch
                      id="edit-is-admin"
                      checked={editForm.is_admin ?? false}
                      onCheckedChange={(checked) => setEditForm({ ...editForm, is_admin: checked })}
                    />
                    <span className="text-sm text-gray-300">
                      {editForm.is_admin ? 'Admin' : 'User'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-2 pt-4 border-t border-gray-800">
                <Button
                  variant="outline"
                  onClick={() => setShowPasswordDialog(true)}
                  className="flex-1 border-gray-700 text-gray-300 hover:bg-gray-800"
                >
                  <Lock className="size-4 mr-2" />
                  รีเซ็ตรหัสผ่าน
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setShowTopupDialog(true)}
                  className="flex-1 border-gray-700 text-gray-300 hover:bg-gray-800"
                >
                  <Coins className="size-4 mr-2" />
                  เพิ่มยอดเติมเงิน
                </Button>
              </div>
            </div>
          )}

          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline" className="border-gray-700 text-gray-300">
                <X className="size-4 mr-2" />
                ยกเลิก
              </Button>
            </DialogClose>
            <Button
              onClick={handleSave}
              disabled={saving}
              className="bg-emerald-600 hover:bg-emerald-700 text-white"
            >
              {saving ? (
                <Spinner className="size-4 mr-2" />
              ) : (
                <Save className="size-4 mr-2" />
              )}
              บันทึก
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reset Password Dialog */}
      <Dialog open={showPasswordDialog} onOpenChange={setShowPasswordDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>รีเซ็ตรหัสผ่าน</DialogTitle>
            <DialogDescription>กำหนดรหัสผ่านใหม่สำหรับผู้ใช้</DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="new-password">รหัสผ่านใหม่</Label>
              <Input
                id="new-password"
                type="password"
                value={editForm.newPassword || ''}
                onChange={(e) => setEditForm({ ...editForm, newPassword: e.target.value })}
                placeholder="กรุณากรอกรหัสผ่านใหม่ (อย่างน้อย 6 ตัวอักษร)"
                className="bg-[#1a1a1a] border-gray-700 text-white"
              />
              <p className="text-xs text-gray-400">รหัสผ่านต้องมีอย่างน้อย 6 ตัวอักษร</p>
            </div>
          </div>

          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline" className="border-gray-700 text-gray-300">
                ยกเลิก
              </Button>
            </DialogClose>
            <Button
              onClick={handleResetPassword}
              disabled={saving || !editForm.newPassword || editForm.newPassword.length < 6}
              className="bg-emerald-600 hover:bg-emerald-700 text-white"
            >
              {saving ? <Spinner className="size-4 mr-2" /> : <Lock className="size-4 mr-2" />}
              รีเซ็ตรหัสผ่าน
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Topup Dialog */}
      <Dialog open={showTopupDialog} onOpenChange={setShowTopupDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>เพิ่มพอยต์</DialogTitle>
            <DialogDescription>เพิ่มพอยต์ให้ผู้ใช้ (จะบันทึกประวัติการเติมเงินอัตโนมัติ)</DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="p-3 rounded-lg bg-blue-900/20 border border-blue-800/50">
              <p className="text-xs text-blue-200/80">
                💡 การเพิ่มพอยต์จะบันทึกประวัติการเติมเงินอัตโนมัติ (ประเภท: Admin)
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="topup-points">จำนวนพอยต์</Label>
              <Input
                id="topup-points"
                type="number"
                step="0.01"
                min="0"
                value={editForm.topupPoints || 0}
                onChange={(e) => setEditForm({ ...editForm, topupPoints: parseFloat(e.target.value) || 0 })}
                placeholder="0.00"
                className="bg-[#1a1a1a] border-gray-700 text-white"
              />
              <p className="text-xs text-gray-400">จำนวนพอยต์ที่จะเพิ่มให้ผู้ใช้ (จะบันทึกประวัติการเติมเงินอัตโนมัติ)</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="topup-note">หมายเหตุ (ไม่บังคับ)</Label>
              <Textarea
                id="topup-note"
                value={editForm.topupNote || ''}
                onChange={(e) => setEditForm({ ...editForm, topupNote: e.target.value })}
                placeholder="หมายเหตุเพิ่มเติม..."
                rows={3}
                className="bg-[#1a1a1a] border-gray-700 text-white"
              />
            </div>
          </div>

          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline" className="border-gray-700 text-gray-300">
                ยกเลิก
              </Button>
            </DialogClose>
            <Button
              onClick={handleTopup}
              disabled={topupSaving || !editForm.topupPoints || editForm.topupPoints <= 0}
              className="bg-emerald-600 hover:bg-emerald-700 text-white"
            >
              {topupSaving ? <Spinner className="size-4 mr-2" /> : <Coins className="size-4 mr-2" />}
              เพิ่มพอยต์
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog
        open={deleteDialog.open}
        onOpenChange={(open) => {
          if (!open) {
            setDeleteDialog({ open: false, userId: null });
          }
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>ยืนยันการลบผู้ใช้</AlertDialogTitle>
            <AlertDialogDescription>
              คุณต้องการลบผู้ใช้นี้หรือไม่? การกระทำนี้ไม่สามารถยกเลิกได้
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>ยกเลิก</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                handleDelete();
              }}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              ลบ
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
