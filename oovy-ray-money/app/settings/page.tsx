'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { format, addYears } from 'date-fns'
import { createSupabaseBrowserClient } from '@/lib/supabase/client'
import type { Settings } from '@/types'

function BackButton() {
  const router = useRouter()
  return (
    <button
      onClick={() => router.back()}
      className="inline-flex items-center gap-1 text-[15px] text-black/45 hover:text-black/70 transition-colors mb-6"
    >
      <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
        <path d="M9 3L5 7L9 11" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      Back
    </button>
  )
}

function SectionHeader({ title }: { title: string }) {
  return (
    <p className="text-[12px] font-semibold uppercase tracking-[0.08em] text-black/35 px-1 mb-2 mt-6 first:mt-0">
      {title}
    </p>
  )
}

function SettingsRow({
  label,
  value,
  onPress,
  destructive,
  showChevron = true,
  isLast = false,
}: {
  label: string
  value?: string
  onPress?: () => void
  destructive?: boolean
  showChevron?: boolean
  isLast?: boolean
}) {
  return (
    <button
      onClick={onPress}
      className={`
        w-full flex items-center justify-between px-4 bg-white
        ${!isLast ? 'border-b border-black/[0.05]' : ''}
        active:bg-black/[0.03] transition-colors
      `}
      style={{ height: 52 }}
    >
      <span className={`text-[16px] font-medium ${destructive ? 'text-red-500' : 'text-[#1c1c1e]'}`}>
        {label}
      </span>
      <div className="flex items-center gap-1.5">
        {value && <span className="text-[16px] text-black/35">{value}</span>}
        {showChevron && !destructive && <span className="text-[14px] text-black/20">›</span>}
      </div>
    </button>
  )
}

function SettingsGroup({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-[14px] overflow-hidden border border-black/[0.06] bg-white">
      {children}
    </div>
  )
}

export default function SettingsPage() {
  const router = useRouter()
  const supabase = createSupabaseBrowserClient()
  const [settings, setSettings] = useState<Settings | null>(null)
  const [showTargetDatePicker, setShowTargetDatePicker] = useState(false)
  const [showComparisonPicker, setShowComparisonPicker] = useState(false)
  const [showComparisonCustom, setShowComparisonCustom] = useState(false)

  useEffect(() => {
    supabase.from('settings').select('*').single<Settings>().then(({ data }) => {
      if (data) setSettings(data)
    })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function updateSettings(patch: Partial<Settings>) {
    if (!settings) return
    const { data } = await supabase
      .from('settings')
      .update(patch)
      .eq('id', settings.id)
      .select()
      .single<Settings>()
    if (data) setSettings(data)
  }

  async function handleSignOut() {
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  const today = new Date()
  const maxDate = addYears(today, 5)

  const targetDateDisplay = settings?.summary_target_date
    ? format(new Date(settings.summary_target_date + 'T00:00:00'), 'd MMM yyyy')
    : 'Not set'

  const comparisonDateDisplay = settings?.budget_comparison_date
    ? format(new Date(settings.budget_comparison_date + 'T00:00:00'), 'd MMM yyyy')
    : 'Today'

  const exchangeRateDisplay = settings
    ? `1 GBP = ${Number(settings.exchange_rate_gbp_nzd).toFixed(4)} NZD`
    : '—'

  return (
    <div className="min-h-screen bg-[#f2f2f7]">
      <div className="max-w-md mx-auto pt-6 pb-12 px-5">
        <BackButton />

        <h1 className="text-[28px] font-bold tracking-[-0.5px] text-[#1c1c1e] mb-6">
          Settings
        </h1>

        {/* FORECAST */}
        <SectionHeader title="Forecast" />
        <SettingsGroup>
          <SettingsRow
            label="Summary Target Date"
            value={targetDateDisplay}
            onPress={() => setShowTargetDatePicker(true)}
          />
          <SettingsRow
            label="Budget Comparison"
            value={comparisonDateDisplay}
            onPress={() => setShowComparisonPicker(true)}
            isLast
          />
        </SettingsGroup>

        {/* ACCOUNTS */}
        <SectionHeader title="Accounts" />
        <SettingsGroup>
          <SettingsRow
            label="Account Order"
            onPress={() => router.push('/settings/account-order')}
          />
          <SettingsRow
            label="Manage Accounts"
            onPress={() => router.push('/settings/accounts')}
            isLast
          />
        </SettingsGroup>

        {/* EXCHANGE RATE */}
        <SectionHeader title="Exchange Rate" />
        <SettingsGroup>
          <SettingsRow
            label={exchangeRateDisplay}
            value={settings?.exchange_rate_auto_fetch ? 'Auto' : 'Manual'}
            onPress={() => router.push('/settings/exchange-rate')}
            isLast
          />
        </SettingsGroup>

        {/* DATA */}
        <SectionHeader title="Data" />
        <SettingsGroup>
          <SettingsRow
            label="Planned One-offs"
            onPress={() => router.push('/planned')}
            isLast
          />
        </SettingsGroup>

        {/* SIGN OUT */}
        <div className="mt-6">
          <SettingsGroup>
            <SettingsRow
              label="Sign Out"
              onPress={handleSignOut}
              destructive
              showChevron={false}
              isLast
            />
          </SettingsGroup>
        </div>
      </div>

      {/* Summary Target Date Picker */}
      {showTargetDatePicker && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center"
          onClick={(e) => { if (e.target === e.currentTarget) setShowTargetDatePicker(false) }}
        >
          <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" />
          <div className="relative bg-white rounded-t-3xl w-full max-w-md pb-8 pt-6 px-6">
            <div className="flex justify-center mb-4">
              <div className="w-9 h-1 rounded-full bg-black/15" />
            </div>
            <h2 className="text-[17px] font-semibold text-[#1c1c1e] text-center mb-2">
              Summary Target Date
            </h2>
            <p className="text-[14px] text-black/40 text-center mb-6">
              Project your Budget forward to this date
            </p>
            <input
              type="date"
              defaultValue={settings?.summary_target_date ?? ''}
              min={format(today, 'yyyy-MM-dd')}
              max={format(maxDate, 'yyyy-MM-dd')}
              onChange={(e) => {
                if (e.target.value) {
                  updateSettings({ summary_target_date: e.target.value })
                }
              }}
              className="w-full text-[17px] text-center text-[#1c1c1e] py-4 px-4 rounded-xl border border-black/10 bg-black/[0.02] focus:outline-none focus:ring-2 focus:ring-black/10 appearance-none"
              style={{ WebkitAppearance: 'none' }}
            />
            <div className="flex gap-2 mt-4">
              <button
                onClick={() => {
                  updateSettings({ summary_target_date: null })
                  setShowTargetDatePicker(false)
                }}
                className="flex-1 h-[44px] rounded-xl bg-black/[0.04] text-[15px] font-medium text-[#1c1c1e] hover:bg-black/[0.08] transition-colors"
              >
                Clear
              </button>
              <button
                onClick={() => setShowTargetDatePicker(false)}
                className="flex-1 h-[44px] rounded-xl bg-[#1c1c1e] text-[15px] font-medium text-white hover:bg-black/90 transition-colors"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Budget Comparison Date Picker */}
      {showComparisonPicker && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center"
          onClick={(e) => { if (e.target === e.currentTarget) setShowComparisonPicker(false) }}
        >
          <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" />
          <div className="relative bg-white rounded-t-3xl w-full max-w-md pb-8 pt-6 px-6">
            <div className="flex justify-center mb-4">
              <div className="w-9 h-1 rounded-full bg-black/15" />
            </div>
            <h2 className="text-[17px] font-semibold text-[#1c1c1e] text-center mb-6">
              Budget Comparison
            </h2>

            {!showComparisonCustom ? (
              <div className="flex flex-col gap-2">
                <button
                  onClick={() => {
                    updateSettings({ budget_comparison_date: null })
                    setShowComparisonPicker(false)
                  }}
                  className={`w-full h-[52px] rounded-xl border text-[16px] font-medium flex items-center justify-between px-5 transition-colors ${
                    !settings?.budget_comparison_date
                      ? 'border-[#1c1c1e] bg-[#1c1c1e] text-white'
                      : 'border-black/10 bg-black/[0.02] text-[#1c1c1e] hover:bg-black/[0.05]'
                  }`}
                >
                  Today (rolling)
                  {!settings?.budget_comparison_date && <span>✓</span>}
                </button>
                <button
                  onClick={() => setShowComparisonCustom(true)}
                  className={`w-full h-[52px] rounded-xl border text-[16px] font-medium flex items-center justify-between px-5 transition-colors ${
                    settings?.budget_comparison_date
                      ? 'border-[#1c1c1e] bg-[#1c1c1e] text-white'
                      : 'border-black/10 bg-black/[0.02] text-[#1c1c1e] hover:bg-black/[0.05]'
                  }`}
                >
                  Custom date
                  {settings?.budget_comparison_date && <span className="text-sm text-white/70">{comparisonDateDisplay}</span>}
                </button>
              </div>
            ) : (
              <>
                <input
                  type="date"
                  defaultValue={settings?.budget_comparison_date ?? format(today, 'yyyy-MM-dd')}
                  min={format(today, 'yyyy-MM-dd')}
                  max={format(addYears(today, 1.5), 'yyyy-MM-dd')}
                  onChange={(e) => {
                    if (e.target.value) {
                      updateSettings({ budget_comparison_date: e.target.value })
                    }
                  }}
                  className="w-full text-[17px] text-center text-[#1c1c1e] py-4 px-4 rounded-xl border border-black/10 bg-black/[0.02] focus:outline-none focus:ring-2 focus:ring-black/10 appearance-none"
                  style={{ WebkitAppearance: 'none' }}
                />
                <button
                  onClick={() => setShowComparisonCustom(false)}
                  className="mt-3 w-full text-[14px] text-black/40 text-center"
                >
                  ← Back to options
                </button>
              </>
            )}

            {!showComparisonCustom && (
              <button
                onClick={() => setShowComparisonPicker(false)}
                className="mt-4 w-full h-[44px] rounded-xl bg-black/[0.04] text-[15px] font-medium text-[#1c1c1e] hover:bg-black/[0.08] transition-colors"
              >
                Cancel
              </button>
            )}
            {showComparisonCustom && (
              <button
                onClick={() => { setShowComparisonPicker(false); setShowComparisonCustom(false) }}
                className="mt-4 w-full h-[44px] rounded-xl bg-[#1c1c1e] text-[15px] font-medium text-white hover:bg-black/90 transition-colors"
              >
                Done
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
