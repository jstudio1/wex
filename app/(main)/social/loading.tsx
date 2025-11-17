import SocialServicesBrowser from '@/components/SocialServicesBrowser';

export default function SocialLoading() {
  return (
    <main className="mx-auto max-w-6xl px-4 py-8 space-y-6">
      <SocialServicesBrowser 
        services={[]} 
        categories={[]} 
        globalMarkup={{ percent: 0, fixed: 0 }}
        isLoading={true}
      />
    </main>
  );
}

