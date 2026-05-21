import { createSupabaseBrowserClient } from '@/lib/supabase/client'

export interface ReviewEntryData {
  accountId: string
  actualBalance: number | null   // null = skipped
  budgetBalance: number            // snapshot at review time
  variance: number | null          // null = skipped
  wasSkipped: boolean
}

interface SaveReviewParams {
  reviewDate: string            // 'YYYY-MM-DD'
  entries: {
    account_id: string
    actual_balance: number | null
    budget_balance: number
    variance: number | null
    was_skipped: boolean
  }[]
}

export async function saveReview({ reviewDate, entries }: SaveReviewParams): Promise<string> {
  const supabase = createSupabaseBrowserClient()

  // 1. Check for duplicate review on this date
  const { data: existing } = await supabase
    .from('reviews')
    .select('id')
    .eq('review_date', reviewDate)
    .limit(1)

  if (existing && existing.length > 0) {
    throw new Error('A review already exists for this date')
  }

  // 2. Insert the review record
  const { data: review, error: reviewError } = await supabase
    .from('reviews')
    .insert({ review_date: reviewDate })
    .select('id')
    .single()

  if (reviewError) throw reviewError
  if (!review) throw new Error('Failed to create review')

  // 3. Insert all review entries
  const reviewEntries = entries.map(entry => ({
    review_id: review.id,
    account_id: entry.account_id,
    actual_balance: entry.actual_balance,
    budget_balance: entry.budget_balance,
    variance: entry.variance,
    was_skipped: entry.was_skipped,
  }))

  const { error: entriesError } = await supabase
    .from('review_entries')
    .insert(reviewEntries)

  if (entriesError) throw entriesError

  return review.id
}

export async function getLastReviewDate(): Promise<string | null> {
  const supabase = createSupabaseBrowserClient()

  const { data } = await supabase
    .from('reviews')
    .select('review_date')
    .order('review_date', { ascending: false })
    .limit(1)

  if (!data || data.length === 0) return null
  return data[0].review_date
}

export async function getLastActualForAccount(
  accountId: string,
  beforeDate: string
): Promise<{ actualBalance: number; reviewDate: string } | null> {
  const supabase = createSupabaseBrowserClient()

  const { data: entries } = await supabase
    .from('review_entries')
    .select('actual_balance, reviews!inner(review_date)')
    .eq('account_id', accountId)
    .eq('was_skipped', false)
    .not('actual_balance', 'is', null)
    .lt('reviews.review_date', beforeDate)
    .order('created_at', { ascending: false })
    .limit(1)

  if (!entries || entries.length === 0) return null

  const entry = entries[0] as { actual_balance: number; reviews: { review_date: string }[] }
  return {
    actualBalance: entry.actual_balance,
    reviewDate: entry.reviews[0]?.review_date ?? '',
  }
}

export async function getLatestActualBalances(
  accountIds: string[]
): Promise<Map<string, { balance: number; date: string }>> {
  const supabase = createSupabaseBrowserClient()
  const result = new Map<string, { balance: number; date: string }>()

  if (accountIds.length === 0) return result

  const { data } = await supabase
    .from('review_entries')
    .select('account_id, actual_balance, reviews!inner(review_date)')
    .in('account_id', accountIds)
    .eq('was_skipped', false)
    .not('actual_balance', 'is', null)
    .order('created_at', { ascending: false })

  const seen = new Set<string>()
  if (data) {
    for (const entry of data as unknown as {
      account_id: string
      actual_balance: number
      reviews: { review_date: string }[]
    }[]) {
      if (!seen.has(entry.account_id)) {
        seen.add(entry.account_id)
        result.set(entry.account_id, {
          balance: entry.actual_balance,
          date: entry.reviews[0]?.review_date ?? '',
        })
      }
    }
  }

  return result
}
