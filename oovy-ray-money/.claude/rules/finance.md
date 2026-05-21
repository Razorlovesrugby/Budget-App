# Rule: Financial Calculations
Applies to: **/*.ts **/*.tsx

MANDATORY for any file containing monetary values or calculations:

1. Import decimal.js: import Decimal from 'decimal.js'
2. Never use raw +, -, *, / on money variables
3. All DB reads of DECIMAL columns → wrap in new Decimal() immediately
4. All display formatting → use the formatCurrency() util in /lib/money.ts
5. Debit display: (£200.00) bracket format — never minus sign
6. NZD prefix: always "NZ$" — never "$"
7. Amounts always positive in storage — direction from account relationship only
8. Round to 2dp using Decimal.ROUND_HALF_UP only

If you are about to write arithmetic on a monetary value without decimal.js,
STOP and refactor first.
