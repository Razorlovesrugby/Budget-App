import { Suspense } from 'react'
import AddRecurringClient from './AddRecurringClient'

export const dynamic = 'force-dynamic'

export default function AddRecurringPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-[#f2f2f7] flex items-center justify-center">
        <p className="text-sm text-black/25">Loading...</p>
      </div>
    }>
      <AddRecurringClient />
    </Suspense>
  )
}
