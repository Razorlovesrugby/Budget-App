'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

interface SetupCheckerProps {
  needsSetup: boolean
}

export function SetupChecker({ needsSetup }: SetupCheckerProps) {
  const router = useRouter()

  useEffect(() => {
    if (!needsSetup) return
    const done = localStorage.getItem('hasCompletedSetup') === 'true'
    if (!done) {
      router.replace('/setup')
    }
  }, [needsSetup, router])

  return null
}
