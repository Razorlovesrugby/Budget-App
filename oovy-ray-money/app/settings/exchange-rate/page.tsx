'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { format } from 'date-fns'
import { createSupabaseBrowserClient } from '@/lib/supabase/client'
import type { Settings } from '@/types'

function Toggle({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      onClick={() => onChange(!checked)}
      className={`relative inline-flex h-6 w-11 shrink-0 rounded-full border-2 border-transparent transition-colors cursor-pointer ${
        checked ? 'bg-[#1c1c1e]' : 'bg-black/20'
      }`}
    >
      <span
        className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-sm ring-0 transition-transform ${
          checked ? 'translate-x-5' : 'translate-x-0'
        }`}
      />
    </button>
  )
}

export default function ExchangeRatePage() {
  const router = useRouter()
  const supabase = createSupabaseBrowserClient()
  const [settings, setSettings] = useState<Settings | null>(null)
  const [rateInput, setRateInput] = useState('')
  const [fetching, setFetching] = useState(false)
  const [fetchError, setFetchError] = useState(false)

  useEffect(() => {
    supabase
      .from('settings')
      .select('*')
      .single<Settings>()
      .then(({ data }) => {
        if (data) {
          setSettings(data)
          setRateInput(Number(data.exchange_rate_gbp_nzd).toFixed(6))
        }
      })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function saveRate() {
    if (!settings) return
    const rate = parseFloat(rateInput)
    if (isNaN(rate) || rate <= 0) return

    const { data } = await supabase
      .from('settings')
      .update({ exchange_rate_gbp_nzd: rate, exchange_rate_updated_at: new Date().toISOString() })
      .eq('id', settings.id)
      .select()
      .single<Settings>()
    if (data) setSettings(data)
  }

  async function toggleAutoFetch(enabled: boolean) {
    if (!settings) return
    const { data } = await supabase
      .from('settings')
      .update({ exchange_rate_auto_fetch: enabled })
      .eq('id', settings.id)
      .select()
      .single<Settings>()
    if (data) setSettings(data)

    if (enabled) {
      await fetchRate()
    }
  }

  async function fetchRate() {
    if (!settings) return
    setFetching(true)
    setFetchError(false)
    try {
      const res = await fetch('/api/exchange-rate')
      const json = await res.json()
      if (json.rate) {
        setRateInput(Number(json.rate).toFixed(6))
        // Reload settings to get updated timestamp
        const { data } = await supabase
          .from('settings')
          .select('*')
          .single<Settings>()
        if (data) setSettings(data)
      } else {
        setFetchError(true)
      }
    } catch {
      setFetchError(true)
    } finally {
      setFetching(false)
    }
  }

  const lastUpdated = settings?.exchange_rate_updated_at
    ? format(new Date(settings.exchange_rate_updated_at), 'd MMM yyyy, HH:mm')
    : 'Never'

  return (
    <div className="min-h-screen bg-[#f2f2f7]">
      <div className="max-w-md mx-auto pt-6 pb-12 px-5">
        <button
          onClick={() => router.back()}
          className="inline-flex items-center gap-1 text-[15px] text-black/45 hover:text-black/70 transition-colors mb-6"
        >
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <path d="M9 3L5 7L9 11" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          Settings
        </button>

        <h1 className="text-[28px] font-bold tracking-[-0.5px] text-[#1c1c1e] mb-6">
          Exchange Rate
        </h1>

        {/* Manual rate input */}
        <div className="rounded-[14px] overflow-hidden border border-black/[0.06] bg-white mb-4">
          <div className="px-4 py-4">
            <p className="text-[12px] font-semibold uppercase tracking-[0.08em] text-black/35 mb-3">
              Rate
            </p>
            <div className="flex items-center gap-3">
              <span className="text-[16px] font-medium text-[#1c1c1e] shrink-0">1 GBP =</span>
              <input
                type="number"
                step="0.000001"
                min="0"
                value={rateInput}
                onChange={(e) => setRateInput(e.target.value)}
                className="flex-1 text-[24px] font-semibold text-[#1c1c1e] bg-transparent border-b-2 border-black/15 focus:border-black/40 outline-none text-right pb-1 transition-colors"
              />
              <span className="text-[16px] font-medium text-[#1c1c1e] shrink-0">NZD</span>
            </div>
          </div>
        </div>

        {/* Auto-fetch */}
        <div className="rounded-[14px] overflow-hidden border border-black/[0.06] bg-white mb-4">
          <div className="flex items-center justify-between px-4 h-[52px] border-b border-black/[0.05]">
            <span className="text-[16px] font-medium text-[#1c1c1e]">Auto-fetch daily</span>
            <Toggle
              checked={settings?.exchange_rate_auto_fetch ?? false}
              onChange={toggleAutoFetch}
            />
          </div>
          <div className="px-4 py-3">
            <p className="text-[13px] text-black/35">
              Uses frankfurter.app free API · fetches once per day
            </p>
          </div>
        </div>

        {fetchError && (
          <p className="text-[13px] text-orange-500 text-center mb-3">
            Auto-fetch failed — using stored rate
          </p>
        )}

        {/* Last updated + fetch button */}
        <p className="text-[13px] text-black/35 text-center mb-6">
          Last updated: {lastUpdated}
        </p>

        <button
          onClick={fetchRate}
          disabled={fetching}
          className="w-full h-[44px] rounded-xl bg-black/[0.05] text-[15px] font-medium text-[#1c1c1e] hover:bg-black/[0.08] transition-colors disabled:opacity-50 mb-3"
        >
          {fetching ? 'Fetching…' : 'Fetch Current Rate'}
        </button>

        <button
          onClick={saveRate}
          className="w-full h-[44px] rounded-xl bg-[#1c1c1e] text-[15px] font-medium text-white hover:bg-black/90 transition-colors"
        >
          Save Rate
        </button>
      </div>
    </div>
  )
}
