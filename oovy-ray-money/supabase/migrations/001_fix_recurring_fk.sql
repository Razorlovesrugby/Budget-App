-- Migration: Fix dangling recurring_id FK on delete
-- Run this in Supabase SQL Editor
-- Project: hmrsjyormmxqasuhaoae
-- Date: 2026-05-21

-- Drop the existing FK constraint (auto-named by Postgres)
-- First, find the constraint name:
-- SELECT conname FROM pg_constraint 
--   WHERE conrelid = 'transactions'::regclass 
--   AND confrelid = 'recurring_schedules'::regclass
--   AND contype = 'f';

-- Then drop and re-add with ON DELETE SET NULL:
ALTER TABLE transactions DROP CONSTRAINT IF EXISTS transactions_recurring_id_fkey;

ALTER TABLE transactions 
  ADD CONSTRAINT transactions_recurring_id_fkey 
  FOREIGN KEY (recurring_id) 
  REFERENCES recurring_schedules(id) 
  ON DELETE SET NULL;
