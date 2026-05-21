/**
 * Seed script: accounts + settings
 * Run: npm run seed:accounts
 * Idempotent — safe to run multiple times.
 * Uses service role key to bypass RLS.
 */

import { createClient } from '@supabase/supabase-js'
import type { NewAccount } from '../types/index'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
)

// ─── EXTERNAL system account ──────────────────────────────────────────────────
const EXTERNAL_ACCOUNT: NewAccount = {
  // Fixed UUID — referenced throughout the codebase
  name: 'External',
  type: 'EXTERNAL',
  currency: 'GBP',
  include_in_cash_balance: false,
  include_in_review: false,
  opening_balance: 0.00,
  opening_date: new Date().toISOString().split('T')[0],
  display_order: 999,
  color_from: '#000000',
  color_to: '#000000',
  is_archived: false,
  is_system: true,
}

const EXTERNAL_UUID = '00000000-0000-0000-0000-000000000001'

// ─── 15 User accounts ─────────────────────────────────────────────────────────
// From oovy-ray-migration-and-phases-spec.md §A.2.2
const USER_ACCOUNTS: Array<NewAccount & { _name: string }> = [
  { _name: 'Monzo General',         type: 'CURRENT',  currency: 'GBP', include_in_cash_balance: true,  include_in_review: true,  color_from: '#1a1a2e', color_to: '#0f3460', display_order: 1,  opening_balance: 0, opening_date: new Date().toISOString().split('T')[0], is_archived: false, is_system: false, name: 'Monzo General' },
  { _name: 'Monzo Spending',         type: 'CURRENT',  currency: 'GBP', include_in_cash_balance: true,  include_in_review: true,  color_from: '#2d1b69', color_to: '#11998e', display_order: 2,  opening_balance: 0, opening_date: new Date().toISOString().split('T')[0], is_archived: false, is_system: false, name: 'Monzo Spending' },
  { _name: 'Monzo Bills',            type: 'CURRENT',  currency: 'GBP', include_in_cash_balance: true,  include_in_review: true,  color_from: '#1a1a1a', color_to: '#2d2d2d', display_order: 3,  opening_balance: 0, opening_date: new Date().toISOString().split('T')[0], is_archived: false, is_system: false, name: 'Monzo Bills' },
  { _name: 'Monzo Rent + Expenses',  type: 'CURRENT',  currency: 'GBP', include_in_cash_balance: true,  include_in_review: true,  color_from: '#4a1942', color_to: '#c74b50', display_order: 4,  opening_balance: 0, opening_date: new Date().toISOString().split('T')[0], is_archived: false, is_system: false, name: 'Monzo Rent + Expenses' },
  { _name: 'Monzo Savings',          type: 'SAVINGS',  currency: 'GBP', include_in_cash_balance: true,  include_in_review: true,  color_from: '#0d4f2f', color_to: '#1a8a4a', display_order: 5,  opening_balance: 0, opening_date: new Date().toISOString().split('T')[0], is_archived: false, is_system: false, name: 'Monzo Savings' },
  { _name: 'Rent Deposit',           type: 'SAVINGS',  currency: 'GBP', include_in_cash_balance: true,  include_in_review: true,  color_from: '#1b4332', color_to: '#40916c', display_order: 6,  opening_balance: 0, opening_date: new Date().toISOString().split('T')[0], is_archived: false, is_system: false, name: 'Rent Deposit' },
  { _name: 'Monzo NZ House',         type: 'CURRENT',  currency: 'GBP', include_in_cash_balance: true,  include_in_review: true,  color_from: '#1a237e', color_to: '#283593', display_order: 7,  opening_balance: 0, opening_date: new Date().toISOString().split('T')[0], is_archived: false, is_system: false, name: 'Monzo NZ House' },
  { _name: 'Monzo Student Loan',     type: 'TRACKING', currency: 'GBP', include_in_cash_balance: true,  include_in_review: false, color_from: '#3e2723', color_to: '#6d4c41', display_order: 8,  opening_balance: 0, opening_date: new Date().toISOString().split('T')[0], is_archived: false, is_system: false, name: 'Monzo Student Loan' },
  { _name: 'Ray Revolut',            type: 'CURRENT',  currency: 'GBP', include_in_cash_balance: true,  include_in_review: true,  color_from: '#1a237e', color_to: '#4527a0', display_order: 9,  opening_balance: 0, opening_date: new Date().toISOString().split('T')[0], is_archived: false, is_system: false, name: 'Ray Revolut' },
  { _name: 'Olivia Revolut',         type: 'CURRENT',  currency: 'NZD', include_in_cash_balance: true,  include_in_review: true,  color_from: '#004d40', color_to: '#00695c', display_order: 10, opening_balance: 0, opening_date: new Date().toISOString().split('T')[0], is_archived: false, is_system: false, name: 'Olivia Revolut' },
  { _name: 'NZ Savings',             type: 'SAVINGS',  currency: 'NZD', include_in_cash_balance: true,  include_in_review: true,  color_from: '#1b5e20', color_to: '#2e7d32', display_order: 11, opening_balance: 0, opening_date: new Date().toISOString().split('T')[0], is_archived: false, is_system: false, name: 'NZ Savings' },
  { _name: 'NZ Credit Card',         type: 'CREDIT',   currency: 'NZD', include_in_cash_balance: true,  include_in_review: true,  color_from: '#b71c1c', color_to: '#c62828', display_order: 12, opening_balance: 0, opening_date: new Date().toISOString().split('T')[0], is_archived: false, is_system: false, name: 'NZ Credit Card' },
  { _name: 'NZ House',               type: 'CURRENT',  currency: 'NZD', include_in_cash_balance: true,  include_in_review: true,  color_from: '#37474f', color_to: '#546e7a', display_order: 13, opening_balance: 0, opening_date: new Date().toISOString().split('T')[0], is_archived: false, is_system: false, name: 'NZ House' },
  { _name: 'Olivia Owed',            type: 'DEBT',     currency: 'GBP', include_in_cash_balance: true,  include_in_review: true,  color_from: '#e65100', color_to: '#bf360c', display_order: 14, opening_balance: 0, opening_date: new Date().toISOString().split('T')[0], is_archived: false, is_system: false, name: 'Olivia Owed' },
  { _name: 'Ray Owed',               type: 'DEBT',     currency: 'GBP', include_in_cash_balance: true,  include_in_review: true,  color_from: '#880e4f', color_to: '#ad1457', display_order: 15, opening_balance: 0, opening_date: new Date().toISOString().split('T')[0], is_archived: false, is_system: false, name: 'Ray Owed' },
]

async function seed() {
  console.log('Starting seed...\n')

  // ── 1. EXTERNAL account ──
  const { error: extError } = await supabase
    .from('accounts')
    .upsert({ id: EXTERNAL_UUID, ...EXTERNAL_ACCOUNT }, { onConflict: 'id' })

  if (extError) {
    console.error('Failed to seed EXTERNAL account:', extError.message)
    process.exit(1)
  }
  console.log('✓ EXTERNAL system account')

  // ── 2. 15 user accounts ──
  for (const account of USER_ACCOUNTS) {
    const { _name, ...accountData } = account

    // Check if exists by name (idempotent)
    const { data: existing } = await supabase
      .from('accounts')
      .select('id')
      .eq('name', accountData.name)
      .eq('is_system', false)
      .single()

    if (existing) {
      console.log(`  (skip) ${accountData.name} — already exists`)
      continue
    }

    const { error } = await supabase.from('accounts').insert(accountData)
    if (error) {
      console.error(`Failed to seed ${accountData.name}:`, error.message)
      process.exit(1)
    }
    console.log(`✓ ${accountData.name}`)
  }

  // ── 3. Settings row ──
  const { data: existingSettings } = await supabase
    .from('settings')
    .select('id')
    .limit(1)
    .single()

  if (existingSettings) {
    console.log('\n(skip) Settings row — already exists')
  } else {
    const { error: settingsError } = await supabase.from('settings').insert({
      exchange_rate_gbp_nzd: 2.220000,
      exchange_rate_auto_fetch: false,
      summary_target_date: null,
      budget_comparison_date: null,
    })
    if (settingsError) {
      console.error('Failed to seed settings:', settingsError.message)
      process.exit(1)
    }
    console.log('\n✓ Settings row (exchange rate: 2.22 GBP/NZD)')
  }

  console.log('\nSeed complete.')
}

seed().catch((err) => {
  console.error('Fatal:', err)
  process.exit(1)
})
