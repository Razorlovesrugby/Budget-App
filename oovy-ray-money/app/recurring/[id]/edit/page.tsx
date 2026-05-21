'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter, useParams } from 'next/navigation'
import type {
  Account,
  RecurringSchedule,
  RecurringFormData,
} from '@/types'
import type { EditScope as EditScopeType } from '@/components/transactions/RecurringForm'
import { createSupabaseBrowserClient } from '@/lib/supabase/client'
import {
  getRecurringSchedule,
  createOverride,
  appendEffectiveChange,
  updateRecurringSchedule,
  createSkip,
  endSeriesAfter,
  deleteSchedule,
} from '@/lib/db/recurring'
import RecurringForm from '@/components/transactions/RecurringForm'
import DeleteRecurringConfirm from '@/components/transactions/DeleteRecurringConfirm'

export default function EditRecurringClient() {
  const router = useRouter()
  const params = useParams()
  const scheduleId = params.id as string

  const [schedule, setSchedule] = useState<RecurringSchedule | null>(null)
  const [accounts, setAccounts] = useState<Account[]>([])
  const [loading, setLoading] = useState(true)
  const [showDelete, setShowDelete] = useState(false)

  useEffect(() => {
    const fetchData = async () => {
      const supabase = createSupabaseBrowserClient()

      const [scheduleResult, accountsResult] = await Promise.all([
        getRecurringSchedule(scheduleId),
        supabase
          .from('accounts')
          .select('*')
          .order('display_order')
          .returns<Account[]>(),
      ])

      setSchedule(scheduleResult)
      setAccounts(accountsResult.data ?? [])
      setLoading(false)
    }
    fetchData()
  }, [scheduleId])

  const handleSubmit = useCallback(
    async (data: RecurringFormData, scope: string, effectiveDate?: string) => {
      if (!schedule) return

      switch (scope) {
        case 'this': {
          // Scope 1: This occurrence only → create override
          await createOverride(scheduleId, {
            original_date: effectiveDate || data.start_date,
            amount_from: data.amount,
            amount_to: data.to_amount ?? data.amount,
            name: data.name,
          })
          break
        }
        case 'future': {
          // Scope 2: All future → append effective change
          if (!effectiveDate) throw new Error('Effective date required for future scope')
          await appendEffectiveChange(scheduleId, effectiveDate, {
            amount_from: data.amount,
            amount_to: data.to_amount ?? data.amount,
          })
          break
        }
        case 'all': {
          // Scope 3: Entire series → update row directly
          await updateRecurringSchedule(scheduleId, {
            name: data.name,
            frequency: data.frequency,
            day_of_week: data.day_of_week,
            day_of_month: data.day_of_month,
            weekday_only: data.weekday_only,
            start_date: data.start_date,
            effective_changes: [
              {
                effective_from: data.start_date,
                amount_from: data.amount,
                amount_to: data.to_amount ?? data.amount,
              },
            ],
          })
          break
        }
      }

      router.push('/recurring')
    },
    [schedule, scheduleId, router]
  )

  const handleDelete = useCallback(
    async (scope: EditScopeType, effectiveDate?: string) => {
      switch (scope) {
        case 'this': {
          if (!effectiveDate) throw new Error('Date required')
          await createSkip(scheduleId, effectiveDate)
          break
        }
        case 'future': {
          if (!effectiveDate) throw new Error('Date required')
          await endSeriesAfter(scheduleId, effectiveDate)
          break
        }
        case 'all': {
          await deleteSchedule(scheduleId)
          break
        }
      }

      setShowDelete(false)
      router.push('/recurring')
    },
    [scheduleId, router]
  )

  if (loading) {
    return (
      <div className="min-h-screen bg-[#f2f2f7] flex items-center justify-center">
        <p className="text-sm text-black/25">Loading...</p>
      </div>
    )
  }

  if (!schedule) {
    return (
      <div className="min-h-screen bg-[#f2f2f7] flex items-center justify-center">
        <p className="text-sm text-black/25">Schedule not found</p>
      </div>
    )
  }

  return (
    <>
      <RecurringForm
        mode="edit"
        initialValues={schedule}
        onSubmit={handleSubmit}
        onCancel={() => router.push('/recurring')}
        onDeleteClick={() => setShowDelete(true)}
        allAccounts={accounts}
      />

      {showDelete && (
        <DeleteRecurringConfirm
          schedule={schedule}
          accounts={accounts}
          onDelete={handleDelete}
          onCancel={() => setShowDelete(false)}
        />
      )}
    </>
  )
}
