ALTER TABLE accounts ADD COLUMN IF NOT EXISTS show_on_iphone_home BOOLEAN NOT NULL DEFAULT true;

UPDATE accounts SET show_on_iphone_home = false WHERE type = 'EXTERNAL';
