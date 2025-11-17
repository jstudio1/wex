import ProductsBrowser from '@/components/ProductsBrowser';

export default function ProductsLoading() {
  return (
    <main className="mx-auto max-w-7xl px-6 py-6 space-y-3">
      <h1 className="text-xl font-semibold">รายการบริการ</h1>
      <ProductsBrowser 
        products={[]} 
        categories={[]} 
        isLoading={true}
      />
    </main>
  );
}

