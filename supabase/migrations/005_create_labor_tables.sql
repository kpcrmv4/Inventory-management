-- 005_create_labor_tables.sql
-- Labor tables: employees, monthly_labor

-- =============================================================================
-- EMPLOYEES
-- =============================================================================
CREATE TABLE employees (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id   uuid NOT NULL REFERENCES tenants (id) ON DELETE CASCADE,
  branch_id   uuid NOT NULL REFERENCES branches (id) ON DELETE CASCADE,
  name        text NOT NULL,
  position    text NOT NULL DEFAULT '',
  salary      numeric(12,2) NOT NULL DEFAULT 0,
  type        employee_type NOT NULL,
  is_active   boolean NOT NULL DEFAULT true,
  start_date  date NOT NULL DEFAULT CURRENT_DATE,
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_employees_tenant_id ON employees (tenant_id);
CREATE INDEX idx_employees_branch_id ON employees (branch_id);
CREATE INDEX idx_employees_type ON employees (type);

-- =============================================================================
-- MONTHLY LABOR — Full payroll record per employee per month
-- =============================================================================
CREATE TABLE monthly_labor (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id         uuid NOT NULL REFERENCES employees (id) ON DELETE CASCADE,
  month               int NOT NULL CHECK (month BETWEEN 1 AND 12),
  year                int NOT NULL CHECK (year > 0),

  -- Base salary
  salary              numeric(12,2) NOT NULL DEFAULT 0,

  -- Overtime (income)
  ot_1x_hours         numeric(8,2) NOT NULL DEFAULT 0,
  ot_1x_amount        numeric(12,2) NOT NULL DEFAULT 0,
  ot_15x_hours        numeric(8,2) NOT NULL DEFAULT 0,
  ot_15x_amount       numeric(12,2) NOT NULL DEFAULT 0,
  ot_3x_hours         numeric(8,2) NOT NULL DEFAULT 0,
  ot_3x_amount        numeric(12,2) NOT NULL DEFAULT 0,
  ot_custom           numeric(12,2) NOT NULL DEFAULT 0,

  -- Allowances (income)
  service_charge      numeric(12,2) NOT NULL DEFAULT 0,
  incentive           numeric(12,2) NOT NULL DEFAULT 0,
  food_allowance      numeric(12,2) NOT NULL DEFAULT 0,
  transport_allowance numeric(12,2) NOT NULL DEFAULT 0,
  diligence_allowance numeric(12,2) NOT NULL DEFAULT 0,

  -- Leave deductions
  sick_days           numeric(6,2) NOT NULL DEFAULT 0,
  sick_amount         numeric(12,2) NOT NULL DEFAULT 0,
  personal_days       numeric(6,2) NOT NULL DEFAULT 0,
  personal_amount     numeric(12,2) NOT NULL DEFAULT 0,
  absent_days         numeric(6,2) NOT NULL DEFAULT 0,
  absent_amount       numeric(12,2) NOT NULL DEFAULT 0,

  -- Late deductions
  late_minutes        numeric(8,2) NOT NULL DEFAULT 0,
  late_amount         numeric(12,2) NOT NULL DEFAULT 0,

  -- Other deductions
  loan_deduction      numeric(12,2) NOT NULL DEFAULT 0,
  tax_deduction       numeric(12,2) NOT NULL DEFAULT 0,
  social_security     numeric(12,2) NOT NULL DEFAULT 0,

  -- Bonus
  bonus               numeric(12,2) NOT NULL DEFAULT 0,

  -- Computed totals
  total_income        numeric(12,2) NOT NULL DEFAULT 0,
  total_deductions    numeric(12,2) NOT NULL DEFAULT 0,
  net_pay             numeric(12,2) NOT NULL DEFAULT 0,

  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now(),

  UNIQUE (employee_id, month, year)
);

CREATE INDEX idx_monthly_labor_employee ON monthly_labor (employee_id);
CREATE INDEX idx_monthly_labor_month_year ON monthly_labor (month, year);
