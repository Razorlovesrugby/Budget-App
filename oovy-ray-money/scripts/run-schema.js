const { Client } = require('pg');

const client = new Client({
  connectionString: 'postgresql://postgres:foxmoc-sahvow-0mAdta@db.hmrsjyormmxqasuhaoae.supabase.co:5432/postgres',
  ssl: { rejectUnauthorized: false }
});

async function run() {
  await client.connect();

  // Drop everything first for clean run
  await client.query(`DROP TABLE IF EXISTS review_entries CASCADE`);
  await client.query(`DROP TABLE IF EXISTS reviews CASCADE`);
  await client.query(`DROP TABLE IF EXISTS recurring_overrides CASCADE`);
  await client.query(`DROP TABLE IF EXISTS recurring_skips CASCADE`);
  await client.query(`DROP TABLE IF EXISTS recurring_schedules CASCADE`);
  await client.query(`DROP TABLE IF EXISTS transactions CASCADE`);
  await client.query(`DROP TABLE IF EXISTS settings CASCADE`);
  await client.query(`DROP TABLE IF EXISTS accounts CASCADE`);
  await client.query(`DROP TYPE IF EXISTS account_type CASCADE`);
  await client.query(`DROP TYPE IF EXISTS currency CASCADE`);
  await client.query(`DROP TYPE IF EXISTS transaction_type CASCADE`);
  await client.query(`DROP TYPE IF EXISTS frequency CASCADE`);
  await client.query(`DROP FUNCTION IF EXISTS calculate_budget CASCADE`);

  // 1. Enums
  await client.query(`CREATE TYPE account_type AS ENUM ('CURRENT','SAVINGS','CREDIT','DEBT','TRACKING','EXTERNAL')`);
  await client.query(`CREATE TYPE currency AS ENUM ('GBP','NZD')`);
  await client.query(`CREATE TYPE transaction_type AS ENUM ('TRANSFER','RECURRING_INSTANCE','ONE_OFF','ADJUSTMENT','OPENING')`);
  await client.query(`CREATE TYPE frequency AS ENUM ('WEEKLY','FORTNIGHTLY','MONTHLY','QUARTERLY','BIANNUAL')`);

  // 2. Accounts
  await client.query(`
    CREATE TABLE accounts (
      id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      name                    TEXT NOT NULL,
      type                    account_type NOT NULL,
      currency                currency NOT NULL,
      include_in_cash_balance BOOLEAN NOT NULL DEFAULT true,
      include_in_review       BOOLEAN NOT NULL DEFAULT true,
      opening_balance         DECIMAL(12,2) NOT NULL DEFAULT 0.00,
      opening_date            DATE NOT NULL DEFAULT '2024-08-01',
      display_order           INTEGER NOT NULL DEFAULT 0,
      color_from              TEXT NOT NULL DEFAULT '#1a1a2e',
      color_to                TEXT NOT NULL DEFAULT '#0f3460',
      is_archived             BOOLEAN NOT NULL DEFAULT false,
      is_system               BOOLEAN NOT NULL DEFAULT false,
      created_at              TIMESTAMPTZ NOT NULL DEFAULT now(),
      updated_at              TIMESTAMPTZ NOT NULL DEFAULT now()
    )
  `);

  // 3. Recurring Schedules
  await client.query(`
    CREATE TABLE recurring_schedules (
      id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      name                TEXT,
      from_account_id     UUID NOT NULL REFERENCES accounts(id),
      to_account_id       UUID NOT NULL REFERENCES accounts(id),
      currency_from       currency NOT NULL,
      currency_to         currency NOT NULL,
      frequency           frequency NOT NULL,
      day_of_week         SMALLINT CHECK (day_of_week BETWEEN 0 AND 6),
      day_of_month        SMALLINT CHECK (day_of_month BETWEEN 1 AND 31),
      weekday_only        BOOLEAN NOT NULL DEFAULT false,
      start_date          DATE NOT NULL,
      end_date            DATE,
      effective_changes   JSONB NOT NULL DEFAULT '[]',
      is_active           BOOLEAN NOT NULL DEFAULT true,
      created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
      updated_at          TIMESTAMPTZ NOT NULL DEFAULT now()
    )
  `);

  // 4. Recurring Skips
  await client.query(`
    CREATE TABLE recurring_skips (
      id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      recurring_id    UUID NOT NULL REFERENCES recurring_schedules(id) ON DELETE CASCADE,
      skip_date       DATE NOT NULL,
      created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
      UNIQUE(recurring_id, skip_date)
    )
  `);

  // 5. Recurring Overrides
  await client.query(`
    CREATE TABLE recurring_overrides (
      id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      recurring_id    UUID NOT NULL REFERENCES recurring_schedules(id) ON DELETE CASCADE,
      original_date   DATE NOT NULL,
      override_date   DATE NOT NULL,
      amount_from     DECIMAL(12,2) NOT NULL,
      amount_to       DECIMAL(12,2) NOT NULL,
      name            TEXT,
      created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
      UNIQUE(recurring_id, original_date)
    )
  `);

  // 6. Transactions
  await client.query(`
    CREATE TABLE transactions (
      id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      name                TEXT,
      type                transaction_type NOT NULL,
      from_account_id     UUID NOT NULL REFERENCES accounts(id),
      to_account_id       UUID NOT NULL REFERENCES accounts(id),
      amount_from         DECIMAL(12,2) NOT NULL,
      amount_to           DECIMAL(12,2) NOT NULL,
      currency_from       currency NOT NULL,
      currency_to         currency NOT NULL,
      transaction_date    DATE NOT NULL,
      recurring_id        UUID REFERENCES recurring_schedules(id),
      is_adjustment       BOOLEAN NOT NULL DEFAULT false,
      note                TEXT,
      created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
      updated_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
      CONSTRAINT different_accounts CHECK (from_account_id != to_account_id),
      CONSTRAINT positive_amounts CHECK (amount_from > 0 AND amount_to > 0)
    )
  `);

  // Indexes
  await client.query(`CREATE INDEX idx_tx_from_date ON transactions(from_account_id, transaction_date)`);
  await client.query(`CREATE INDEX idx_tx_to_date ON transactions(to_account_id, transaction_date)`);
  await client.query(`CREATE INDEX idx_tx_date ON transactions(transaction_date)`);
  await client.query(`CREATE INDEX idx_tx_recurring ON transactions(recurring_id) WHERE recurring_id IS NOT NULL`);

  // 7. Reviews
  await client.query(`
    CREATE TABLE reviews (
      id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      review_date     DATE NOT NULL UNIQUE,
      created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
    )
  `);

  // 8. Review Entries
  await client.query(`
    CREATE TABLE review_entries (
      id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      review_id           UUID NOT NULL REFERENCES reviews(id) ON DELETE CASCADE,
      account_id          UUID NOT NULL REFERENCES accounts(id),
      actual_balance      DECIMAL(12,2),
      budget_balance      DECIMAL(12,2) NOT NULL,
      variance            DECIMAL(12,2),
      was_skipped         BOOLEAN NOT NULL DEFAULT false,
      created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
      UNIQUE(review_id, account_id)
    )
  `);

  // 9. Settings
  await client.query(`
    CREATE TABLE settings (
      id                        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      summary_target_date       DATE,
      budget_comparison_date    DATE,
      exchange_rate_gbp_nzd     DECIMAL(10,6) NOT NULL DEFAULT 2.220000,
      exchange_rate_auto_fetch  BOOLEAN NOT NULL DEFAULT false,
      exchange_rate_updated_at  TIMESTAMPTZ,
      created_at                TIMESTAMPTZ NOT NULL DEFAULT now(),
      updated_at                TIMESTAMPTZ NOT NULL DEFAULT now()
    )
  `);

  // RLS
  const tables = ['accounts','transactions','recurring_schedules','recurring_skips','recurring_overrides','reviews','review_entries','settings'];
  for (const table of tables) {
    await client.query(`ALTER TABLE ${table} ENABLE ROW LEVEL SECURITY`);
    await client.query(`CREATE POLICY "allow_all_authenticated" ON ${table} FOR ALL USING (auth.role() = 'authenticated')`);
  }

  // Budget function
  await client.query(`
    CREATE OR REPLACE FUNCTION calculate_budget(p_account_id UUID, p_date DATE)
    RETURNS DECIMAL AS $$
    DECLARE
      v_opening_balance DECIMAL;
      v_cr_sum DECIMAL;
      v_dr_sum DECIMAL;
    BEGIN
      SELECT opening_balance INTO v_opening_balance FROM accounts WHERE id = p_account_id;
      SELECT COALESCE(SUM(amount_to), 0) INTO v_cr_sum
      FROM transactions WHERE to_account_id = p_account_id AND transaction_date <= p_date;
      SELECT COALESCE(SUM(amount_from), 0) INTO v_dr_sum
      FROM transactions WHERE from_account_id = p_account_id AND transaction_date <= p_date;
      RETURN v_opening_balance + v_cr_sum - v_dr_sum;
    END;
    $$ LANGUAGE plpgsql;
  `);

  // Enable Realtime
  await client.query(`ALTER PUBLICATION supabase_realtime ADD TABLE transactions`);
  await client.query(`ALTER PUBLICATION supabase_realtime ADD TABLE reviews`);
  await client.query(`ALTER PUBLICATION supabase_realtime ADD TABLE settings`);

  console.log('SCHEMA CREATED SUCCESSFULLY — all 9 tables, RLS, indexes, realtime, and budget function.');
  await client.end();
}

run().catch(err => { console.error('ERROR:', err.message); process.exit(1); });
