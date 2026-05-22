'use client'

import { useQuery } from '@tanstack/react-query'
import { createSupabaseBrowserClient } from '@/lib/supabase/client'
import type { Account, Transaction, RecurringSchedule, RecurringSkip, RecurringOverride, Settings } from '@/types'

export function useAccounts() {
  return useQuery({
    queryKey: ['accounts'],
    queryFn: async () => {
      const supabase = createSupabaseBrowserClient()
      const { data } = await supabase
        .from('accounts')
        .select('*')
        .eq('is_archived', false)
        .eq('is_system', false)
        .order('display_order')
        .returns<Account[]>()
      return data ?? []
    },
  })
}

export function useSettings() {
  return useQuery({
    queryKey: ['settings'],
    queryFn: async () => {
      const supabase = createSupabaseBrowserClient()
      const { data } = await supabase
        .from('settings')
        .select('*')
        .single<Settings>()
      return data ?? null
    },
  })
}

export function useTransactions() {
  return useQuery({
    queryKey: ['transactions'],
    queryFn: async () => {
      const supabase = createSupabaseBrowserClient()
      const { data } = await supabase
        .from('transactions')
        .select('*')
        .returns<Transaction[]>()
      return data ?? []
    },
  })
}

export function useSchedules() {
  return useQuery({
    queryKey: ['schedules'],
    queryFn: async () => {
      const supabase = createSupabaseBrowserClient()
      const { data } = await supabase
        .from('recurring_schedules')
        .select('*')
        .eq('is_active', true)
        .returns<RecurringSchedule[]>()
      return data ?? []
    },
  })
}

export function useSkips() {
  return useQuery({
    queryKey: ['skips'],
    queryFn: async () => {
      const supabase = createSupabaseBrowserClient()
      const { data } = await supabase
        .from('recurring_skips')
        .select('*')
        .returns<RecurringSkip[]>()
      return data ?? []
    },
  })
}

export function useOverrides() {
  return useQuery({
    queryKey: ['overrides'],
    queryFn: async () => {
      const supabase = createSupabaseBrowserClient()
      const { data } = await supabase
        .from('recurring_overrides')
        .select('*')
        .returns<RecurringOverride[]>()
      return data ?? []
    },
  })
}
