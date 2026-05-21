# Rule: API Routes
Applies to: **/api/**/*.ts

1. All API routes are server-side only
2. SUPABASE_SERVICE_ROLE_KEY never in client-side code
3. NEXT_PUBLIC_ vars only for anon key and URL
4. All DB mutations go through Supabase server client (SSR)
5. Return consistent error shape: { error: string, code: string }
6. No direct SQL from client components — use API routes or server actions
