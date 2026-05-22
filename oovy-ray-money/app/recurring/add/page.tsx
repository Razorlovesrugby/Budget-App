'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import type { Account, RecurringFormData } from '@/types'
import { createSupabaseBrowserClient } from '@/lib/supabase/client'
import RecurringForm from '@/components/transactions/RecurringForm'
import { createRecurringSchedule } from '@/lib/db/recurring'
import { useQueryClient } from '@tanstack/react-query'

export default function AddRecurringClient() {
  const router = useRouter()
  const queryClient = useQueryClient()
  const [accounts, setAccounts] = useState<Account[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchAccounts = async () => {
      const supabase = createSupabaseBrowserClient()
      const { data } = await supabase
        .from('accounts')
        .select('*')
        .order('display_order')
        .returns<Account[]>()
      setAccounts(data ?? [])
      setLoading(false)
    }
    fetchAccounts()
  }, [])

  const handleSubmit = async (data: RecurringFormData) => {
    await createRecurringSchedule(data)
    queryClient.invalidateQueries({ queryKey: ['schedules'] })
    queryClient.invalidateQueries({ queryKey: ['accounts'] })
    router.push('/recurring')
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#f2f2f7] flex items-center justify-center">
        <p className="text-sm text-black/25">Loading...</p>
      </div>
    )
  }

  return (
    <RecurringForm
      mode="add"
      onSubmit={handleSubmit}
      onCancel={() => router.push('/recurring')}
      allAccounts={accounts}
    />
  )
}
