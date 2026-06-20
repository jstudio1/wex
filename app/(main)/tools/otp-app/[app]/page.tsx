import dynamicImport from 'next/dynamic';

const OTPAppClient = dynamicImport(() => import('./otp-app-client'), {
  loading: () => <div className="h-96 w-full bg-gray-900/50 rounded-lg animate-pulse" />,
});

type Props = {
  params: Promise<{ app: string }>;
};

export default async function OTPAppDetailPage({ params }: Props) {
  const { app } = await params;
  return <OTPAppClient appId={app} />;
}

