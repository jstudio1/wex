'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/components/ui/use-toast';
import { Plus, Edit, Trash2, Save, X, Eye, EyeOff } from 'lucide-react';
import { cn } from '@/lib/utils';

type OTPApp = {
  id?: number;
  app_id: string;
  name: string;
  name_thai: string;
  description?: string | null;
  icon_url?: string | null;
  image_url?: string | null;
  color?: string | null;
  is_published: boolean;
  display_order: number;
};

type Props = {
  initialApps: OTPApp[];
  onAppsChange?: (apps: OTPApp[]) => void;
};

export default function OTPAppsManager({ initialApps, onAppsChange }: Props) {
  const toast = useToast();
  const [apps, setApps] = useState<OTPApp[]>(initialApps);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [formData, setFormData] = useState<Partial<OTPApp>>({
    app_id: '',
    name: '',
    name_thai: '',
    description: '',
    icon_url: '',
    image_url: '',
    color: '',
    is_published: true,
    display_order: 0,
  });

  const handleEdit = (app: OTPApp) => {
    setEditingId(app.id!);
    setFormData({
      app_id: app.app_id,
      name: app.name,
      name_thai: app.name_thai,
      description: app.description || '',
      icon_url: app.icon_url || '',
      image_url: app.image_url || '',
      color: app.color || '',
      is_published: app.is_published,
      display_order: app.display_order,
    });
  };

  const handleCancel = () => {
    setEditingId(null);
    setIsCreating(false);
    setFormData({
      app_id: '',
      name: '',
      name_thai: '',
      description: '',
      icon_url: '',
      image_url: '',
      color: '',
      is_published: true,
      display_order: 0,
    });
  };

  const handleSave = async () => {
    try {
      if (editingId) {
        // Update
        const res = await fetch(`/api/admin/otp-apps/${editingId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(formData),
        });

        if (!res.ok) {
          const error = await res.json();
          throw new Error(error.error || 'ไม่สามารถอัปเดตได้');
        }

        const { data } = await res.json();
        const updatedApps = apps.map(app => app.id === editingId ? data : app);
        setApps(updatedApps);
        onAppsChange?.(updatedApps);
        toast.show({
          title: 'Updated',
          description: 'App updated successfully',
        });
      } else {
        // Create
        const res = await fetch('/api/admin/otp-apps', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(formData),
        });

        if (!res.ok) {
          const error = await res.json();
          throw new Error(error.error || 'ไม่สามารถสร้างได้');
        }

        const { data } = await res.json();
        const updatedApps = [...apps, data];
        setApps(updatedApps);
        onAppsChange?.(updatedApps);
        toast.show({
          title: 'Created',
          description: 'App created successfully',
        });
      }

      handleCancel();
    } catch (error) {
      toast.show({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to save',
        variant: 'destructive',
      });
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Are you sure you want to delete this app?')) return;

    try {
      const res = await fetch(`/api/admin/otp-apps/${id}`, {
        method: 'DELETE',
      });

      if (!res.ok) {
        throw new Error('Failed to delete');
      }

      const updatedApps = apps.filter(app => app.id !== id);
      setApps(updatedApps);
      onAppsChange?.(updatedApps);
      toast.show({
        title: 'Deleted',
        description: 'App deleted successfully',
      });
    } catch (error) {
      toast.show({
        title: 'Error',
        description: 'Failed to delete',
        variant: 'destructive',
      });
    }
  };

  const handleTogglePublish = async (app: OTPApp) => {
    try {
      const res = await fetch(`/api/admin/otp-apps/${app.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_published: !app.is_published }),
      });

      if (!res.ok) {
        throw new Error('Failed to update');
      }

      const { data } = await res.json();
      const updatedApps = apps.map(a => a.id === app.id ? data : a);
      setApps(updatedApps);
      onAppsChange?.(updatedApps);
    } catch (error) {
      toast.show({
        title: 'Error',
        description: 'Failed to update',
        variant: 'destructive',
      });
    }
  };

  return (
    <div className="space-y-6">
      {/* Create Form */}
      {isCreating && (
        <Card className="bg-black/30 border-white/10">
          <CardHeader>
            <CardTitle>Add New App</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>App ID *</Label>
                <Input
                  value={formData.app_id}
                  onChange={(e) => setFormData({ ...formData, app_id: e.target.value })}
                  placeholder="เช่น netflix"
                />
              </div>
              <div className="space-y-2">
                <Label>English Name *</Label>
                <Input
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g. NETFLIX"
                />
              </div>
              <div className="space-y-2">
                <Label>Thai Name *</Label>
                <Input
                  value={formData.name_thai}
                  onChange={(e) => setFormData({ ...formData, name_thai: e.target.value })}
                  placeholder="e.g. เน็ตฟลิกซ์"
                />
              </div>
              <div className="space-y-2">
                <Label>Display Order</Label>
                <Input
                  type="number"
                  value={formData.display_order}
                  onChange={(e) => setFormData({ ...formData, display_order: parseInt(e.target.value) || 0 })}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <Input
                value={formData.description || ''}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="e.g. Verification for TV access"
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Icon URL</Label>
                <Input
                  value={formData.icon_url || ''}
                  onChange={(e) => setFormData({ ...formData, icon_url: e.target.value })}
                  placeholder="Icon image URL"
                />
              </div>
              <div className="space-y-2">
                <Label>Image URL</Label>
                <Input
                  value={formData.image_url || ''}
                  onChange={(e) => setFormData({ ...formData, image_url: e.target.value })}
                  placeholder="Image URL"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Color (Tailwind gradient)</Label>
              <Input
                value={formData.color || ''}
                onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                placeholder="e.g. from-red-600 to-red-800"
              />
            </div>
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="is_published"
                checked={formData.is_published}
                onChange={(e) => setFormData({ ...formData, is_published: e.target.checked })}
                className="w-4 h-4"
              />
              <Label htmlFor="is_published">Published</Label>
            </div>
            <div className="flex gap-2">
              <Button onClick={handleSave}>
                <Save className="h-4 w-4 mr-2" />
                Save
              </Button>
              <Button variant="outline" onClick={handleCancel}>
                <X className="h-4 w-4 mr-2" />
                Cancel
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Add Button */}
      {!isCreating && (
        <Button onClick={() => setIsCreating(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Add New App
        </Button>
      )}

      {/* Apps List */}
      <div className="grid gap-4 lg:grid-cols-2">
        {apps.map((app) => (
          <Card
            key={app.id}
            className={cn(
              'bg-black/30 border-white/10',
              editingId === app.id && 'border-emerald-500/50 lg:col-span-2'
            )}
          >
            <CardContent className="p-4 pt-4 sm:p-5 sm:pt-5">
              {editingId === app.id ? (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>App ID *</Label>
                      <Input
                        value={formData.app_id}
                        onChange={(e) => setFormData({ ...formData, app_id: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>English Name *</Label>
                      <Input
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Thai Name *</Label>
                      <Input
                        value={formData.name_thai}
                        onChange={(e) => setFormData({ ...formData, name_thai: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Display Order</Label>
                      <Input
                        type="number"
                        value={formData.display_order}
                        onChange={(e) => setFormData({ ...formData, display_order: parseInt(e.target.value) || 0 })}
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Description</Label>
                    <Input
                      value={formData.description || ''}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    />
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Icon URL</Label>
                      <Input
                        value={formData.icon_url || ''}
                        onChange={(e) => setFormData({ ...formData, icon_url: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Image URL</Label>
                      <Input
                        value={formData.image_url || ''}
                        onChange={(e) => setFormData({ ...formData, image_url: e.target.value })}
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Color (Tailwind gradient)</Label>
                    <Input
                      value={formData.color || ''}
                      onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id={`is_published_${app.id}`}
                      checked={formData.is_published}
                      onChange={(e) => setFormData({ ...formData, is_published: e.target.checked })}
                      className="w-4 h-4"
                    />
                    <Label htmlFor={`is_published_${app.id}`}>Published</Label>
                  </div>
                  <div className="flex gap-2">
                    <Button onClick={handleSave}>
                      <Save className="h-4 w-4 mr-2" />
                      Save
                    </Button>
                    <Button variant="outline" onClick={handleCancel}>
                      <X className="h-4 w-4 mr-2" />
                      Cancel
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col gap-4 pt-1 sm:flex-row sm:items-start sm:justify-between">
                  <div className="flex min-w-0 flex-1 items-start gap-3">
                    <div
                      className={cn(
                        'flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-xl text-sm font-bold text-white shadow-md',
                        app.color ? `bg-gradient-to-br ${app.color}` : 'bg-gray-700'
                      )}
                    >
                      {app.icon_url ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={app.icon_url} alt={app.name} className="h-7 w-7 object-contain" />
                      ) : (
                        app.name.slice(0, 2).toUpperCase()
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="mb-1 flex flex-wrap items-center gap-2">
                        <h3 className="truncate text-base font-semibold leading-relaxed sm:text-lg">{app.name_thai}</h3>
                        <span className="text-sm text-white/60">({app.name})</span>
                        <span className={cn(
                          'px-2 py-0.5 rounded text-xs shrink-0',
                          app.is_published
                            ? 'bg-emerald-500/20 text-emerald-400'
                            : 'bg-gray-500/20 text-gray-400'
                        )}>
                          {app.is_published ? 'Published' : 'Hidden'}
                        </span>
                      </div>
                      <p className="mb-1 truncate text-xs text-white/70 sm:text-sm">App ID: {app.app_id}</p>
                      {app.description && (
                        <p className="mb-1 line-clamp-2 text-xs text-white/60 sm:text-sm">{app.description}</p>
                      )}
                      <p className="text-xs text-white/40">Order: {app.display_order}</p>
                    </div>
                  </div>
                  <div className="flex shrink-0 justify-end gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1 sm:flex-none"
                      onClick={() => handleTogglePublish(app)}
                    >
                      {app.is_published ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1 sm:flex-none"
                      onClick={() => handleEdit(app)}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1 sm:flex-none"
                      onClick={() => handleDelete(app.id!)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

