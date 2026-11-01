-- 003_finance.sql
-- Contas, cartões, compras parceladas, faturas, transações, orçamentos e metas.
-- Valores monetários são sempre inteiros em centavos.

CREATE TABLE accounts (
  id TEXT PRIMARY KEY,
  space_id TEXT NOT NULL REFERENCES spaces(id) ON DELETE CASCADE,
  scope TEXT NOT NULL CHECK (scope IN ('private', 'shared')),
  owner_user_id TEXT REFERENCES users(id),
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('checking', 'digital', 'cash', 'savings', 'reserve', 'other')),
  holder_user_id TEXT REFERENCES users(id),
  initial_balance_cents INTEGER NOT NULL DEFAULT 0,
  currency TEXT NOT NULL DEFAULT 'BRL',
  archived_at TEXT,
  created_by TEXT NOT NULL REFERENCES users(id),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  CHECK (
    (scope = 'private' AND owner_user_id IS NOT NULL)
    OR (scope = 'shared' AND owner_user_id IS NULL)
  )
);

CREATE INDEX idx_accounts_space ON accounts(space_id, archived_at);

CREATE TABLE credit_cards (
  id TEXT PRIMARY KEY,
  space_id TEXT NOT NULL REFERENCES spaces(id) ON DELETE CASCADE,
  scope TEXT NOT NULL CHECK (scope IN ('private', 'shared')),
  owner_user_id TEXT REFERENCES users(id),
  name TEXT NOT NULL,
  institution TEXT,
  holder_user_id TEXT REFERENCES users(id),
  limit_cents INTEGER NOT NULL DEFAULT 0 CHECK (limit_cents >= 0),
  closing_day INTEGER NOT NULL CHECK (closing_day BETWEEN 1 AND 31),
  due_day INTEGER NOT NULL CHECK (due_day BETWEEN 1 AND 31),
  payment_account_id TEXT REFERENCES accounts(id),
  archived_at TEXT,
  created_by TEXT NOT NULL REFERENCES users(id),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  CHECK (
    (scope = 'private' AND owner_user_id IS NOT NULL)
    OR (scope = 'shared' AND owner_user_id IS NULL)
  )
);

CREATE INDEX idx_cards_space ON credit_cards(space_id, archived_at);

CREATE TABLE card_purchases (
  id TEXT PRIMARY KEY,
  space_id TEXT NOT NULL REFERENCES spaces(id) ON DELETE CASCADE,
  scope TEXT NOT NULL CHECK (scope IN ('private', 'shared')),
  owner_user_id TEXT REFERENCES users(id),
  card_id TEXT NOT NULL REFERENCES credit_cards(id),
  description TEXT NOT NULL,
  total_cents INTEGER NOT NULL CHECK (total_cents > 0),
  installments_count INTEGER NOT NULL DEFAULT 1 CHECK (installments_count BETWEEN 1 AND 48),
  purchase_date TEXT NOT NULL,
  first_due_date TEXT NOT NULL,
  category_id TEXT REFERENCES categories(id),
  responsible_user_id TEXT REFERENCES users(id),
  notes TEXT,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'cancelled')),
  created_by TEXT NOT NULL REFERENCES users(id),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  CHECK (
    (scope = 'private' AND owner_user_id IS NOT NULL)
    OR (scope = 'shared' AND owner_user_id IS NULL)
  )
);

CREATE INDEX idx_purchases_card ON card_purchases(card_id, purchase_date);

CREATE TABLE invoices (
  id TEXT PRIMARY KEY,
  card_id TEXT NOT NULL REFERENCES credit_cards(id) ON DELETE CASCADE,
  reference_month TEXT NOT NULL,
  closing_date TEXT NOT NULL,
  due_date TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'closed', 'paid', 'cancelled')),
  paid_at TEXT,
  payment_account_id TEXT REFERENCES accounts(id),
  payment_transaction_id TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  UNIQUE (card_id, reference_month)
);

CREATE TABLE installments (
  id TEXT PRIMARY KEY,
  purchase_id TEXT NOT NULL REFERENCES card_purchases(id) ON DELETE CASCADE,
  number INTEGER NOT NULL CHECK (number >= 1),
  amount_cents INTEGER NOT NULL CHECK (amount_cents > 0),
  due_date TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'paid', 'cancelled')),
  invoice_id TEXT REFERENCES invoices(id),
  paid_at TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  UNIQUE (purchase_id, number)
);

CREATE INDEX idx_installments_due ON installments(due_date, status);

CREATE TABLE transactions (
  id TEXT PRIMARY KEY,
  space_id TEXT NOT NULL REFERENCES spaces(id) ON DELETE CASCADE,
  scope TEXT NOT NULL CHECK (scope IN ('private', 'shared')),
  owner_user_id TEXT REFERENCES users(id),
  type TEXT NOT NULL CHECK (type IN ('income', 'expense', 'transfer')),
  description TEXT NOT NULL,
  amount_cents INTEGER NOT NULL CHECK (amount_cents > 0),
  competence_date TEXT NOT NULL,
  due_date TEXT,
  payment_date TEXT,
  status TEXT NOT NULL CHECK (status IN ('planned', 'pending', 'paid', 'received', 'cancelled')),
  category_id TEXT REFERENCES categories(id),
  account_id TEXT REFERENCES accounts(id),
  card_id TEXT REFERENCES credit_cards(id),
  installment_id TEXT REFERENCES installments(id),
  transfer_account_id TEXT REFERENCES accounts(id),
  transfer_group_id TEXT,
  responsible_user_id TEXT REFERENCES users(id),
  recurrence_id TEXT REFERENCES recurrences(id),
  notes TEXT,
  created_by TEXT NOT NULL REFERENCES users(id),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  CHECK (
    (scope = 'private' AND owner_user_id IS NOT NULL)
    OR (scope = 'shared' AND owner_user_id IS NULL)
  ),
  CHECK (
    (type = 'transfer' AND account_id IS NOT NULL AND transfer_account_id IS NOT NULL
      AND transfer_account_id <> account_id AND category_id IS NULL)
    OR (type <> 'transfer' AND transfer_account_id IS NULL)
  ),
  CHECK (
    (type = 'income' AND status IN ('planned', 'received', 'cancelled'))
    OR (type = 'expense' AND status IN ('planned', 'pending', 'paid', 'cancelled'))
    OR (type = 'transfer' AND status IN ('pending', 'paid', 'cancelled'))
  )
);

-- Uma parcela gera no máximo uma transação; evita dupla contabilização.
CREATE UNIQUE INDEX ux_transactions_installment
  ON transactions(installment_id)
  WHERE installment_id IS NOT NULL;

-- Idempotência da geração de recorrências financeiras.
CREATE UNIQUE INDEX ux_transactions_recurrence_date
  ON transactions(recurrence_id, competence_date)
  WHERE recurrence_id IS NOT NULL;

CREATE INDEX idx_transactions_space_date ON transactions(space_id, competence_date);
CREATE INDEX idx_transactions_account ON transactions(account_id, status);

CREATE TABLE budgets (
  id TEXT PRIMARY KEY,
  space_id TEXT NOT NULL REFERENCES spaces(id) ON DELETE CASCADE,
  scope TEXT NOT NULL CHECK (scope IN ('private', 'shared')),
  owner_user_id TEXT REFERENCES users(id),
  period_month TEXT NOT NULL,
  category_id TEXT REFERENCES categories(id),
  limit_cents INTEGER NOT NULL CHECK (limit_cents > 0),
  created_by TEXT NOT NULL REFERENCES users(id),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  CHECK (
    (scope = 'private' AND owner_user_id IS NOT NULL)
    OR (scope = 'shared' AND owner_user_id IS NULL)
  )
);

CREATE UNIQUE INDEX ux_budgets_scope_period
  ON budgets(space_id, scope, IFNULL(owner_user_id, ''), period_month, IFNULL(category_id, ''));

CREATE TABLE goals (
  id TEXT PRIMARY KEY,
  space_id TEXT NOT NULL REFERENCES spaces(id) ON DELETE CASCADE,
  scope TEXT NOT NULL CHECK (scope IN ('private', 'shared')),
  owner_user_id TEXT REFERENCES users(id),
  name TEXT NOT NULL,
  description TEXT,
  target_cents INTEGER NOT NULL CHECK (target_cents > 0),
  deadline TEXT,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'achieved', 'cancelled')),
  created_by TEXT NOT NULL REFERENCES users(id),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  CHECK (
    (scope = 'private' AND owner_user_id IS NOT NULL)
    OR (scope = 'shared' AND owner_user_id IS NULL)
  )
);

CREATE TABLE goal_contributions (
  id TEXT PRIMARY KEY,
  goal_id TEXT NOT NULL REFERENCES goals(id) ON DELETE CASCADE,
  amount_cents INTEGER NOT NULL CHECK (amount_cents > 0),
  contribution_date TEXT NOT NULL,
  account_id TEXT REFERENCES accounts(id),
  transaction_id TEXT REFERENCES transactions(id),
  created_by TEXT NOT NULL REFERENCES users(id),
  created_at TEXT NOT NULL
);

CREATE UNIQUE INDEX ux_goal_contributions_transaction
  ON goal_contributions(transaction_id)
  WHERE transaction_id IS NOT NULL;

CREATE INDEX idx_goal_contributions_goal ON goal_contributions(goal_id, contribution_date);
