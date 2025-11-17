'use client'

import * as React from 'react'
import { useFormStatus } from 'react-dom'
import { Button } from '@/components/ui/button'
import { Spinner } from '@/components/ui/spinner'
import { Progress } from '@/components/ui/progress'

export default function AdminSyncSubmit({ label = 'Sync จากผู้ให้บริการ' }: { label?: string }) {
  const { pending } = useFormStatus()
  const [progress, setProgress] = React.useState(0)

  React.useEffect(() => {
    if (!pending) {
      setProgress(0)
      return
    }
    setProgress(10)
    const id = setInterval(() => {
      setProgress((p) => (p < 90 ? p + 8 : 90))
    }, 300)
    return () => clearInterval(id)
  }, [pending])

  return (
    <div className="flex items-center gap-3">
      <Button size="sm" variant="outline" disabled={pending} type="submit">
        {pending ? (<><Spinner /> กำลังซิงก์...</>) : label}
      </Button>
      {pending && <Progress value={progress} className="w-40" />}
    </div>
  )
}










