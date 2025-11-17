'use client';

import { useEffect, useState } from 'react';
import { Spinner } from '@/components/ui/spinner';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/components/ui/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Edit, Trash2, Save, X, Plus, Minus } from 'lucide-react';

interface Permission {
  id: number;
  name: string;
}

interface User {
  id: string;
  username: string | null;
  points: number;
  created_at: string;
  is_admin: boolean;
  permission_id: number | null;
  permission?: Permission | null;
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
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [permissionsLoading, setPermissionsLoading] = useState(true);

  useEffect(() => {
    fetchUsers();
    fetchPermissions();
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

  const fetchPermissions = async () => {
    try {
      const res = await fetch('/api/admin/permissions');
      if (!res.ok) throw new Error('ไม่สามารถโหลดข้อมูลสิทธิ์ได้');
      const json = await res.json();
      setPermissions(json.data || []);
    } catch (err) {
      toast.show({
        title: 'เกิดข้อผิดพลาด',
        description: (err as Error).message,
        variant: 'destructive',
      });
    } finally {
      setPermissionsLoading(false);
    }
  };

  const handleEdit = (user: User) => {
    setEditingId(user.id);
    setEditForm({
      username: user.username || '',
      points: user.points,
      is_admin: user.is_admin,
      permission_id: user.permission_id ?? null,
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

      // แปลง permission_id ให้เป็น number หรือ null
      let permissionId: number | null = null;
      if (formData.permission_id !== undefined && formData.permission_id !== null) {
        if (typeof formData.permission_id === 'string') {
          if (formData.permission_id !== '') {
            const parsed = parseInt(formData.permission_id, 10);
            permissionId = !isNaN(parsed) && parsed > 0 ? parsed : null;
          }
        } else {
          permissionId = formData.permission_id > 0 ? formData.permission_id : null;
        }
      } else if (currentUser?.permission_id) {
        permissionId = currentUser.permission_id;
      }

      const updateData: any = {
        username: formData.username || null,
        points: Math.max(0, finalPoints || 0),
        is_admin: formData.is_admin ?? false,
        permission_id: permissionId,
      };

      const res = await fetch(`/api/admin/users/${userId}`, {
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
    return (editForm.points ?? user.points) + adjust;
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-32" />
        <div className="card p-4 overflow-x-auto">
          <div className="w-full space-y-2">
            <div className="grid grid-cols-5 gap-2 pb-2 border-b border-border">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-6 w-full" />
              ))}
            </div>
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="grid grid-cols-5 gap-2 py-2 border-b border-border/50">
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
        <h2 className="text-2xl font-bold text-white">จัดการผู้ใช้</h2>
      </div>

      <div className="rounded-xl border border-gray-800 bg-[#0a0a0a] shadow-sm p-4 overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-800 bg-gray-900/50 text-gray-300">
              <th className="text-left p-3">ชื่อผู้ใช้</th>
              <th className="text-left p-3">พอยต์</th>
              <th className="text-left p-3">บทบาท</th>
              <th className="text-left p-3">สิทธิ์ส่วนลด</th>
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
              users.map((user) => {
                const isEditing = editingId === user.id;
                const finalPoints = getFinalPoints(user);
                
                const currentPermissionId =
                  editForm.permission_id !== undefined && isEditing
                    ? editForm.permission_id
                    : user.permission_id;
                
                return (
                  <tr key={user.id} className="border-b border-gray-800 hover:bg-gray-900/30">
                    <td className="p-3 align-top">
                      {isEditing ? (
                        <Input
                          value={editForm.username ?? ''}
                          onChange={(e) => setEditForm({ ...editForm, username: e.target.value })}
                          placeholder="ชื่อผู้ใช้"
                          className="w-40 border-gray-700 bg-[#1a1a1a] text-white placeholder:text-gray-500"
                        />
                      ) : (
                        <span className="text-white">{user.username || '-'}</span>
                      )}
                    </td>
                    <td className="p-3 align-top">
                      {isEditing ? (
                        <div className="flex items-center gap-3">
                          <Input
                            type="number"
                            step="0.01"
                            value={editForm.points ?? user.points}
                            onChange={(e) => setEditForm({ ...editForm, points: parseFloat(e.target.value) || 0 })}
                            className="w-24 border-gray-700 bg-[#1a1a1a] text-white"
                          />
                          <div className="flex items-center gap-1">
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => handlePointsAdjust(user.id, -10)}
                              className="h-6 w-6 p-0 border-gray-700 hover:bg-gray-800 text-gray-300"
                            >
                              <Minus className="size-3" />
                            </Button>
                            <span className="text-xs text-gray-400 min-w-[40px] text-center">
                              {pointsAdjust[user.id] ? `${pointsAdjust[user.id] >= 0 ? '+' : ''}${pointsAdjust[user.id]}` : '±0'}
                            </span>
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => handlePointsAdjust(user.id, 10)}
                              className="h-6 w-6 p-0 border-gray-700 hover:bg-gray-800 text-gray-300"
                            >
                              <Plus className="size-3" />
                            </Button>
                          </div>
                          <div className="text-xs text-gray-400">
                            = {finalPoints.toFixed(2)}
                          </div>
                        </div>
                      ) : (
                        <span className="text-white">{Number(user.points || 0).toFixed(2)}</span>
                      )}
                    </td>
                    <td className="p-3 align-top">
                      {isEditing ? (
                        <div className="flex items-center gap-2">
                          <Switch
                            checked={editForm.is_admin ?? false}
                            onCheckedChange={(checked) => setEditForm({ ...editForm, is_admin: checked })}
                          />
                          <span className="text-xs text-gray-300">{editForm.is_admin ? 'Admin' : 'User'}</span>
                        </div>
                      ) : (
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
                      )}
                    </td>
                    <td className="p-3 align-top">
                      {isEditing ? (
                        <select
                          value={currentPermissionId === null || currentPermissionId === undefined ? '' : String(currentPermissionId)}
                          onChange={(e) =>
                            setEditForm({
                              ...editForm,
                              permission_id: e.target.value ? Number(e.target.value) : null,
                            })
                          }
                          disabled={permissionsLoading}
                          className="w-48 rounded-md border border-gray-700 bg-[#1a1a1a] px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-red-600/50"
                        >
                          <option value="">ไม่มีสิทธิ์</option>
                          {permissions.map((permission) => (
                            <option key={permission.id} value={permission.id}>
                              {permission.name}
                            </option>
                          ))}
                        </select>
                      ) : user.permission ? (
                        <Badge variant="outline" className="border-red-600 text-red-400 bg-red-900/30">
                          {user.permission.name}
                        </Badge>
                      ) : (
                        <span className="text-xs text-gray-500">ไม่มีสิทธิ์</span>
                      )}
                    </td>
                    <td className="p-3 align-top text-gray-400">
                      {new Date(user.created_at).toLocaleDateString('th-TH')}
                    </td>
                    <td className="p-3 align-top">
                      {isEditing ? (
                        <div className="flex items-center gap-2">
                          <Button
                            size="sm"
                            onClick={() => handleSave(user.id)}
                            disabled={saving}
                            className="bg-red-600 hover:bg-red-700 text-white"
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
                            className="border-gray-700 text-gray-300 hover:bg-gray-800"
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
                            className="border-gray-700 text-gray-300 hover:bg-gray-800"
                          >
                            <Edit className="size-3" />
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleResetPassword(user.id)}
                            disabled={saving}
                            className="border-gray-700 text-gray-300 hover:bg-gray-800"
                          >
                            รีเซ็ตรหัส
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => setDeleteDialog({ open: true, userId: user.id })}
                            className="border-red-800 text-red-400 hover:bg-red-900/30"
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
