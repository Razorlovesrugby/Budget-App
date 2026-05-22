import { createSupabaseServerClient } from '@/lib/supabase/server'

export async function GET() {
  try {
    const res = await fetch('https://api.frankfurter.app/latest?from=GBP&to=NZD', {
      next: { revalidate: 0 },
    })
    if (!res.ok) throw new Error('Fetch failed')
    const data = await res.json()
    const rate: number = data.rates?.NZD
    if (!rate) throw new Error('Rate missing')

    const supabase = createSupabaseServerClient()
    const { data: settings } = await supabase
      .from('settings')
      .select('id')
      .single()

    if (settings?.id) {
      await supabase
        .from('settings')
        .update({
          exchange_rate_gbp_nzd: rate,
          exchange_rate_updated_at: new Date().toISOString(),
        })
        .eq('id', settings.id)
    }

    return Response.json({ rate })
  } catch {
    return Response.json({ error: 'Fetch failed, using stored rate' }, { status: 200 })
  }
}
