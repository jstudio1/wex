'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/components/ui/use-toast';
import { Skeleton } from '@/components/ui/skeleton';
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
} from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Plus, Edit, Trash2, Save, ShieldCheck } from 'lucide-react';

type Permission = {
	id: number;
	name: string;
	description: string | null;
	discount_percent: number;
	discount_amount: number;
	discount_cap_amount: number;
	created_at?: string;
	updated_at?: string;
};

type FormState = {
	name: string;
	description: string;
	discount_percent: string;
	discount_amount: string;
	discount_cap_amount: string;
};

const emptyForm: FormState = {
	name: '',
	description: '',
	discount_percent: '0',
	discount_amount: '0',
	discount_cap_amount: '0',
};

export default function PermissionsContent() {
	const toast = useToast();
	const [permissions, setPermissions] = useState<Permission[]>([]);
	const [loading, setLoading] = useState(true);
	const [dialogOpen, setDialogOpen] = useState(false);
	const [form, setForm] = useState<FormState>(emptyForm);
	const [saving, setSaving] = useState(false);
	const [editingId, setEditingId] = useState<number | null>(null);
	const [deletingId, setDeletingId] = useState<number | null>(null);

	useEffect(() => {
		fetchPermissions();
	}, []);

	const fetchPermissions = async () => {
		setLoading(true);
		try {
			const res = await fetch('/api/admin/permissions');
			if (!res.ok) {
				const json = await res.json().catch(() => ({}));
				throw new Error(json.error || 'ไม่สามารถโหลดข้อมูลสิทธิ์ได้');
			}
			const json = await res.json();
			setPermissions(json.data || []);
		} catch (err) {
			toast.show({
				title: 'เกิดข้อผิดพลาด',
				description: err instanceof Error ? err.message : 'ไม่สามารถโหลดข้อมูลสิทธิ์ได้',
				variant: 'destructive',
			});
		} finally {
			setLoading(false);
		}
	};

	const openCreateDialog = () => {
		setForm(emptyForm);
		setEditingId(null);
		setDialogOpen(true);
	};

	const openEditDialog = (permission: Permission) => {
		setForm({
			name: permission.name,
			description: permission.description || '',
			discount_percent: String(permission.discount_percent ?? 0),
			discount_amount: String(permission.discount_amount ?? 0),
			discount_cap_amount: String(permission.discount_cap_amount ?? 0),
		});
		setEditingId(permission.id);
		setDialogOpen(true);
	};

	const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
		event.preventDefault();
		if (!form.name.trim()) {
			toast.show({
				title: 'กรุณาระบุชื่อสิทธิ์',
				variant: 'destructive',
			});
			return;
		}

		setSaving(true);
		try {
			const payload = {
				name: form.name.trim(),
				description: form.description.trim() || null,
				discount_percent: Number(form.discount_percent) || 0,
				discount_amount: Number(form.discount_amount) || 0,
				discount_cap_amount: Number(form.discount_cap_amount) || 0,
			};

			let res: Response;
			if (editingId) {
				res = await fetch(`/api/admin/permissions/${editingId}`, {
					method: 'PUT',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify(payload),
				});
			} else {
				res = await fetch('/api/admin/permissions', {
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify(payload),
				});
			}

			const json = await res.json();
			if (!res.ok) {
				throw new Error(json.error || json.detail || 'บันทึกสิทธิ์ไม่สำเร็จ');
			}

			toast.show({
				title: 'สำเร็จ',
				description: editingId ? 'อัปเดตข้อมูลสิทธิ์เรียบร้อย' : 'สร้างสิทธิ์ใหม่เรียบร้อย',
			});

			setDialogOpen(false);
			setForm(emptyForm);
			setEditingId(null);
			await fetchPermissions();
		} catch (err) {
			toast.show({
				title: 'เกิดข้อผิดพลาด',
				description: err instanceof Error ? err.message : 'บันทึกสิทธิ์ไม่สำเร็จ',
				variant: 'destructive',
			});
		} finally {
			setSaving(false);
		}
	};

	const handleDelete = async (permission: Permission) => {
		const confirmed = confirm(`ยืนยันลบสิทธิ์ "${permission.name}" หรือไม่?`);
		if (!confirmed) return;

		setDeletingId(permission.id);
		try {
			const res = await fetch(`/api/admin/permissions/${permission.id}`, {
				method: 'DELETE',
			});

			const json = await res.json().catch(() => ({}));
			if (!res.ok) {
				throw new Error(json.error || json.detail || 'ลบสิทธิ์ไม่สำเร็จ');
			}

			toast.show({
				title: 'สำเร็จ',
				description: 'ลบสิทธิ์เรียบร้อย',
			});

			await fetchPermissions();
		} catch (err) {
			toast.show({
				title: 'เกิดข้อผิดพลาด',
				description: err instanceof Error ? err.message : 'ลบสิทธิ์ไม่สำเร็จ',
				variant: 'destructive',
			});
		} finally {
			setDeletingId(null);
		}
	};

	return (
		<div className="space-y-6">
			<div className="flex items-center justify-between flex-wrap gap-3">
				<div className="flex items-center gap-3">
					<div className="p-2 rounded-full bg-emerald-900/30 text-emerald-500">
						<ShieldCheck className="size-5" />
					</div>
					<div>
						<h2 className="text-2xl font-bold text-white">จัดการสิทธิ์</h2>
						<p className="text-sm text-gray-400">
							สร้างและกำหนดสิทธิ์ส่วนลดเป็นเปอร์เซ็นต์หรือจำนวนเงินสำหรับผู้ใช้ประเภทต่างๆ
						</p>
					</div>
				</div>
				<Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
					<DialogTrigger asChild>
						<Button
							onClick={openCreateDialog}
							className="gap-2 bg-emerald-600 hover:bg-emerald-700 text-white"
						>
							<Plus className="size-4" />
							เพิ่มสิทธิ์ใหม่
						</Button>
					</DialogTrigger>
					<DialogContent className="sm:max-w-[520px] bg-[#0a0a0a] border-gray-800">
						<form onSubmit={handleSubmit}>
							<DialogHeader>
								<DialogTitle className="text-white">{editingId ? 'แก้ไขสิทธิ์' : 'สร้างสิทธิ์ใหม่'}</DialogTitle>
								<DialogDescription className="text-gray-400">
									กำหนดชื่อ คำอธิบาย และส่วนลดของสิทธิ์
								</DialogDescription>
							</DialogHeader>
							<div className="grid gap-4 py-4">
								<div className="grid gap-2">
									<label htmlFor="permission-name" className="text-sm font-medium text-gray-300">
										ชื่อสิทธิ์ *
									</label>
									<Input
										id="permission-name"
										value={form.name}
										onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
										required
										className="border-gray-700 bg-[#1a1a1a] text-white"
									/>
								</div>
								<div className="grid gap-2">
									<label htmlFor="permission-description" className="text-sm font-medium text-gray-300">
										คำอธิบาย
									</label>
									<Textarea
										id="permission-description"
										value={form.description}
										onChange={(e) => setForm((prev) => ({ ...prev, description: e.target.value }))}
										rows={3}
										className="border-gray-700 bg-[#1a1a1a] text-white"
									/>
								</div>
								<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
									<div className="grid gap-2">
										<label htmlFor="permission-discount-percent" className="text-sm font-medium text-gray-300">
											ส่วนลด (%) 
										</label>
										<Input
											id="permission-discount-percent"
											type="number"
											step="0.01"
											min="0"
											value={form.discount_percent}
											onChange={(e) => setForm((prev) => ({ ...prev, discount_percent: e.target.value }))}
											className="border-gray-700 bg-[#1a1a1a] text-white"
										/>
									</div>
									<div className="grid gap-2">
										<label htmlFor="permission-discount-amount" className="text-sm font-medium text-gray-300">
											ส่วนลดคงที่ (บาท)
										</label>
										<Input
											id="permission-discount-amount"
											type="number"
											step="0.01"
											min="0"
											value={form.discount_amount}
											onChange={(e) => setForm((prev) => ({ ...prev, discount_amount: e.target.value }))}
											className="border-gray-700 bg-[#1a1a1a] text-white"
										/>
									</div>
									<div className="grid gap-2 md:col-span-2">
										<label htmlFor="permission-discount-cap-amount" className="text-sm font-medium text-gray-300">
											ลดเป็น % แต่ไม่เกิน (บาท)
										</label>
										<Input
											id="permission-discount-cap-amount"
											type="number"
											step="0.01"
											min="0"
											value={form.discount_cap_amount}
											onChange={(e) => setForm((prev) => ({ ...prev, discount_cap_amount: e.target.value }))}
											className="border-gray-700 bg-[#1a1a1a] text-white"
										/>
										<p className="text-xs text-gray-400">
											ใช้จำกัดยอดส่วนลดสูงสุดเมื่อเลือกส่วนลดแบบเปอร์เซ็นต์ (0 = ไม่จำกัด)
										</p>
									</div>
								</div>
							</div>
							<DialogFooter>
								<Button
									type="button"
									variant="outline"
									onClick={() => {
										setDialogOpen(false);
										setEditingId(null);
									}}
									className="border-gray-700 text-gray-300 hover:bg-gray-800"
								>
									ยกเลิก
								</Button>
								<Button
									type="submit"
									disabled={saving}
									className="gap-2 bg-emerald-600 hover:bg-emerald-700 text-white"
								>
									{saving ? (
										<>
											<Save className="size-4 animate-spin" />
											กำลังบันทึก...
										</>
									) : (
										<>
											<Save className="size-4" />
											บันทึก
										</>
									)}
								</Button>
							</DialogFooter>
						</form>
					</DialogContent>
				</Dialog>
			</div>

			<Card className="border border-gray-800 bg-[#0a0a0a] shadow-sm">
				<CardHeader>
					<CardTitle className="text-white">รายการสิทธิ์ทั้งหมด</CardTitle>
					<CardDescription className="text-gray-400">
						ปรับแต่งข้อเสนอสำหรับสิทธิ์แต่ละประเภทและลบบทบาทที่ไม่ใช้แล้วได้จากที่นี่
					</CardDescription>
				</CardHeader>
				<CardContent>
					{loading ? (
						<div className="space-y-3">
							{Array.from({ length: 6 }).map((_, index) => (
								<div key={index} className="grid grid-cols-1 md:grid-cols-6 gap-3 p-4 border border-gray-800 rounded-lg bg-[#1a1a1a]">
									<div className="md:col-span-2 space-y-2">
										<Skeleton className="h-5 w-48" />
										<Skeleton className="h-4 w-64" />
									</div>
									<Skeleton className="h-5 w-20" />
									<Skeleton className="h-5 w-24" />
									<Skeleton className="h-5 w-24" />
									<Skeleton className="h-9 w-24" />
								</div>
							))}
						</div>
					) : permissions.length === 0 ? (
						<div className="text-center py-12 border border-dashed border-gray-800 rounded-xl bg-[#1a1a1a]">
							<p className="text-lg font-semibold text-white">ยังไม่มีสิทธิ์</p>
							<p className="text-sm text-gray-400 mt-2">คลิกปุ่ม &quot;เพิ่มสิทธิ์ใหม่&quot; เพื่อสร้างสิทธิ์แรกของคุณ</p>
						</div>
					) : (
						<div className="overflow-x-auto">
							<Table>
								<TableHeader>
									<TableRow className="bg-gray-900/50 border-gray-800">
										<TableHead className="text-white w-[220px]">ชื่อสิทธิ์</TableHead>
										<TableHead className="text-white">คำอธิบาย</TableHead>
										<TableHead className="text-white w-[120px] text-right">ส่วนลด (%)</TableHead>
										<TableHead className="text-white w-[140px] text-right">ส่วนลด (บาท)</TableHead>
												<TableHead className="text-white w-[160px] text-right">ลดสูงสุด (บาท)</TableHead>
										<TableHead className="text-right text-white w-[140px]">จัดการ</TableHead>
									</TableRow>
								</TableHeader>
								<TableBody>
									{permissions.map((permission) => (
										<TableRow key={permission.id} className="border-gray-800 hover:bg-gray-900/30">
											<TableCell>
												<div className="flex flex-col gap-1">
													<span className="font-medium text-white">{permission.name}</span>
													{permission.created_at && (
														<span className="text-xs text-gray-400">
															สร้างเมื่อ {new Date(permission.created_at).toLocaleDateString('th-TH')}
														</span>
													)}
												</div>
											</TableCell>
											<TableCell className="text-sm text-gray-300">
												{permission.description ? permission.description : (
													<span className="text-gray-500 italic">ไม่มีคำอธิบาย</span>
												)}
											</TableCell>
											<TableCell className="text-right">
												<Badge variant="outline" className="border-emerald-600 text-emerald-400 bg-emerald-900/30">
													{permission.discount_percent?.toLocaleString('th-TH', { maximumFractionDigits: 2 }) ?? 0}%
												</Badge>
											</TableCell>
											<TableCell className="text-right">
												<Badge variant="outline" className="border-gray-700 text-gray-300 bg-gray-800">
													{permission.discount_amount?.toLocaleString('th-TH', { maximumFractionDigits: 2 }) ?? 0} ฿
												</Badge>
											</TableCell>
												<TableCell className="text-right">
													<Badge variant="outline" className="border-gray-700 text-gray-300 bg-gray-800">
														{permission.discount_cap_amount?.toLocaleString('th-TH', { maximumFractionDigits: 2 }) ?? 0} ฿
													</Badge>
												</TableCell>
											<TableCell className="text-right">
												<div className="flex justify-end gap-2">
													<Button
														variant="outline"
														size="sm"
														onClick={() => openEditDialog(permission)}
														className="gap-2 border-gray-700 text-gray-300 hover:bg-gray-800"
													>
														<Edit className="size-4" />
														แก้ไข
													</Button>
													<Button
														variant="outline"
														size="sm"
														onClick={() => handleDelete(permission)}
														className="gap-2 border-red-800 text-red-400 hover:bg-red-900/30"
														disabled={deletingId === permission.id}
													>
														{deletingId === permission.id ? (
															<span className="text-xs">กำลังลบ...</span>
														) : (
															<>
																<Trash2 className="size-4" />
																ลบ
															</>
														)}
													</Button>
												</div>
											</TableCell>
										</TableRow>
									))}
								</TableBody>
							</Table>
						</div>
					)}
				</CardContent>
			</Card>
		</div>
	);
}


