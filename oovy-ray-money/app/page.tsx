import { createSupabaseServerClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import type { Account, Transaction, RecurringSchedule, RecurringSkip, RecurringOverride, Settings } from '@/types'
import IPhoneHome from '@/components/home/IPhoneHome'
import { CockpitGrid } from '@/components/grid/CockpitGrid'

export default async function HomePage() {
  const supabase = createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const [accRes, settingsRes, txRes, schedRes, skipRes, ovRes] = await Promise.all([
    supabase
      .from('accounts')
      .select('*')
      .eq('is_archived', false)
      .eq('is_system', false)
      .order('display_order')
      .returns<Account[]>(),
    supabase.from('settings').select('*').single<Settings>(),
    supabase.from('transactions').select('*').returns<Transaction[]>(),
    supabase.from('recurring_schedules').select('*').eq('is_active', true).returns<RecurringSchedule[]>(),
    supabase.from('recurring_skips').select('*').returns<RecurringSkip[]>(),
    supabase.from('recurring_overrides').select('*').returns<RecurringOverride[]>(),
  ])

  const accounts = accRes.data ?? []
  const settings = settingsRes.data ?? {
    id: '',
    summary_target_date: null,
    budget_comparison_date: null,
    exchange_rate_gbp_nzd: 2.0,
    exchange_rate_auto_fetch: false,
    exchange_rate_updated_at: null,
    created_at: '',
    updated_at: '',
  }
  const transactions = txRes.data ?? []
  const schedules = schedRes.data ?? []
  const skips = skipRes.data ?? []
  const overrides = ovRes.data ?? []

  return (
    <>
      {/* iPhone layout — hidden at md+ */}
      <div className="md:hidden">
        <IPhoneHome
          accounts={accounts}
          settings={settings}
          transactions={transactions}
          schedules={schedules}
          skips={skips}
          overrides={overrides}
        />
      </div>

      {/* iPad cockpit grid — hidden below md */}
      <div className="hidden md:block">
        <CockpitGrid initialAccounts={accounts} settings={settings} />
      </div>
    </>
  )
}
