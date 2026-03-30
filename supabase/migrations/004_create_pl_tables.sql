-- 004_create_pl_tables.sql
-- P&L related tables: sales channels, daily sales, discounts, expenses, targets

-- =============================================================================
-- SALES CHANNELS
-- =============================================================================
CREATE TABLE sales_channels (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id   uuid NOT NULL REFERENCES tenants (id) ON DELETE CASCADE,
  code        text NOT NULL,
  name        text NOT NULL,
  type        channel_type NOT NULL,
  is_default  boolean NOT NULL DEFAULT false,
  is_active   boolean NOT NULL DEFAULT true,
  sort_order  int NOT NULL DEFAULT 0,
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_sales_channels_tenant_id ON sales_channels (tenant_id);

-- =============================================================================
-- DAILY SALES
-- =============================================================================
CREATE TABLE daily_sales (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  branch_id   uuid NOT NULL REFERENCES branches (id) ON DELETE CASCADE,
  channel_id  uuid NOT NULL REFERENCES sales_channels (id) ON DELETE CASCADE,
  date        date NOT NULL,
  amount      numeric(12,2) NOT NULL DEFAULT 0,
  bills       int NOT NULL DEFAULT 0,
  heads       int NOT NULL DEFAULT 0,
  created_by  uuid REFERENCES users (id) ON DELETE SET NULL,
  created_at  timestamptz NOT NULL DEFAULT now(),

  UNIQUE (branch_id, channel_id, date)
);

CREATE INDEX idx_daily_sales_branch_date ON daily_sales (branch_id, date);

-- =============================================================================
-- DAILY SALE DISCOUNTS
-- =============================================================================
CREATE TABLE daily_sale_discounts (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  branch_id     uuid NOT NULL REFERENCES branches (id) ON DELETE CASCADE,
  date          date NOT NULL,
  discount_type discount_type NOT NULL,
  amount        numeric(12,2) NOT NULL DEFAULT 0,
  created_at    timestamptz NOT NULL DEFAULT now(),

  UNIQUE (branch_id, date, discount_type)
);

CREATE INDEX idx_daily_sale_discounts_branch_date ON daily_sale_discounts (branch_id, date);

-- =============================================================================
-- DAILY SALE DELIVERY DETAILS (GP commission per platform)
-- =============================================================================
CREATE TABLE daily_sale_delivery_details (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  branch_id     uuid NOT NULL REFERENCES branches (id) ON DELETE CASCADE,
  channel_id    uuid NOT NULL REFERENCES sales_channels (id) ON DELETE CASCADE,
  date          date NOT NULL,
  bills         int NOT NULL DEFAULT 0,
  gp_commission numeric(12,2) NOT NULL DEFAULT 0,
  created_at    timestamptz NOT NULL DEFAULT now(),

  UNIQUE (branch_id, channel_id, date)
);

CREATE INDEX idx_delivery_details_branch_date ON daily_sale_delivery_details (branch_id, date);

-- =============================================================================
-- DAILY SALE EXTRAS (VAT, cash over/short)
-- =============================================================================
CREATE TABLE daily_sale_extras (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  branch_id       uuid NOT NULL REFERENCES branches (id) ON DELETE CASCADE,
  date            date NOT NULL,
  vat             numeric(12,2) NOT NULL DEFAULT 0,
  cash_over_short numeric(12,2) NOT NULL DEFAULT 0,
  created_at      timestamptz NOT NULL DEFAULT now(),

  UNIQUE (branch_id, date)
);

CREATE INDEX idx_daily_sale_extras_branch_date ON daily_sale_extras (branch_id, date);

-- =============================================================================
-- SALES TARGETS
-- =============================================================================
CREATE TABLE sales_targets (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  branch_id     uuid NOT NULL REFERENCES branches (id) ON DELETE CASCADE,
  date          date NOT NULL,
  target_amount numeric(12,2) NOT NULL DEFAULT 0,
  created_at    timestamptz NOT NULL DEFAULT now(),

  UNIQUE (branch_id, date)
);

CREATE INDEX idx_sales_targets_branch_date ON sales_targets (branch_id, date);

-- =============================================================================
-- MONTHLY EXPENSES
-- =============================================================================
CREATE TABLE monthly_expenses (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  branch_id   uuid NOT NULL REFERENCES branches (id) ON DELETE CASCADE,
  code        text NOT NULL,
  amount      numeric(12,2) NOT NULL DEFAULT 0,
  date        date,
  month       int NOT NULL CHECK (month BETWEEN 1 AND 12),
  year        int NOT NULL CHECK (year > 0),
  note        text,
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_monthly_expenses_branch_month_year
  ON monthly_expenses (branch_id, month, year);
CREATE INDEX idx_monthly_expenses_code ON monthly_expenses (code);

-- =============================================================================
-- EXPENSE CUSTOM LABELS (for codes 0412-0415, 0506-0510)
-- =============================================================================
CREATE TABLE expense_custom_labels (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id   uuid NOT NULL REFERENCES tenants (id) ON DELETE CASCADE,
  code        text NOT NULL,
  custom_name text NOT NULL,
  created_at  timestamptz NOT NULL DEFAULT now(),

  UNIQUE (tenant_id, code)
);

CREATE INDEX idx_expense_custom_labels_tenant ON expense_custom_labels (tenant_id);
