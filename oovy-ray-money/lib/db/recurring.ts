import { createSupabaseBrowserClient } from '@/lib/supabase/client'
import type { RecurringSchedule, RecurringFormData, EffectiveChange } from '@/types'

// ─── Read Operations ─────────────────────────────────────────────────────────

export async function getRecurringSchedules(): Promise<RecurringSchedule[]> {
  const supabase = createSupabaseBrowserClient()
  const { data } = await supabase
    .from('recurring_schedules')
    .select('*')
    .eq('is_active', true)
    .order('name')
  return data ?? []
}

export async function getRecurringSchedule(id: string): Promise<RecurringSchedule | null> {
  const supabase = createSupabaseBrowserClient()
  const { data } = await supabase
    .from('recurring_schedules')
    .select('*')
    .eq('id', id)
    .single()
  return data
}

// ─── Create ──────────────────────────────────────────────────────────────────

export async function createRecurringSchedule(data: RecurringFormData): Promise<string> {
  const supabase = createSupabaseBrowserClient()

  const isCrossCurrency = data.currency_from !== data.currency_to

  const initialChange: EffectiveChange = {
    effective_from: data.start_date,
    amount_from: data.amount,
    amount_to: isCrossCurrency ? data.to_amount! : data.amount,
  }

  const { data: schedule, error } = await supabase
    .from('recurring_schedules')
    .insert({
      name: data.name || null,
      from_account_id: data.from_account_id,
      to_account_id: data.to_account_id,
      currency_from: data.currency_from,
      currency_to: data.currency_to,
      frequency: data.frequency,
      day_of_week: data.day_of_week,
      day_of_month: data.day_of_month,
      weekday_only: data.weekday_only,
      start_date: data.start_date,
      effective_changes: [initialChange],
      is_active: true,
    })
    .select('id')
    .single()

  if (error) throw error
  return schedule.id
}

// ─── Edit: Scope 1 — This Occurrence Only ────────────────────────────────────

export async function createOverride(
  recurringId: string,
  override: {
    original_date: string
    amount_from: number
    amount_to: number
    name?: string | null
    override_date?: string
  }
): Promise<void> {
  const supabase = createSupabaseBrowserClient()
  const { error } = await supabase
    .from('recurring_overrides')
    .insert({
      recurring_id: recurringId,
      original_date: override.original_date,
      override_date: override.override_date || override.original_date,
      amount_from: override.amount_from,
      amount_to: override.amount_to,
      name: override.name ?? null,
    })
  if (error) throw error
}

// ─── Edit: Scope 2 — All Future from Date ────────────────────────────────────

export async function appendEffectiveChange(
  scheduleId: string,
  effectiveFrom: string,
  newAmounts: { amount_from: number; amount_to: number }
): Promise<void> {
  const supabase = createSupabaseBrowserClient()

  const { data: schedule } = await supabase
    .from('recurring_schedules')
    .select('effective_changes')
    .eq('id', scheduleId)
    .single()

  if (!schedule) throw new Error('Schedule not found')

  const changes: EffectiveChange[] = [
    ...(schedule.effective_changes || []),
    {
      effective_from: effectiveFrom,
      amount_from: newAmounts.amount_from,
      amount_to: newAmounts.amount_to,
    },
  ]

  const { error } = await supabase
    .from('recurring_schedules')
    .update({ effective_changes: changes })
    .eq('id', scheduleId)

  if (error) throw error
}

// ─── Edit: Scope 3 — Entire Series ───────────────────────────────────────────

export async function updateRecurringSchedule(
  scheduleId: string,
  updates: Partial<RecurringSchedule>
): Promise<void> {
  const supabase = createSupabaseBrowserClient()
  const { error } = await supabase
    .from('recurring_schedules')
    .update(updates)
    .eq('id', scheduleId)
  if (error) throw error
}

// ─── Delete: Scope 1 — Skip This Occurrence ──────────────────────────────────

export async function createSkip(
  recurringId: string,
  skipDate: string
): Promise<void> {
  const supabase = createSupabaseBrowserClient()
  const { error } = await supabase
    .from('recurring_skips')
    .insert({
      recurring_id: recurringId,
      skip_date: skipDate,
    })
  if (error) throw error
}

// ─── Delete: Scope 2 — End Series After Date ─────────────────────────────────

export async function endSeriesAfter(
  scheduleId: string,
  endDate: string
): Promise<void> {
  const supabase = createSupabaseBrowserClient()
  const { error } = await supabase
    .from('recurring_schedules')
    .update({ end_date: endDate })
    .eq('id', scheduleId)
  if (error) throw error
}

// ─── Delete: Scope 3 — Entire Series ─────────────────────────────────────────

export async function deleteSchedule(scheduleId: string): Promise<void> {
  const supabase = createSupabaseBrowserClient()
  const { error } = await supabase
    .from('recurring_schedules')
    .delete()
    .eq('id', scheduleId)
  if (error) throw error
}
