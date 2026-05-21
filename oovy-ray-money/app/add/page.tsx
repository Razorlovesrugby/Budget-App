import { Suspense } from 'react'
import AddTransactionClient from './AddTransactionClient'

export const dynamic = 'force-dynamic'

export default function AddPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-[#f2f2f7] flex items-center justify-center">
        <p className="text-sm text-black/25">Loading...</p>
      </div>
    }>
      <AddTransactionClient />
    </Suspense>
  )
}
