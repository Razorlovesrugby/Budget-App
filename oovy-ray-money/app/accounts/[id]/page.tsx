import { createSupabaseServerClient } from '@/lib/supabase/server'
import { notFound, redirect } from 'next/navigation'
import type {
  Account,
  Transaction,
  RecurringSchedule,
  RecurringSkip,
  RecurringOverride,
} from '@/types'
import { fromDecimal } from '@/lib/utils/money'
import { calculateBudget } from '@/lib/forecast/engine'
import AccountDetailClient from '@/components/accounts/AccountDetailClient'

export default async function AccountDetailPage({
  params,
}: {
  params: { id: string }
}) {
  const supabase = createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  // Fetch account
  const { data: account } = await supabase
    .from('accounts')
    .select('*')
    .eq('id', params.id)
    .single<Account>()

  if (!account) notFound()

  // Fetch transactions for this account
  const { data: transactions } = await supabase
    .from('transactions')
    .select('*')
    .or(`from_account_id.eq.${params.id},to_account_id.eq.${params.id}`)
    .order('transaction_date')
    .returns<Transaction[]>()

  // Fetch recurring schedules
  const { data: schedules } = await supabase
    .from('recurring_schedules')
    .select('*')
    .eq('is_active', true)
    .or(`from_account_id.eq.${params.id},to_account_id.eq.${params.id}`)
    .returns<RecurringSchedule[]>()

  const { data: skips } = await supabase
    .from('recurring_skips')
    .select('*')
    .returns<RecurringSkip[]>()

  const { data: overrides } = await supabase
    .from('recurring_overrides')
    .select('*')
    .returns<RecurringOverride[]>()

  // Fetch ALL schedules and transactions for budget calculation
  const { data: allSchedules } = await supabase
    .from('recurring_schedules')
    .select('*')
    .eq('is_active', true)
    .returns<RecurringSchedule[]>()

  const { data: allTransactions } = await supabase
    .from('transactions')
    .select('*')
    .returns<Transaction[]>()

  // Calculate budget at today
  const today = new Date()
  const budgetToday = calculateBudget(
    account,
    today,
    allTransactions ?? [],
    allSchedules ?? [],
    skips ?? [],
    overrides ?? []
  )

  // Placeholder: actual = opening_balance
  const actualBalance = account.opening_balance

  // Fetch counterparty account names
  const { data: allAccounts } = await supabase
    .from('accounts')
    .select('id, name')
    .returns<{ id: string; name: string }[]>()

  const accountNames = new Map<string, string>()
  if (allAccounts) {
    for (const a of allAccounts) {
      accountNames.set(a.id, a.name)
    }
  }

  return (
    <AccountDetailClient
      account={account}
      actualBalance={actualBalance}
      budgetBalanceToday={fromDecimal(budgetToday)}
      transactions={transactions ?? []}
      schedules={schedules ?? []}
      skips={skips ?? []}
      overrides={overrides ?? []}
      accountNames={accountNames}
      allTransactions={allTransactions ?? []}
      allSchedules={allSchedules ?? []}
    />
  )
}
