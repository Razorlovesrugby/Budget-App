# Oovy & Ray's Money — Interaction Log
> Chronological record of all prompts, specs, and decisions.
> Owned by DeepSeek. One entry per interaction.

---

## 2026-05-20

### PROMPT: Initial project scaffold setup
User provided the full folder structure and file contents for `oovy-ray-money/`. Included CLAUDE.md, TRACKER.md, `.claude/` agents/commands/rules/hooks, specs placeholders, and `.env.example`/`.gitignore`.

### PROMPT: Rename spec files and improve CLAUDE.md
User noted spec files renamed to `oovy-ray-*` prefix. Requested:
- Claude to have space for reasoning and issue-flagging (ISSUE, SUGGESTION, SPEC GAP signals)
- All non-dev → DeepSeek V3, all dev → Claude Sonnet

**DECISION:** Updated CLAUDE.md with Model Boundaries, Reasoning & Issues sections. Re-synced agent files (developer.md, tracker.md). Spec authority order renamed to match `oovy-ray-*` files.

### PROMPT: Model switch to DeepSeek V4-Flash
User asked about cheapest DeepSeek v4. Confirmed Flash is the budget tier. Switched during session.

### PROMPT: Interaction tracking workflow
User requested a tracking system for all prompts and specs sent.

**DECISION:** Created this file (Option A — single chronological stream).

### PROMPT: Build Sprint 1
User asked for a spec document to give Claude Sonnet for Sprint 1 (Foundation).

**DECISION:** DeepSeek read all 5 spec docs, synthesized Sprint 1 requirements into `/specs/sprint-1-foundation-spec.md`. 6 tasks: Supabase schema, Next.js scaffold, TypeScript types, Supabase clients, seed script, auth flow. Each task has acceptance criteria. Claude Sonnet to implement. TRACKER.md set to Sprint 1, 0/6.

### PROMPT: Set up Supabase MCP server
User provided Supabase URL, anon key, and service role key. Configured PostgREST MCP server in Hermes config.yaml (stdio transport via npx). Restarted Hermes — MCP server connected with 4 tools.

**DECISION:** HTTP MCP server (OAuth) replaced with stdio PostgREST server (service role key auth).

### PROMPT: Run database schema
User provided DB password. DeepSeek connected via Supabase pooler (eu-west-1), created all 9 tables, 4 enums, 4 indexes, RLS policies, calculate_budget function, and Realtime.

**DECISION:** Schema executed directly. Task 1 marked complete. Sprint 1 tasks 2-6 handed to Claude Sonnet.

### Sprint 1 — Complete
Claude Sonnet built tasks 2-6:
- Next.js 14 scaffold with all deps (supabase-js, zustand, date-fns, decimal.js, recharts, tanstack-virtual)
- TypeScript types (8 table interfaces, New* types, forecast engine interfaces)
- Supabase clients (server.ts, client.ts, middleware.ts, root middleware.ts)
- Seed script (EXTERNAL + 15 accounts + settings, idempotent)
- Auth flow (login page, callback route, middleware guard, sign-out)

**ISSUE noted:** Claude renamed `createServerClient` → `createSupabaseServerClient` to avoid name collision with `@supabase/ssr` import. Accepted.

Sprint 1: 6/6 complete. Ready for Sprint 2.
