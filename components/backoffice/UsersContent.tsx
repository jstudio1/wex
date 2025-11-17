'use client';

import { useEffect, useState } from 'react';
import { Spinner } from '@/components/ui/spinner';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/components/ui/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Edit, Trash2, Save, X, Plus, Minus } from 'lucide-react';

interface User {
  id: string;
  username: string | null;
  points: number;
  created_at: string;
  is_admin: boolean;
}

export default function UsersContent() {
  const toast = useToast();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<Partial<User>>({});
  const [saving, setSaving] = useState(false);
  const [deleteDialog, setDeleteDialog] = useState<{ open: boolean; userId: string | null }>({ open: false, userId: null });
  const [pointsAdjust, setPointsAdjust] = useState<{ [key: string]: number }>({});

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
    setEditingId(user.id);
    setEditForm({
      username: user.username || '',
      points: user.points,
      is_admin: user.is_admin,
    });
    setPointsAdjust({});
  };

  const handleCancel = () => {
    setEditingId(null);
    setEditForm({});
    setPointsAdjust({});
  };

  const handleSave = async (userId: string) => {
    setSaving(true);
    try {
      const formData = editForm;
      const currentUser = users.find((u) => u.id === userId);
      
      // คำนวณ points ใหม่ถ้ามีการปรับ
      let finalPoints = formData.points;
      if (pointsAdjust[userId] !== undefined) {
        finalPoints = (currentUser?.points || 0) + pointsAdjust[userId];
      }

      const updateData: any = {
        username: formData.username || null,
        points: Math.max(0, finalPoints || 0),
        is_admin: formData.is_admin ?? false,
      };

      const res = await fetch(`/api/admin/users/${userId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updateData),
      });

      if (!res.ok) {
        const json = await res.json();
        throw new Error(json.error || 'บันทึกไม่สำเร็จ');
      }

      toast.show({ title: 'สำเร็จ', description: 'บันทึกข้อมูลเรียบร้อย' });
      await fetchUsers();
      setEditingId(null);
      setEditForm({});
      setPointsAdjust({});
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

  const handleDelete = async () => {
    if (!deleteDialog.userId) return;

    setSaving(true);
    try {
      const res = await fetch(`/api/admin/users/${deleteDialog.userId}`, {
        method: 'DELETE',
      });

      if (!res.ok) {
        const json = await res.json();
        throw new Error(json.error || 'ลบไม่สำเร็จ');
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

  const handleResetPassword = async (userId: string) => {
    if (!confirm('ต้องการรีเซ็ตรหัสผ่านเป็น "123456" ใช่หรือไม่?')) return;

    setSaving(true);
    try {
      const res = await fetch(`/api/admin/users/${userId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reset_password: true }),
      });

      if (!res.ok) {
        const json = await res.json();
        throw new Error(json.error || 'รีเซ็ตรหัสผ่านไม่สำเร็จ');
      }

      toast.show({ title: 'สำเร็จ', description: 'รีเซ็ตรหัสผ่านเป็น "123456" เรียบร้อย' });
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

  const handlePointsAdjust = (userId: string, delta: number) => {
    setPointsAdjust((prev) => {
      const current = prev[userId] || 0;
      return { ...prev, [userId]: current + delta };
    });
  };

  const getFinalPoints = (user: User) => {
    if (editingId !== user.id) return user.points;
    const adjust = pointsAdjust[user.id] || 0;
    return (editForm.points || user.points) + adjust;
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-32" />
        <div className="card p-4 overflow-x-auto">
          <div className="w-full space-y-2">
            <div className="grid grid-cols-5 gap-2 pb-2 border-b border-gray-700/50">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-6 w-full" />
              ))}
            </div>
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="grid grid-cols-5 gap-2 py-2 border-b border-gray-700/30">
                {Array.from({ length: 5 }).map((_, j) => (
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
        <h2 className="text-xl font-semibold">จัดการผู้ใช้</h2>
      </div>

      <div className="card p-4 overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-700/50">
              <th className="text-left p-2">ชื่อผู้ใช้</th>
              <th className="text-left p-2">พอยต์</th>
              <th className="text-left p-2">สิทธิ์</th>
              <th className="text-left p-2">วันที่สมัคร</th>
              <th className="text-left p-2">จัดการ</th>
            </tr>
          </thead>
          <tbody>
            {users.length === 0 ? (
              <tr>
                <td colSpan={5} className="text-center p-8 text-[color:var(--text)]/60">
                  ยังไม่มีผู้ใช้
                </td>
              </tr>
            ) : (
              users.map((user) => {
                const isEditing = editingId === user.id;
                const finalPoints = getFinalPoints(user);
                
                return (
                  <tr key={user.id} className="border-b border-gray-700/30 hover:bg-white/5">
                    <td className="p-2">
                      {isEditing ? (
                        <Input
                          value={editForm.username || ''}
                          onChange={(e) => setEditForm({ ...editForm, username: e.target.value })}
                          placeholder="ชื่อผู้ใช้"
                          className="w-40"
                        />
                      ) : (
                        user.username || '-'
                      )}
                    </td>
                    <td className="p-2">
                      {isEditing ? (
                        <div className="flex items-center gap-2">
                          <Input
                            type="number"
                            step="0.01"
                            value={editForm.points || 0}
                            onChange={(e) => setEditForm({ ...editForm, points: parseFloat(e.target.value) || 0 })}
                            className="w-24"
                          />
                          <div className="flex items-center gap-1">
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => handlePointsAdjust(user.id, -10)}
                              className="h-6 w-6 p-0"
                            >
                              <Minus className="size-3" />
                            </Button>
                            <span className="text-xs text-[color:var(--text)]/60 min-w-[40px] text-center">
                              {pointsAdjust[user.id] ? `${pointsAdjust[user.id] >= 0 ? '+' : ''}${pointsAdjust[user.id]}` : '±0'}
                            </span>
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => handlePointsAdjust(user.id, 10)}
                              className="h-6 w-6 p-0"
                            >
                              <Plus className="size-3" />
                            </Button>
                          </div>
                          <div className="text-xs text-[color:var(--text)]/50">
                            = {finalPoints.toFixed(2)}
                          </div>
                        </div>
                      ) : (
                        Number(user.points || 0).toFixed(2)
                      )}
                    </td>
                    <td className="p-2">
                      {isEditing ? (
                        <div className="flex items-center gap-2">
                          <Switch
                            checked={editForm.is_admin ?? false}
                            onCheckedChange={(checked) => setEditForm({ ...editForm, is_admin: checked })}
                          />
                          <Label className="text-xs">{editForm.is_admin ? 'Admin' : 'User'}</Label>
                        </div>
                      ) : (
                        <span
                          className={`px-2 py-1 rounded text-xs ${
                            user.is_admin ? 'bg-purple-500/20 text-purple-300' : 'bg-white/10 text-[color:var(--text)]/70'
                          }`}
                        >
                          {user.is_admin ? 'Admin' : 'User'}
                        </span>
                      )}
                    </td>
                    <td className="p-2 text-[color:var(--text)]/70">
                      {new Date(user.created_at).toLocaleDateString('th-TH')}
                    </td>
                    <td className="p-2">
                      {isEditing ? (
                        <div className="flex items-center gap-2">
                          <Button
                            size="sm"
                            onClick={() => handleSave(user.id)}
                            disabled={saving}
                          >
                            {saving ? (
                              <Spinner className="size-3" />
                            ) : (
                              <>
                                <Save className="size-3 mr-1" />
                                บันทึก
                              </>
                            )}
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={handleCancel}
                            disabled={saving}
                          >
                            <X className="size-3" />
                          </Button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleEdit(user)}
                          >
                            <Edit className="size-3" />
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleResetPassword(user.id)}
                            disabled={saving}
                          >
                            รีเซ็ตรหัส
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => setDeleteDialog({ open: true, userId: user.id })}
                          >
                            <Trash2 className="size-3" />
                          </Button>
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

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
              className="bg-red-600 hover:bg-red-700"
            >
              ลบ
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
