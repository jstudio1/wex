import type { AppProps } from 'next/app';

// Legacy _app preserved for reference after migration to App Router
export default function LegacyMyApp({ Component, pageProps }: AppProps) {
  return <Component {...pageProps} />;
}


