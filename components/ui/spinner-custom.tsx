'use client';

import { LoaderIcon } from 'lucide-react';

export function Spinner(props: React.ComponentProps<'svg'>) {
  return (
    <LoaderIcon role="status" aria-label="Loading" className={`size-6 animate-spin ${props.className || ''}`} {...props} />
  );
}

export function SpinnerCustom() {
  return (
    <div className="flex items-center justify-center gap-4">
      <Spinner />
    </div>
  );
}



