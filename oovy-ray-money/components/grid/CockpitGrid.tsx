'use client'

import {
  useState,
  useEffect,
  useMemo,
  useCallback,
  useRef,
  memo,
} from 'react'
import { useVirtualizer } from '@tanstack/react-virtual'
import {
  addMonths,
  addDays,
  isAfter,
  isBefore,
  isSameDay,
  startOfDay,
} from 'date-fns'
import { createSupabaseBrowserClient } from '@/lib/supabase/client'
import { toDateString } from '@/lib/utils/dates'
import { toDecimal } from '@/lib/utils/money'
import { getGrid } from '@/lib/forecast/engine'
import { useForecastStore } from '@/hooks/useForecast'
import type {
  Account,
  Transaction,
  RecurringSchedule,
  RecurringSkip,
  RecurringOverride,
  Settings,
  Currency,
} from '@/types'

import { GRID, formatCellAmount } from './GridCell'
import { GridRow } from './GridRow'
import { GridBottomBar } from './GridBottomBar'
import { CurrencyFilter } from './CurrencyFilter'
import { GridAddTransactionPanel } from '@/components/transactions/GridAddTransactionPanel'
import { TransactionDetailPanel } from '@/components/transactions/TransactionDetailPanel'
import { AddAccountPanel } from '@/components/accounts/AddAccountPanel'
import DatePicker from '@/components/ui/DatePicker'
import Decimal from 'decimal.js'

// ─── Constants ────────────────────────────────────────────────────────────────

const GRID_START = new Date('2024-08-01')

// ─── Types ────────────────────────────────────────────────────────────────────

type PanelState =
  | { type: 'none' }
  | { type: 'addTransaction'; accountId: string; date: Date }
  | { type: 'transactionDetail'; transaction: Transaction; readOnly: boolean }
  | { type: 'addAccount' }

interface CockpitGridProps {
  initialAccounts: Account[]
  settings: Settings
}

// ─── Header account cell ──────────────────────────────────────────────────────

const HeaderCell = memo(function HeaderCell({ account }: { account: Account }) {
  const currencyLabel = account.currency === 'GBP' ? 'GBP £' : 'NZD NZ$'
  return (
    <div
      className="flex flex-col items-start justify-center px-3 border-r border-black/[0.06] shrink-0"
      style={{
        width: GRID.ACCOUNT_COL_WIDTH,
        height: GRID.HEADER_HEIGHT,
        background: `linear-gradient(135deg, ${account.color_from}18 0%, ${account.color_to}12 100%)`,
        borderTop: `3px solid ${account.color_from}60`,
      }}
    >
      <span className="text-[11px] font-semibold text-[#1c1c1e] leading-tight truncate w-full">
        {account.name}
      </span>
      <span className="text-[9px] font-medium text-black/30 uppercase tracking-wide mt-0.5">
        {currencyLabel}
      </span>
    </div>
  )
})

// ─── Main component ───────────────────────────────────────────────────────────

export function CockpitGrid({ initialAccounts, settings }: CockpitGridProps) {
  const supabase = createSupabaseBrowserClient()
  const forecastVersion = useForecastStore((s) => s.version)
  const invalidate = useForecastStore((s) => s.invalidate)

  // Data
  const [accounts, setAccounts] = useState<Account[]>(initialAccounts)
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [schedules, setSchedules] = useState<RecurringSchedule[]>([])
  const [skips, setSkips] = useState<RecurringSkip[]>([])
  const [overrides, setOverrides] = useState<RecurringOverride[]>([])

  // UI
  const [activeCurrencies, setActiveCurrencies] = useState<Set<Currency>>(new Set<Currency>(['GBP', 'NZD']))
  const [panel, setPanel] = useState<PanelState>({ type: 'none' })
  const [highlightedDate, setHighlightedDate] = useState<Date | null>(null)
  const [showDateJumper, setShowDateJumper] = useState(false)

  // Refs
  const bodyRef = useRef<HTMLDivElement>(null)
  const headerAccountsRef = useRef<HTMLDivElement>(null)
  const todayScrolledRef = useRef(false)

  // Date range
  const today = useMemo(() => startOfDay(new Date()), [])
  const gridEnd = useMemo(() => addMonths(today, 18), [today])

  const dateRange = useMemo(() => {
    const dates: Date[] = []
    let d = GRID_START
    while (!isAfter(d, gridEnd)) {
      dates.push(d)
      d = addDays(d, 1)
    }
    return dates
  }, [gridEnd])

  // Virtualizer
  const virtualizer = useVirtualizer({
    count: dateRange.length,
    getScrollElement: () => bodyRef.current,
    estimateSize: () => GRID.ROW_HEIGHT,
    overscan: 12,
  })

  // Fetch all data on mount and on forecast version change
  useEffect(() => {
    async function fetchData() {
      const [accRes, txRes, schedRes, skipRes, ovRes] = await Promise.all([
        supabase
          .from('accounts')
          .select('*')
          .eq('is_archived', false)
          .eq('is_system', false)
          .order('display_order')
          .returns<Account[]>(),
        supabase.from('transactions').select('*').returns<Transaction[]>(),
        supabase
          .from('recurring_schedules')
          .select('*')
          .eq('is_active', true)
          .returns<RecurringSchedule[]>(),
        supabase.from('recurring_skips').select('*').returns<RecurringSkip[]>(),
        supabase.from('recurring_overrides').select('*').returns<RecurringOverride[]>(),
      ])
      if (accRes.data) setAccounts(accRes.data)
      if (txRes.data) setTransactions(txRes.data)
      if (schedRes.data) setSchedules(schedRes.data)
      if (skipRes.data) setSkips(skipRes.data)
      if (ovRes.data) setOverrides(ovRes.data)
    }
    fetchData()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [forecastVersion])

  // Scroll to today on first mount
  useEffect(() => {
    if (todayScrolledRef.current) return
    const todayIdx = dateRange.findIndex((d) => isSameDay(d, today))
    if (todayIdx >= 0) {
      virtualizer.scrollToIndex(todayIdx, { align: 'center' })
      todayScrolledRef.current = true
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dateRange, today])

  // Sync header horizontal scroll with body
  useEffect(() => {
    const body = bodyRef.current
    const headerAccounts = headerAccountsRef.current
    if (!body || !headerAccounts) return

    const onScroll = () => {
      headerAccounts.style.transform = `translateX(-${body.scrollLeft}px)`
    }

    body.addEventListener('scroll', onScroll, { passive: true })
    return () => body.removeEventListener('scroll', onScroll)
  }, [])

  // Computed: visible accounts
  const visibleAccounts = useMemo(
    () => accounts.filter((a) => activeCurrencies.has(a.currency)),
    [accounts, activeCurrencies]
  )

  // Computed: grid data
  const gridData = useMemo(() => {
    return getGrid(accounts, GRID_START, gridEnd, transactions, schedules, skips, overrides)
  }, [accounts, gridEnd, transactions, schedules, skips, overrides])

  // Computed: transaction lookup (for cell indicators)
  const txLookup = useMemo(() => {
    const lookup = new Map<string, Set<string>>()
    for (const tx of transactions) {
      if (tx.type === 'OPENING') continue
      for (const accId of [tx.from_account_id, tx.to_account_id]) {
        if (!lookup.has(accId)) lookup.set(accId, new Set())
        lookup.get(accId)!.add(tx.transaction_date)
      }
    }
    return lookup
  }, [transactions])

  // Computed: totals for bottom bar (today's balances)
  const { gbpTotal, nzdTotal, lastReviewDate } = useMemo(() => {
    const todayISO = toDateString(today)
    let gbp = new Decimal(0)
    let nzd = new Decimal(0)

    for (const acc of accounts) {
      if (!acc.include_in_cash_balance) continue
      const bal = gridData.balances.get(acc.id)?.get(todayISO) ?? acc.opening_balance
      if (acc.currency === 'GBP') gbp = gbp.plus(toDecimal(bal))
      else nzd = nzd.plus(toDecimal(bal))
    }

    return { gbpTotal: gbp, nzdTotal: nzd, lastReviewDate: null as string | null }
  }, [accounts, gridData, today])

  // Computed: total grid width
  const totalWidth =
    GRID.DATE_COL_WIDTH + visibleAccounts.length * GRID.ACCOUNT_COL_WIDTH + GRID.ADD_COL_WIDTH

  // Cell tap handler
  const handleCellTap = useCallback(
    (accountId: string, date: Date, hasTransaction: boolean) => {
      const isPast = isBefore(startOfDay(date), today)

      if (hasTransaction || isPast) {
        const dateISO = toDateString(date)
        const tx = transactions.find(
          (t) =>
            (t.from_account_id === accountId || t.to_account_id === accountId) &&
            t.transaction_date === dateISO &&
            t.type !== 'OPENING'
        )
        if (tx) {
          setPanel({ type: 'transactionDetail', transaction: tx, readOnly: isPast })
        }
      } else {
        setPanel({ type: 'addTransaction', accountId, date })
      }
    },
    [transactions, today]
  )

  // Currency toggle
  const handleCurrencyToggle = useCallback((currency: Currency) => {
    setActiveCurrencies((prev) => {
      if (prev.has(currency) && prev.size === 1) return prev
      const next = new Set(prev)
      if (next.has(currency)) next.delete(currency)
      else next.add(currency)
      return next
    })
  }, [])

  const handleShowAll = useCallback(() => {
    setActiveCurrencies(new Set<Currency>(['GBP', 'NZD']))
  }, [])

  // Jump to date
  const handleJumpToDate = useCallback(
    (date: Date) => {
      const idx = dateRange.findIndex((d) => isSameDay(d, date))
      if (idx >= 0) {
        virtualizer.scrollToIndex(idx, { align: 'center' })
        setHighlightedDate(date)
        setTimeout(() => setHighlightedDate(null), 2000)
      }
      setShowDateJumper(false)
    },
    [dateRange, virtualizer]
  )

  const handlePanelSuccess = useCallback(() => {
    setPanel({ type: 'none' })
    invalidate()
  }, [invalidate])

  const virtualItems = virtualizer.getVirtualItems()

  return (
    <div className="h-screen flex flex-col bg-[#f2f2f7] overflow-hidden">
      {/* ── Top Bar ── */}
      <div
        className="shrink-0 flex items-center gap-3 px-4 border-b border-black/[0.08]"
        style={{
          height: GRID.TOP_BAR_HEIGHT,
          background: 'rgba(255,255,255,0.97)',
          backdropFilter: 'blur(12px)',
        }}
      >
        {/* App name */}
        <span className="text-[15px] font-bold text-[#1c1c1e] shrink-0 hidden lg:inline">
          Oovy &amp; Ray&apos;s Money
        </span>
        <span className="text-[15px] font-bold text-[#1c1c1e] shrink-0 lg:hidden">O&amp;R</span>

        {/* Currency filter */}
        <CurrencyFilter
          activeCurrencies={activeCurrencies}
          onToggle={handleCurrencyToggle}
          onAll={handleShowAll}
        />

        {/* Jump to date */}
        <button
          onClick={() => setShowDateJumper(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-black/[0.05] hover:bg-black/[0.08] transition-colors text-[12px] font-semibold text-black/50"
        >
          <span>📅</span>
          <span className="hidden lg:inline">Jump</span>
        </button>

        <div className="flex-1" />

        {/* Totals */}
        <div className="flex items-center gap-3 shrink-0">
          <div className="text-right">
            <p className="text-[9px] font-semibold uppercase tracking-wide text-black/25">GBP</p>
            <p className="text-[13px] font-semibold tabular-nums text-[#1c1c1e]">
              {formatCellAmount(gbpTotal.toNumber(), 'GBP')}
            </p>
          </div>
          <div className="text-right">
            <p className="text-[9px] font-semibold uppercase tracking-wide text-black/25">NZD</p>
            <p className="text-[13px] font-semibold tabular-nums text-[#1c1c1e]">
              {formatCellAmount(nzdTotal.toNumber(), 'NZD')}
            </p>
          </div>
        </div>

        {/* Actions */}
        <button
          onClick={() => setPanel({ type: 'addTransaction', accountId: '', date: today })}
          className="w-8 h-8 rounded-full bg-black/[0.06] flex items-center justify-center text-[#1c1c1e] text-lg font-medium hover:bg-black/[0.10] transition-colors"
        >
          +
        </button>
        <button className="w-8 h-8 rounded-full bg-black/[0.06] flex items-center justify-center text-[#1c1c1e] hover:bg-black/[0.10] transition-colors">
          ⋯
        </button>
      </div>

      {/* ── Grid Area ── */}
      <div className="flex-1 flex flex-col min-h-0">
        {/* Frozen header row */}
        <div
          className="shrink-0 relative overflow-hidden"
          style={{
            height: GRID.HEADER_HEIGHT,
            background: 'rgba(255,255,255,0.97)',
            backdropFilter: 'blur(10px)',
            borderBottom: '1px solid rgba(0,0,0,0.08)',
            zIndex: 20,
          }}
        >
          {/* Corner cell */}
          <div
            className="absolute left-0 top-0 flex items-center px-3"
            style={{
              width: GRID.DATE_COL_WIDTH,
              height: GRID.HEADER_HEIGHT,
              background: 'rgba(255,255,255,0.97)',
              zIndex: 1,
              borderRight: '1px solid rgba(0,0,0,0.08)',
            }}
          >
            <span className="text-[10px] font-semibold text-black/25 uppercase tracking-wider">
              Date
            </span>
          </div>

          {/* Account headers (translate on horizontal scroll) */}
          <div
            ref={headerAccountsRef}
            className="absolute flex"
            style={{ left: GRID.DATE_COL_WIDTH, top: 0, height: GRID.HEADER_HEIGHT }}
          >
            {visibleAccounts.map((account) => (
              <HeaderCell key={account.id} account={account} />
            ))}
            {/* Add account button */}
            <button
              onClick={() => setPanel({ type: 'addAccount' })}
              className="flex items-center justify-center border-l border-black/[0.06] hover:bg-black/[0.03] transition-colors text-black/20 hover:text-black/50"
              style={{ width: GRID.ADD_COL_WIDTH, height: GRID.HEADER_HEIGHT }}
            >
              <span className="text-[20px] font-light leading-none">+</span>
            </button>
          </div>
        </div>

        {/* Scrollable body */}
        <div
          ref={bodyRef}
          className="flex-1 min-h-0 overflow-auto bg-white"
          style={{ overscrollBehavior: 'none' }}
        >
          <div
            style={{
              width: totalWidth,
              height: virtualizer.getTotalSize(),
              position: 'relative',
            }}
          >
            {virtualItems.map((vRow) => {
              const date = dateRange[vRow.index]
              const isHighlighted = highlightedDate ? isSameDay(date, highlightedDate) : false

              return (
                <div
                  key={vRow.key}
                  style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    width: '100%',
                    height: vRow.size,
                    transform: `translateY(${vRow.start}px)`,
                  }}
                >
                  <GridRow
                    date={date}
                    today={today}
                    accounts={visibleAccounts}
                    balances={gridData.balances}
                    txLookup={txLookup}
                    isHighlighted={isHighlighted}
                    onCellTap={handleCellTap}
                  />
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {/* ── Bottom Bar ── */}
      <GridBottomBar
        gbpTotal={gbpTotal}
        nzdTotal={nzdTotal}
        settings={settings}
        lastReviewDate={lastReviewDate}
      />

      {/* ── Panels ── */}
      {panel.type === 'addTransaction' && (
        <GridAddTransactionPanel
          accounts={accounts}
          prefilledAccountId={panel.accountId}
          prefilledDate={panel.date}
          onClose={() => setPanel({ type: 'none' })}
          onSuccess={handlePanelSuccess}
        />
      )}

      {panel.type === 'transactionDetail' && (
        <TransactionDetailPanel
          transaction={panel.transaction}
          accounts={accounts}
          schedules={schedules}
          readOnly={panel.readOnly}
          onClose={() => setPanel({ type: 'none' })}
          onSave={handlePanelSuccess}
          onDelete={handlePanelSuccess}
        />
      )}

      {panel.type === 'addAccount' && (
        <AddAccountPanel
          onClose={() => setPanel({ type: 'none' })}
          onSuccess={handlePanelSuccess}
        />
      )}

      {/* ── Date Jumper ── */}
      {showDateJumper && (
        <DatePicker
          value={today}
          onChange={handleJumpToDate}
          onClose={() => setShowDateJumper(false)}
          minDate={GRID_START}
          maxDate={gridEnd}
        />
      )}
    </div>
  )
}
