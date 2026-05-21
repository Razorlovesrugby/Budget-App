// ─── Enums ───────────────────────────────────────────────────────────────────
// These match the PostgreSQL enum types in the database exactly.

export type AccountType = 'CURRENT' | 'SAVINGS' | 'CREDIT' | 'DEBT' | 'TRACKING' | 'EXTERNAL'
export type Currency = 'GBP' | 'NZD'
export type TransactionType = 'TRANSFER' | 'RECURRING_INSTANCE' | 'ONE_OFF' | 'ADJUSTMENT' | 'OPENING'
export type Frequency = 'WEEKLY' | 'FORTNIGHTLY' | 'MONTHLY' | 'QUARTERLY' | 'BIANNUAL'

// ─── Database Row Types ───────────────────────────────────────────────────────
// DECIMAL(12,2) columns are typed as number here (how Postgres returns them).
// IMPORTANT: Always wrap money values in new Decimal() before any arithmetic.
// Never do raw JS math on these fields.

export interface Account {
  id: string
  name: string
  type: AccountType
  currency: Currency
  include_in_cash_balance: boolean
  include_in_review: boolean
  opening_balance: number       // DECIMAL(12,2) — wrap in new Decimal() before use
  opening_date: string          // DATE as ISO string
  display_order: number
  color_from: string
  color_to: string
  is_archived: boolean
  is_system: boolean
  created_at: string
  updated_at: string
}

export interface RecurringSchedule {
  id: string
  name: string | null
  from_account_id: string
  to_account_id: string
  currency_from: Currency
  currency_to: Currency
  frequency: Frequency
  day_of_week: number | null    // 0=Sun, 6=Sat — only set for WEEKLY
  day_of_month: number | null   // 1–31 — only set for MONTHLY etc.
  weekday_only: boolean
  start_date: string
  end_date: string | null
  effective_changes: EffectiveChange[]  // JSONB
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface RecurringSkip {
  id: string
  recurring_id: string
  skip_date: string
  created_at: string
}

export interface RecurringOverride {
  id: string
  recurring_id: string
  original_date: string
  override_date: string
  amount_from: number           // DECIMAL(12,2) — wrap in new Decimal() before use
  amount_to: number             // DECIMAL(12,2) — wrap in new Decimal() before use
  name: string | null
  created_at: string
}

export interface Transaction {
  id: string
  name: string | null
  type: TransactionType
  from_account_id: string
  to_account_id: string
  amount_from: number           // DECIMAL(12,2) — wrap in new Decimal() before use
  amount_to: number             // DECIMAL(12,2) — wrap in new Decimal() before use
  currency_from: Currency
  currency_to: Currency
  transaction_date: string
  recurring_id: string | null
  is_adjustment: boolean
  note: string | null
  created_at: string
  updated_at: string
}

export interface Review {
  id: string
  review_date: string
  created_at: string
}

export interface ReviewEntry {
  id: string
  review_id: string
  account_id: string
  actual_balance: number | null // DECIMAL(12,2) — wrap in new Decimal() before use
  budget_balance: number        // DECIMAL(12,2) — wrap in new Decimal() before use
  variance: number | null       // DECIMAL(12,2) — wrap in new Decimal() before use
  was_skipped: boolean
  created_at: string
}

export interface Settings {
  id: string
  summary_target_date: string | null
  budget_comparison_date: string | null
  exchange_rate_gbp_nzd: number  // DECIMAL(10,6)
  exchange_rate_auto_fetch: boolean
  exchange_rate_updated_at: string | null
  created_at: string
  updated_at: string
}

// ─── Insert Types ─────────────────────────────────────────────────────────────
// Use these when creating new records — omit server-generated fields.

export type NewAccount = Omit<Account, 'id' | 'created_at' | 'updated_at'>
export type NewRecurringSchedule = Omit<RecurringSchedule, 'id' | 'created_at' | 'updated_at'>
export type NewRecurringSkip = Omit<RecurringSkip, 'id' | 'created_at'>
export type NewRecurringOverride = Omit<RecurringOverride, 'id' | 'created_at'>
export type NewTransaction = Omit<Transaction, 'id' | 'created_at' | 'updated_at'>
export type NewReview = Omit<Review, 'id' | 'created_at'>
export type NewReviewEntry = Omit<ReviewEntry, 'id' | 'created_at'>
export type NewSettings = Omit<Settings, 'id' | 'created_at' | 'updated_at'>

// ─── Form Data Types ──────────────────────────────────────────────────────────

export interface RecurringFormData {
  name: string | null
  from_account_id: string
  to_account_id: string
  amount: number
  to_amount: number | null
  currency_from: Currency
  currency_to: Currency
  frequency: Frequency
  day_of_week: number | null
  day_of_month: number | null
  weekday_only: boolean
  start_date: string
}

// ─── JSONB Subtypes ───────────────────────────────────────────────────────────

export interface EffectiveChange {
  effective_from: string        // DATE — when this amount version takes effect
  amount_from: number           // DECIMAL(12,2)
  amount_to: number             // DECIMAL(12,2)
}

// ─── Forecast Engine Interfaces ───────────────────────────────────────────────
// From oovy-ray-technical-stack-spec.md §4.2

export type TimelineSource = 'stored' | 'generated'

export interface DailyBalance {
  date: Date
  balance: number               // Always wrap in new Decimal() before arithmetic
  transactions: Transaction[]   // Transactions on this specific date
}

export interface GridData {
  dates: Date[]
  accounts: Account[]
  balances: Map<string, Map<string, number>>  // accountId → dateISO → balance
}

// The forecast engine interface — implemented in /lib/forecast/engine.ts
export interface ForecastEngine {
  getBudget(accountId: string, date: Date): Promise<number>
  getAllBudgets(date: Date): Promise<Map<string, number>>
  getTimeline(accountId: string, startDate: Date, endDate: Date): Promise<DailyBalance[]>
  getGrid(startDate: Date, endDate: Date): Promise<GridData>
}
