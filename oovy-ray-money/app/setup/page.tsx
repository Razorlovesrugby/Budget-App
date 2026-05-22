'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { format, addYears } from 'date-fns'
import { createSupabaseBrowserClient } from '@/lib/supabase/client'
import type { Settings } from '@/types'

type Step = 1 | 2 | 3

function StepDots({ current }: { current: Step }) {
  return (
    <div className="flex justify-center gap-2 mt-8">
      {([1, 2, 3] as Step[]).map((s) => (
        <div
          key={s}
          className={`w-2 h-2 rounded-full transition-colors ${
            s === current ? 'bg-[#1c1c1e]' : 'bg-black/15'
          }`}
        />
      ))}
    </div>
  )
}

export default function SetupPage() {
  const router = useRouter()
  const supabase = createSupabaseBrowserClient()
  const [step, setStep] = useState<Step>(1)
  const [settings, setSettings] = useState<Settings | null>(null)
  const [targetDate, setTargetDate] = useState('')
  const [rateInput, setRateInput] = useState('')
  const [fetching, setFetching] = useState(false)

  const today = format(new Date(), 'yyyy-MM-dd')
  const maxDate = format(addYears(new Date(), 5), 'yyyy-MM-dd')

  useEffect(() => {
    // If already completed setup, skip to home
    if (typeof window !== 'undefined') {
      if (localStorage.getItem('hasCompletedSetup') === 'true') {
        router.replace('/')
        return
      }
    }
    supabase
      .from('settings')
      .select('*')
      .single<Settings>()
      .then(({ data }) => {
        if (data) {
          setSettings(data)
          setRateInput(Number(data.exchange_rate_gbp_nzd).toFixed(4))
          if (data.summary_target_date) {
            setTargetDate(data.summary_target_date)
          }
        }
      })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function handleSetTargetDate() {
    if (!settings) return
    if (targetDate) {
      await supabase
        .from('settings')
        .update({ summary_target_date: targetDate })
        .eq('id', settings.id)
    }
    setStep(3)
  }

  async function handleSkipTargetDate() {
    setStep(3)
  }

  async function fetchCurrentRate() {
    setFetching(true)
    try {
      const res = await fetch('/api/exchange-rate')
      const json = await res.json()
      if (json.rate) setRateInput(Number(json.rate).toFixed(4))
    } catch {
      // silent
    } finally {
      setFetching(false)
    }
  }

  async function handleComplete() {
    if (!settings) return
    const rate = parseFloat(rateInput)
    if (!isNaN(rate) && rate > 0) {
      await supabase
        .from('settings')
        .update({
          exchange_rate_gbp_nzd: rate,
          exchange_rate_updated_at: new Date().toISOString(),
        })
        .eq('id', settings.id)
    }
    if (typeof window !== 'undefined') {
      localStorage.setItem('hasCompletedSetup', 'true')
    }
    router.replace('/')
  }

  return (
    <div className="min-h-screen bg-[#f2f2f7] flex flex-col items-center justify-center px-8">
      <div className="w-full max-w-sm">

        {/* Step 1: Welcome */}
        {step === 1 && (
          <div className="text-center">
            <h1 className="text-[32px] font-bold tracking-[-1px] text-[#1c1c1e] leading-tight mb-4">
              Oovy &amp; Ray&apos;s Money
            </h1>
            <p className="text-[16px] text-black/50 leading-relaxed mb-10">
              Your cashflow forecasting tool.{'\n'}
              Forward-looking. Manual. No bank feeds.{'\n'}
              No auto-reconciliation.{'\n\n'}
              Let&apos;s set up your forecast.
            </p>
            <button
              onClick={() => setStep(2)}
              className="w-full h-[52px] rounded-[14px] bg-[#1c1c1e] text-white text-[17px] font-semibold hover:bg-black/90 transition-colors"
            >
              Get Started →
            </button>
            <StepDots current={1} />
          </div>
        )}

        {/* Step 2: Set Target Date */}
        {step === 2 && (
          <div className="text-center">
            <h2 className="text-[26px] font-bold tracking-[-0.5px] text-[#1c1c1e] mb-3">
              When are you planning toward?
            </h2>
            <p className="text-[15px] text-black/45 leading-relaxed mb-8">
              Pick a date in the future. Your Budget will project forward to this date.
            </p>
            <input
              type="date"
              value={targetDate}
              min={today}
              max={maxDate}
              onChange={(e) => setTargetDate(e.target.value)}
              className="w-full text-[17px] text-center text-[#1c1c1e] py-4 px-4 rounded-xl border border-black/10 bg-white focus:outline-none focus:ring-2 focus:ring-black/10 appearance-none mb-4"
              style={{ WebkitAppearance: 'none' }}
            />
            <button
              onClick={handleSetTargetDate}
              disabled={!targetDate}
              className="w-full h-[52px] rounded-[14px] bg-[#1c1c1e] text-white text-[17px] font-semibold hover:bg-black/90 transition-colors disabled:opacity-40 mb-3"
            >
              Continue →
            </button>
            <button
              onClick={handleSkipTargetDate}
              className="w-full text-[15px] text-black/35 hover:text-black/55 transition-colors py-2"
            >
              Skip for now
            </button>
            <StepDots current={2} />
          </div>
        )}

        {/* Step 3: Verify Exchange Rate */}
        {step === 3 && (
          <div className="text-center">
            <h2 className="text-[26px] font-bold tracking-[-0.5px] text-[#1c1c1e] mb-3">
              Exchange Rate
            </h2>
            <p className="text-[15px] text-black/45 mb-4">
              The current stored rate is:
            </p>
            <div className="bg-white rounded-[14px] border border-black/[0.06] px-6 py-5 mb-6">
              <p className="text-[22px] font-bold text-[#1c1c1e] mb-4">
                1 GBP = {rateInput} NZD
              </p>
              <div className="flex items-center gap-3">
                <span className="text-[16px] text-[#1c1c1e] flex-1">Update Rate</span>
                <input
                  type="number"
                  step="0.0001"
                  min="0"
                  value={rateInput}
                  onChange={(e) => setRateInput(e.target.value)}
                  className="w-24 text-[16px] font-semibold text-right text-[#1c1c1e] bg-black/[0.03] border border-black/10 rounded-lg px-2 py-1.5 outline-none focus:ring-2 focus:ring-black/10"
                />
              </div>
            </div>
            <button
              onClick={fetchCurrentRate}
              disabled={fetching}
              className="w-full h-[44px] rounded-xl bg-black/[0.05] text-[15px] font-medium text-[#1c1c1e] hover:bg-black/[0.08] transition-colors disabled:opacity-50 mb-3"
            >
              {fetching ? 'Fetching…' : 'Fetch Live Rate'}
            </button>
            <button
              onClick={handleComplete}
              className="w-full h-[52px] rounded-[14px] bg-[#1c1c1e] text-white text-[17px] font-semibold hover:bg-black/90 transition-colors"
            >
              Looks Good →
            </button>
            <StepDots current={3} />
          </div>
        )}

      </div>
    </div>
  )
}
