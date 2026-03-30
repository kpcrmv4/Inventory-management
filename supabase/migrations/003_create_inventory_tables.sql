-- 003_create_inventory_tables.sql
-- Inventory tables: items, monthly header, opening/closing stock, receiving, waste

-- =============================================================================
-- INVENTORY ITEMS
-- =============================================================================
CREATE TABLE inventory_items (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id   uuid NOT NULL REFERENCES tenants (id) ON DELETE CASCADE,
  branch_id   uuid NOT NULL REFERENCES branches (id) ON DELETE CASCADE,
  name        text NOT NULL,
  unit        text NOT NULL,
  category    inventory_category NOT NULL,
  is_active   boolean NOT NULL DEFAULT true,
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_inventory_items_tenant_id ON inventory_items (tenant_id);
CREATE INDEX idx_inventory_items_branch_id ON inventory_items (branch_id);
CREATE INDEX idx_inventory_items_category ON inventory_items (category);

-- =============================================================================
-- INVENTORY MONTHLY HEADER
-- =============================================================================
CREATE TABLE inventory_monthly_header (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  branch_id           uuid NOT NULL REFERENCES branches (id) ON DELETE CASCADE,
  month               int NOT NULL CHECK (month BETWEEN 1 AND 12),
  year                int NOT NULL CHECK (year > 0),
  total_monthly_sales numeric(12,2) NOT NULL DEFAULT 0,
  selling_days        int NOT NULL DEFAULT 0 CHECK (selling_days >= 0),
  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now(),

  UNIQUE (branch_id, month, year)
);

CREATE INDEX idx_inv_monthly_header_branch_month_year
  ON inventory_monthly_header (branch_id, month, year);

-- =============================================================================
-- OPENING STOCK
-- =============================================================================
CREATE TABLE opening_stock (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  item_id     uuid NOT NULL REFERENCES inventory_items (id) ON DELETE CASCADE,
  branch_id   uuid NOT NULL REFERENCES branches (id) ON DELETE CASCADE,
  month       int NOT NULL CHECK (month BETWEEN 1 AND 12),
  year        int NOT NULL CHECK (year > 0),
  quantity    numeric(12,4) NOT NULL DEFAULT 0,
  amount      numeric(12,2) NOT NULL DEFAULT 0,
  created_at  timestamptz NOT NULL DEFAULT now(),

  UNIQUE (item_id, branch_id, month, year)
);

CREATE INDEX idx_opening_stock_branch_month_year
  ON opening_stock (branch_id, month, year);

-- =============================================================================
-- DAILY RECEIVING
-- =============================================================================
CREATE TABLE daily_receiving (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  branch_id   uuid NOT NULL REFERENCES branches (id) ON DELETE CASCADE,
  item_id     uuid NOT NULL REFERENCES inventory_items (id) ON DELETE CASCADE,
  date        date NOT NULL,
  qty         numeric(12,4) NOT NULL DEFAULT 0,
  amount      numeric(12,2) NOT NULL DEFAULT 0,
  created_at  timestamptz NOT NULL DEFAULT now(),
  created_by  uuid REFERENCES users (id) ON DELETE SET NULL
);

CREATE INDEX idx_daily_receiving_branch_date ON daily_receiving (branch_id, date);
CREATE INDEX idx_daily_receiving_item_date ON daily_receiving (item_id, date);

-- =============================================================================
-- CLOSING STOCK
-- =============================================================================
CREATE TABLE closing_stock (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  item_id     uuid NOT NULL REFERENCES inventory_items (id) ON DELETE CASCADE,
  branch_id   uuid NOT NULL REFERENCES branches (id) ON DELETE CASCADE,
  month       int NOT NULL CHECK (month BETWEEN 1 AND 12),
  year        int NOT NULL CHECK (year > 0),
  unit_price  numeric(12,2) NOT NULL DEFAULT 0,
  quantity    numeric(12,4) NOT NULL DEFAULT 0,
  created_at  timestamptz NOT NULL DEFAULT now(),

  UNIQUE (item_id, branch_id, month, year)
);

CREATE INDEX idx_closing_stock_branch_month_year
  ON closing_stock (branch_id, month, year);

-- =============================================================================
-- RAW WASTE
-- =============================================================================
CREATE TABLE raw_waste (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  branch_id   uuid NOT NULL REFERENCES branches (id) ON DELETE CASCADE,
  item_id     uuid NOT NULL REFERENCES inventory_items (id) ON DELETE CASCADE,
  date        date NOT NULL,
  qty         numeric(12,4) NOT NULL DEFAULT 0,
  type        waste_type NOT NULL,
  created_at  timestamptz NOT NULL DEFAULT now(),
  created_by  uuid REFERENCES users (id) ON DELETE SET NULL
);

CREATE INDEX idx_raw_waste_branch_date ON raw_waste (branch_id, date);
CREATE INDEX idx_raw_waste_item_date ON raw_waste (item_id, date);
