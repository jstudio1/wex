import dynamicImport from 'next/dynamic';

const TwoFactorAuthClient = dynamicImport(() => import('./two-factor-auth-client'), {
  loading: () => <div className="h-96 w-full bg-gray-900/50 rounded-lg animate-pulse" />,
  ssr: false,
});

export default function TwoFactorAuthPage() {
  return <TwoFactorAuthClient />;
}

