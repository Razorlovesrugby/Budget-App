'use client'

import { useEffect } from 'react'
import { useAccounts, useSettings, useTransactions, useSchedules, useSkips, useOverrides } from '@/lib/hooks/use-app-data'
import IPhoneHome from '@/components/home/IPhoneHome'
import { CockpitGrid } from '@/components/grid/CockpitGrid'
import { SetupChecker } from '@/components/ui/SetupChecker'

const DEFAULT_SETTINGS = {
  id: '',
  summary_target_date: null,
  budget_comparison_date: null,
  exchange_rate_gbp_nzd: 2.0,
  exchange_rate_auto_fetch: false,
  exchange_rate_updated_at: null,
  created_at: '',
  updated_at: '',
} as const

export default function HomePage() {
  const { data: accounts = [], isLoading: accountsLoading } = useAccounts()
  const { data: settings, isLoading: settingsLoading } = useSettings()
  const { data: transactions = [] } = useTransactions()
  const { data: schedules = [] } = useSchedules()
  const { data: skips = [] } = useSkips()
  const { data: overrides = [] } = useOverrides()

  useEffect(() => {
    if (accounts.length > 0) {
      console.timeEnd('home-page-ready')
    }
  }, [accounts])

  if (accountsLoading || (settingsLoading && !settings)) {
    if (typeof window !== 'undefined') console.time('home-page-ready')
    return (
      <main className="min-h-screen bg-[#f2f2f7]">
        <div className="h-[54px]" />
        <div className="px-6">
          <div className="h-8 w-48 bg-black/5 rounded animate-pulse mb-4" />
          <div className="h-10 w-36 bg-black/5 rounded animate-pulse" />
        </div>
      </main>
    )
  }

  const resolvedSettings = settings ?? DEFAULT_SETTINGS
  const nonOpeningCount = transactions.filter((t) => t.type !== 'OPENING').length
  const needsSetup = !resolvedSettings.summary_target_date && nonOpeningCount === 0

  return (
    <>
      <SetupChecker needsSetup={needsSetup} />
      {/* iPhone layout — hidden at md+ */}
      <div className="md:hidden">
        <IPhoneHome
          accounts={accounts}
          settings={resolvedSettings}
          transactions={transactions}
          schedules={schedules}
          skips={skips}
          overrides={overrides}
        />
      </div>
      {/* iPad cockpit grid — hidden below md */}
      <div className="hidden md:block">
        <CockpitGrid initialAccounts={accounts} settings={resolvedSettings} />
      </div>
    </>
  )
}
