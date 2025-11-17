'use client'

import * as React from 'react'

type ProgressProps = React.HTMLAttributes<HTMLDivElement> & {
  value?: number
}

export function Progress({ value = 0, className = '', ...props }: ProgressProps) {
  const clamped = Math.max(0, Math.min(100, Number.isFinite(value) ? value : 0))
  return (
    <div className={`h-2 w-full overflow-hidden rounded bg-white/10 ${className}`} {...props}>
      <div className="h-full bg-white/70 transition-[width] duration-300" style={{ width: `${clamped}%` }} />
    </div>
  )
}

export default Progress










