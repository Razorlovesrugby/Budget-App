import { createSupabaseServerClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import type { RecurringSchedule, Account } from '@/types'
import RecurringList from '@/components/transactions/RecurringList'

export const dynamic = 'force-dynamic'

export default async function RecurringTransactionsPage() {
  const supabase = createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const { data: schedules } = await supabase
    .from('recurring_schedules')
    .select('*')
    .eq('is_active', true)
    .order('name')
    .returns<RecurringSchedule[]>()

  const { data: accounts } = await supabase
    .from('accounts')
    .select('*')
    .order('display_order')
    .returns<Account[]>()

  return (
    <div className="min-h-screen bg-[#f2f2f7]">
      <div className="max-w-md mx-auto pt-6 pb-8 px-5">
        {/* Back button */}
        <a
          href="/"
          className="inline-flex items-center gap-1 text-[15px] text-black/45 hover:text-black/70 transition-colors mb-5"
        >
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <path
              d="M9 3L5 7L9 11"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          Back
        </a>

        <RecurringList
          schedules={schedules ?? []}
          accounts={accounts ?? []}
        />
      </div>
    </div>
  )
}
