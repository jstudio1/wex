'use client';

import { useEffect, useMemo, useState } from 'react';

type Product = {
	id: number;
	name: string;
	key: string;
	is_published: boolean;
	image_url: string | null;
	banner_url: string | null;
	icon_url: string | null;
	badge_enabled: boolean;
	badge_percent: number | null;
	badge_text: string | null;
	badge_apply_price: boolean;
};

type Category = {
	id: number;
	name: string;
	slug: string;
};

type ProductCategoryMap = Map<number, number[]>;

export default function NewTopupServicesManager() {
	const [loading, setLoading] = useState(true);
	const [saving, setSaving] = useState(false);
	const [syncing, setSyncing] = useState(false);
	const [error, setError] = useState<string | null>(null);

	const [products, setProducts] = useState<Product[]>([]);
	const [categories, setCategories] = useState<Category[]>([]);
	const [productCategories, setProductCategories] = useState<ProductCategoryMap>(new Map());

	const [filter, setFilter] = useState<'all' | 'published' | 'unpublished'>('all');
	const [query, setQuery] = useState('');

	useEffect(() => {
		fetchAll();
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [filter]);

	const fetchAll = async () => {
		setLoading(true);
		setError(null);
		try {
			const controller = new AbortController();
			const timeoutId = setTimeout(() => controller.abort(), 30000);

			const [p, c, pc] = await Promise.all([
				fetch(`/api/admin/products?filter=${filter}`, { signal: controller.signal }),
				fetch('/api/admin/categories', { signal: controller.signal }),
				fetch('/api/admin/products/categories', { signal: controller.signal }),
			]);

			clearTimeout(timeoutId);

			if (!p.ok) throw new Error((await p.json().catch(() => ({}))).error || 'โหลดบริการไม่สำเร็จ');
			if (!c.ok) throw new Error((await c.json().catch(() => ({}))).error || 'โหลดหมวดหมู่ไม่สำเร็จ');

			const pj = await p.json();
			const cj = await c.json();
			const pcj = pc.ok ? await pc.json() : { data: [] };

			setProducts(pj.data || []);
			setCategories(cj.data || []);

			const map: ProductCategoryMap = new Map();
			for (const row of pcj.data || []) {
				const pid = row.product_id as number;
				const cid = row.category_id as number;
				const arr = map.get(pid) || [];
				arr.push(cid);
				map.set(pid, arr);
			}
			setProductCategories(map);
		} catch (err) {
			setError(err instanceof Error ? err.message : 'เกิดข้อผิดพลาด');
			setProducts([]);
			setCategories([]);
			setProductCategories(new Map());
		} finally {
			setLoading(false);
		}
	};

	const filtered = useMemo(() => {
		const q = query.trim().toLowerCase();
		if (!q) return products;
		return products.filter(p => p.name?.toLowerCase().includes(q) || p.key?.toLowerCase().includes(q));
	}, [products, query]);

	const toggleCategory = (productId: number, categoryId: number, checked: boolean) => {
		setProductCategories(prev => {
			const next = new Map(prev);
			const arr = new Set(next.get(productId) || []);
			if (checked) {
				arr.add(categoryId);
			} else {
				arr.delete(categoryId);
			}
			next.set(productId, Array.from(arr));
			return next;
		});
	};

	const updateProduct = <K extends keyof Product>(productId: number, key: K, value: Product[K]) => {
		setProducts(prev => prev.map(p => (p.id === productId ? { ...p, [key]: value } : p)));
	};

	const handleSaveAll = async () => {
		setSaving(true);
		try {
			const updates = products.map(p => ({
				id: p.id,
				name: p.name,
				image_url: p.image_url || null,
				banner_url: p.banner_url || null,
				icon_url: p.icon_url || null,
				is_published: !!p.is_published,
				badge_enabled: !!p.badge_enabled,
				badge_percent: p.badge_percent ?? null,
				badge_text: (p.badge_text || '').trim() || null,
				badge_apply_price: !!p.badge_apply_price,
				categories: productCategories.get(p.id) || [],
			}));

			const res = await fetch('/api/admin/products/batch', {
				method: 'PUT',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ products: updates }),
			});
			if (!res.ok) {
				const j = await res.json().catch(() => ({}));
				throw new Error(j.error || 'บันทึกไม่สำเร็จ');
			}
			alert('บันทึกการตั้งค่าเรียบร้อย');
			await fetchAll();
		} catch (err) {
			alert(err instanceof Error ? err.message : 'เกิดข้อผิดพลาด');
		} finally {
			setSaving(false);
		}
	};

	const handleSync = async () => {
		const confirmed = confirm(
			'คำเตือน: การ Sync จะรีเซ็ตกำไรทั้งหมดเป็น 0%\nคุณแน่ใจหรือไม่ที่จะดำเนินการ?'
		);
		if (!confirmed) return;
		setSyncing(true);
		try {
			const controller = new AbortController();
			const timeoutId = setTimeout(() => controller.abort(), 120000);
			const res = await fetch('/api/admin/products/sync', { method: 'POST', signal: controller.signal });
			clearTimeout(timeoutId);
			if (!res.ok) {
				const j = await res.json().catch(() => ({}));
				throw new Error(j.error || 'Sync ไม่สำเร็จ');
			}
			alert('Sync เรียบร้อย และรีเซ็ตกำไรทั้งหมดเป็น 0% แล้ว');
			await fetchAll();
		} catch (err) {
			alert(err instanceof Error ? err.message : 'เกิดข้อผิดพลาด');
		} finally {
			setSyncing(false);
		}
	};

	const handlePublishAll = async () => {
		if (!confirm('คุณต้องการเผยแพร่ทุกเกมที่ยังไม่เผยแพร่หรือไม่?')) return;
		try {
			const res = await fetch('/api/admin/products/publish-all', { method: 'POST' });
			if (!res.ok) {
				const j = await res.json().catch(() => ({}));
				throw new Error(j.error || 'เผยแพร่ไม่สำเร็จ');
			}
			alert('เผยแพร่ทุกเกมเรียบร้อย');
			await fetchAll();
		} catch (err) {
			alert(err instanceof Error ? err.message : 'เกิดข้อผิดพลาด');
		}
	};

	return (
		<div className="space-y-4">
			{/* Header */}
			<div className="flex items-center justify-between flex-wrap gap-3">
				<div>
					<h2 className="text-2xl font-bold text-white">จัดการบริการเติมเกม</h2>
					<p className="text-sm text-gray-400">จัดการรายการสินค้าต่างๆ</p>
				</div>
				<div className="flex items-center gap-2">
					<button
						onClick={handlePublishAll}
						disabled={loading || saving}
						className="px-3 py-2 rounded border border-gray-700 bg-[#0a0a0a] hover:bg-gray-800 text-sm text-gray-300 disabled:opacity-60"
					>
						เผยแพร่ทุกเกม
					</button>
					<button
						onClick={handleSync}
						disabled={syncing}
						className="px-3 py-2 rounded border border-gray-700 bg-[#0a0a0a] hover:bg-gray-800 text-sm text-gray-300 disabled:opacity-60"
					>
						{syncing ? 'กำลังซิงก์...' : 'Sync จากผู้ให้บริการ'}
					</button>
					<button
						onClick={handleSaveAll}
						disabled={saving}
						className="px-3 py-2 rounded border border-transparent bg-emerald-600 hover:bg-emerald-700 text-white text-sm disabled:opacity-60"
					>
						{saving ? 'กำลังบันทึก...' : 'บันทึกทั้งหมด'}
					</button>
				</div>
			</div>

			{/* Controls */}
			<div className="flex flex-wrap items-center gap-2">
				<input
					placeholder="ค้นหาชื่อหรือคีย์บริการ..."
					value={query}
					onChange={(e) => setQuery(e.target.value)}
					className="px-3 py-2 rounded border border-gray-700 bg-[#1a1a1a] text-white placeholder:text-gray-500 outline-none min-w-[240px]"
				/>
				<div className="flex items-center gap-1">
					<button
						onClick={() => setFilter('all')}
						className={`px-3 py-2 rounded text-sm border ${filter === 'all' ? 'border-emerald-600 bg-emerald-900/30 text-emerald-400' : 'border-gray-700 bg-[#0a0a0a] hover:bg-gray-800 text-gray-300'}`}
					>
						ทั้งหมด
					</button>
					<button
						onClick={() => setFilter('published')}
						className={`px-3 py-2 rounded text-sm border ${filter === 'published' ? 'border-emerald-600 bg-emerald-900/30 text-emerald-400' : 'border-gray-700 bg-[#0a0a0a] hover:bg-gray-800 text-gray-300'}`}
					>
						ที่เผยแพร่
					</button>
					<button
						onClick={() => setFilter('unpublished')}
						className={`px-3 py-2 rounded text-sm border ${filter === 'unpublished' ? 'border-emerald-600 bg-emerald-900/30 text-emerald-400' : 'border-gray-700 bg-[#0a0a0a] hover:bg-gray-800 text-gray-300'}`}
					>
						ที่ไม่เผยแพร่
					</button>
				</div>
			</div>

			{/* Error */}
			{error && (
				<div className="p-3 rounded border border-red-800 bg-red-900/30 text-sm text-red-400">
					{error}
				</div>
			)}

			{/* List */}
			<div className="rounded-xl border border-gray-800 overflow-hidden bg-[#0a0a0a]">
				<div className="grid grid-cols-12 gap-2 px-3 py-2 text-sm bg-gray-900/50 border-b border-gray-800 text-gray-300">
					<div className="col-span-5">บริการ</div>
					<div className="col-span-3">หมวดหมู่</div>
					<div className="col-span-2">สถานะ</div>
					<div className="col-span-2 text-right">การตั้งค่า</div>
				</div>

				{loading ? (
					<div className="p-6 text-sm text-gray-400">กำลังโหลด...</div>
				) : filtered.length === 0 ? (
					<div className="p-6 text-sm text-gray-400">ไม่พบบริการ</div>
				) : (
					<div className="max-h-[calc(100vh-360px)] overflow-y-auto">
						{filtered.map((p) => {
							const catIds = new Set(productCategories.get(p.id) || []);
							return (
								<div key={p.id} className="grid grid-cols-12 gap-2 px-3 py-3 border-b border-gray-800">
									{/* Service */}
									<div className="col-span-5 flex items-center gap-3 min-w-0">
										{p.image_url ? (
											// eslint-disable-next-line @next/next/no-img-element
											<img src={p.image_url} alt={p.name} className="h-10 w-10 rounded object-cover shrink-0 border border-gray-800" />
										) : (
											<div className="h-10 w-10 rounded bg-gray-800 shrink-0 border border-gray-800" />
										)}
										<div className="min-w-0 flex-1">
											<input
												value={p.name}
												onChange={(e) => updateProduct(p.id, 'name', e.target.value)}
												className="px-2 py-1 rounded border border-gray-700 bg-[#1a1a1a] text-white outline-none w-full"
											/>
											<div className="text-xs text-gray-500 mt-1 truncate">key: {p.key}</div>
										</div>
									</div>

									{/* Categories */}
									<div className="col-span-3">
										<div className="flex flex-wrap gap-2">
											{categories.map((c) => {
												const checked = catIds.has(c.id);
												return (
													<label key={c.id} className="inline-flex items-center gap-2 px-2 py-1 rounded border border-gray-700 bg-[#0a0a0a]">
														<input
															type="checkbox"
															checked={checked}
															onChange={(e) => toggleCategory(p.id, c.id, e.target.checked)}
															className="accent-emerald-600"
														/>
														<span className="text-xs text-gray-300">{c.name}</span>
													</label>
												);
											})}
										</div>
									</div>

									{/* Status */}
									<div className="col-span-2 flex items-center gap-2">
										<span className={`text-xs px-2 py-1 rounded ${p.is_published ? 'bg-emerald-900/30 text-emerald-400 border border-emerald-800' : 'bg-gray-800 text-gray-400 border border-gray-700'}`}>
											{p.is_published ? 'เผยแพร่' : 'ยังไม่เผยแพร่'}
										</span>
										<label className="inline-flex items-center gap-2 text-xs">
											<input
												type="checkbox"
												checked={p.is_published}
												onChange={(e) => updateProduct(p.id, 'is_published', e.target.checked)}
												className="accent-emerald-600"
											/>
											<span className="text-gray-300">เปิดเผยแพร่</span>
										</label>
									</div>

									{/* Settings */}
									<div className="col-span-2">
										<div className="flex flex-col gap-2">
											<input
												placeholder="รูปไอคอน (Product Icon)"
												value={p.image_url || ''}
												onChange={(e) => updateProduct(p.id, 'image_url', e.target.value)}
												className="px-2 py-1 rounded border border-gray-700 bg-[#1a1a1a] text-white outline-none w-full placeholder:text-gray-500"
											/>
											<input
												placeholder="รูป Banner (สำหรับหน้า Detail)"
												value={p.banner_url || ''}
												onChange={(e) => updateProduct(p.id, 'banner_url', e.target.value)}
												className="px-2 py-1 rounded border border-gray-700 bg-[#1a1a1a] text-white outline-none w-full placeholder:text-gray-500"
											/>
											<input
												placeholder="รูป Icon เหรียญ (แสดงในรายการราคา)"
												value={p.icon_url || ''}
												onChange={(e) => updateProduct(p.id, 'icon_url', e.target.value)}
												className="px-2 py-1 rounded border border-gray-700 bg-[#1a1a1a] text-white outline-none w-full placeholder:text-gray-500"
											/>
											<div className="flex items-center gap-2">
												<label className="inline-flex items-center gap-2 text-xs">
													<input
														type="checkbox"
														checked={p.badge_enabled}
														onChange={(e) => updateProduct(p.id, 'badge_enabled', e.target.checked)}
														className="accent-emerald-600"
													/>
													<span className="text-gray-300">Badge</span>
												</label>
												<label className="inline-flex items-center gap-2 text-xs">
													<input
														type="checkbox"
														checked={p.badge_apply_price}
														onChange={(e) => updateProduct(p.id, 'badge_apply_price', e.target.checked)}
														className="accent-emerald-600"
													/>
													<span className="text-gray-300">ลดราคาจริง</span>
												</label>
											</div>
											<div className="flex items-center gap-2">
												<input
													type="number"
													min={0}
													max={100}
													step={1}
													placeholder="% ลด"
													value={p.badge_percent ?? ''}
													onChange={(e) => {
														const v = e.target.value;
														updateProduct(p.id, 'badge_percent', v === '' ? null : Math.max(0, Math.min(100, Math.round(Number(v) || 0))));
													}}
													className="px-2 py-1 rounded border border-gray-700 bg-[#1a1a1a] text-white outline-none w-24 placeholder:text-gray-500"
												/>
												<input
													placeholder="ข้อความ badge เช่น Flash Sale"
													value={p.badge_text || ''}
													onChange={(e) => updateProduct(p.id, 'badge_text', e.target.value)}
													className="px-2 py-1 rounded border border-gray-700 bg-[#1a1a1a] text-white outline-none flex-1 placeholder:text-gray-500"
												/>
											</div>
										</div>
									</div>
								</div>
							);
						})}
					</div>
				)}
			</div>
		</div>
	);
}


