-- 009_rls_policies.sql
-- Complete Row Level Security for all tables

-- =============================================================================
-- HELPER FUNCTIONS (cached per statement via (select ...) pattern)
-- =============================================================================

CREATE OR REPLACE FUNCTION get_user_tenant_id()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT tenant_id FROM public.users WHERE id = auth.uid();
$$;

CREATE OR REPLACE FUNCTION get_user_branch_id()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT branch_id FROM public.users WHERE id = auth.uid();
$$;

CREATE OR REPLACE FUNCTION get_user_role()
RETURNS user_role
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role FROM public.users WHERE id = auth.uid();
$$;

-- =============================================================================
-- ENABLE RLS ON ALL TABLES
-- =============================================================================

ALTER TABLE tenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE branches ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE plan_upgrades ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory_monthly_header ENABLE ROW LEVEL SECURITY;
ALTER TABLE opening_stock ENABLE ROW LEVEL SECURITY;
ALTER TABLE daily_receiving ENABLE ROW LEVEL SECURITY;
ALTER TABLE closing_stock ENABLE ROW LEVEL SECURITY;
ALTER TABLE raw_waste ENABLE ROW LEVEL SECURITY;
ALTER TABLE sales_channels ENABLE ROW LEVEL SECURITY;
ALTER TABLE daily_sales ENABLE ROW LEVEL SECURITY;
ALTER TABLE daily_sale_discounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE daily_sale_delivery_details ENABLE ROW LEVEL SECURITY;
ALTER TABLE daily_sale_extras ENABLE ROW LEVEL SECURITY;
ALTER TABLE sales_targets ENABLE ROW LEVEL SECURITY;
ALTER TABLE monthly_expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE expense_custom_labels ENABLE ROW LEVEL SECURITY;
ALTER TABLE employees ENABLE ROW LEVEL SECURITY;
ALTER TABLE monthly_labor ENABLE ROW LEVEL SECURITY;
ALTER TABLE complaints ENABLE ROW LEVEL SECURITY;

-- =============================================================================
-- TENANTS
-- =============================================================================

-- SuperAdmin: full access
CREATE POLICY tenants_superadmin_all ON tenants
  FOR ALL
  USING ((select get_user_role()) = 'superadmin')
  WITH CHECK ((select get_user_role()) = 'superadmin');

-- Owner: read own tenant
CREATE POLICY tenants_owner_select ON tenants
  FOR SELECT
  USING (
    (select get_user_role()) = 'owner'
    AND id = (select get_user_tenant_id())
  );

-- Owner: update own tenant (limited)
CREATE POLICY tenants_owner_update ON tenants
  FOR UPDATE
  USING (
    (select get_user_role()) = 'owner'
    AND id = (select get_user_tenant_id())
  )
  WITH CHECK (
    (select get_user_role()) = 'owner'
    AND id = (select get_user_tenant_id())
  );

-- Staff: read own tenant
CREATE POLICY tenants_staff_select ON tenants
  FOR SELECT
  USING (
    (select get_user_role()) = 'staff'
    AND id = (select get_user_tenant_id())
  );

-- =============================================================================
-- BRANCHES
-- =============================================================================

CREATE POLICY branches_superadmin_all ON branches
  FOR ALL
  USING ((select get_user_role()) = 'superadmin')
  WITH CHECK ((select get_user_role()) = 'superadmin');

CREATE POLICY branches_owner_all ON branches
  FOR ALL
  USING (
    (select get_user_role()) = 'owner'
    AND tenant_id = (select get_user_tenant_id())
  )
  WITH CHECK (
    (select get_user_role()) = 'owner'
    AND tenant_id = (select get_user_tenant_id())
  );

CREATE POLICY branches_staff_select ON branches
  FOR SELECT
  USING (
    (select get_user_role()) = 'staff'
    AND tenant_id = (select get_user_tenant_id())
    AND id = (select get_user_branch_id())
  );

-- =============================================================================
-- USERS
-- =============================================================================

CREATE POLICY users_superadmin_all ON users
  FOR ALL
  USING ((select get_user_role()) = 'superadmin')
  WITH CHECK ((select get_user_role()) = 'superadmin');

CREATE POLICY users_owner_all ON users
  FOR ALL
  USING (
    (select get_user_role()) = 'owner'
    AND tenant_id = (select get_user_tenant_id())
  )
  WITH CHECK (
    (select get_user_role()) = 'owner'
    AND tenant_id = (select get_user_tenant_id())
  );

CREATE POLICY users_staff_select ON users
  FOR SELECT
  USING (
    (select get_user_role()) = 'staff'
    AND id = auth.uid()
  );

-- =============================================================================
-- PLAN UPGRADES
-- =============================================================================

CREATE POLICY plan_upgrades_superadmin_all ON plan_upgrades
  FOR ALL
  USING ((select get_user_role()) = 'superadmin')
  WITH CHECK ((select get_user_role()) = 'superadmin');

CREATE POLICY plan_upgrades_owner_select ON plan_upgrades
  FOR SELECT
  USING (
    (select get_user_role()) = 'owner'
    AND tenant_id = (select get_user_tenant_id())
  );

CREATE POLICY plan_upgrades_owner_insert ON plan_upgrades
  FOR INSERT
  WITH CHECK (
    (select get_user_role()) = 'owner'
    AND tenant_id = (select get_user_tenant_id())
  );

-- =============================================================================
-- INVENTORY ITEMS
-- =============================================================================

CREATE POLICY inventory_items_superadmin_all ON inventory_items
  FOR ALL
  USING ((select get_user_role()) = 'superadmin')
  WITH CHECK ((select get_user_role()) = 'superadmin');

CREATE POLICY inventory_items_owner_all ON inventory_items
  FOR ALL
  USING (
    (select get_user_role()) = 'owner'
    AND tenant_id = (select get_user_tenant_id())
  )
  WITH CHECK (
    (select get_user_role()) = 'owner'
    AND tenant_id = (select get_user_tenant_id())
  );

CREATE POLICY inventory_items_staff_select ON inventory_items
  FOR SELECT
  USING (
    (select get_user_role()) = 'staff'
    AND tenant_id = (select get_user_tenant_id())
    AND branch_id = (select get_user_branch_id())
  );

-- =============================================================================
-- Helper: macro for branch-scoped tables (used by inventory, sales, etc.)
-- We define policies inline since PG doesn't support policy macros.
-- =============================================================================

-- INVENTORY MONTHLY HEADER
CREATE POLICY inv_monthly_header_superadmin ON inventory_monthly_header
  FOR ALL
  USING ((select get_user_role()) = 'superadmin')
  WITH CHECK ((select get_user_role()) = 'superadmin');

CREATE POLICY inv_monthly_header_owner ON inventory_monthly_header
  FOR ALL
  USING (
    (select get_user_role()) = 'owner'
    AND branch_id IN (SELECT id FROM branches WHERE tenant_id = (select get_user_tenant_id()))
  )
  WITH CHECK (
    (select get_user_role()) = 'owner'
    AND branch_id IN (SELECT id FROM branches WHERE tenant_id = (select get_user_tenant_id()))
  );

CREATE POLICY inv_monthly_header_staff ON inventory_monthly_header
  FOR ALL
  USING (
    (select get_user_role()) = 'staff'
    AND branch_id = (select get_user_branch_id())
  )
  WITH CHECK (
    (select get_user_role()) = 'staff'
    AND branch_id = (select get_user_branch_id())
  );

-- OPENING STOCK
CREATE POLICY opening_stock_superadmin ON opening_stock
  FOR ALL
  USING ((select get_user_role()) = 'superadmin')
  WITH CHECK ((select get_user_role()) = 'superadmin');

CREATE POLICY opening_stock_owner ON opening_stock
  FOR ALL
  USING (
    (select get_user_role()) = 'owner'
    AND branch_id IN (SELECT id FROM branches WHERE tenant_id = (select get_user_tenant_id()))
  )
  WITH CHECK (
    (select get_user_role()) = 'owner'
    AND branch_id IN (SELECT id FROM branches WHERE tenant_id = (select get_user_tenant_id()))
  );

CREATE POLICY opening_stock_staff ON opening_stock
  FOR ALL
  USING (
    (select get_user_role()) = 'staff'
    AND branch_id = (select get_user_branch_id())
  )
  WITH CHECK (
    (select get_user_role()) = 'staff'
    AND branch_id = (select get_user_branch_id())
  );

-- DAILY RECEIVING
CREATE POLICY daily_receiving_superadmin ON daily_receiving
  FOR ALL
  USING ((select get_user_role()) = 'superadmin')
  WITH CHECK ((select get_user_role()) = 'superadmin');

CREATE POLICY daily_receiving_owner ON daily_receiving
  FOR ALL
  USING (
    (select get_user_role()) = 'owner'
    AND branch_id IN (SELECT id FROM branches WHERE tenant_id = (select get_user_tenant_id()))
  )
  WITH CHECK (
    (select get_user_role()) = 'owner'
    AND branch_id IN (SELECT id FROM branches WHERE tenant_id = (select get_user_tenant_id()))
  );

CREATE POLICY daily_receiving_staff ON daily_receiving
  FOR ALL
  USING (
    (select get_user_role()) = 'staff'
    AND branch_id = (select get_user_branch_id())
  )
  WITH CHECK (
    (select get_user_role()) = 'staff'
    AND branch_id = (select get_user_branch_id())
  );

-- CLOSING STOCK
CREATE POLICY closing_stock_superadmin ON closing_stock
  FOR ALL
  USING ((select get_user_role()) = 'superadmin')
  WITH CHECK ((select get_user_role()) = 'superadmin');

CREATE POLICY closing_stock_owner ON closing_stock
  FOR ALL
  USING (
    (select get_user_role()) = 'owner'
    AND branch_id IN (SELECT id FROM branches WHERE tenant_id = (select get_user_tenant_id()))
  )
  WITH CHECK (
    (select get_user_role()) = 'owner'
    AND branch_id IN (SELECT id FROM branches WHERE tenant_id = (select get_user_tenant_id()))
  );

CREATE POLICY closing_stock_staff ON closing_stock
  FOR ALL
  USING (
    (select get_user_role()) = 'staff'
    AND branch_id = (select get_user_branch_id())
  )
  WITH CHECK (
    (select get_user_role()) = 'staff'
    AND branch_id = (select get_user_branch_id())
  );

-- RAW WASTE
CREATE POLICY raw_waste_superadmin ON raw_waste
  FOR ALL
  USING ((select get_user_role()) = 'superadmin')
  WITH CHECK ((select get_user_role()) = 'superadmin');

CREATE POLICY raw_waste_owner ON raw_waste
  FOR ALL
  USING (
    (select get_user_role()) = 'owner'
    AND branch_id IN (SELECT id FROM branches WHERE tenant_id = (select get_user_tenant_id()))
  )
  WITH CHECK (
    (select get_user_role()) = 'owner'
    AND branch_id IN (SELECT id FROM branches WHERE tenant_id = (select get_user_tenant_id()))
  );

CREATE POLICY raw_waste_staff ON raw_waste
  FOR ALL
  USING (
    (select get_user_role()) = 'staff'
    AND branch_id = (select get_user_branch_id())
  )
  WITH CHECK (
    (select get_user_role()) = 'staff'
    AND branch_id = (select get_user_branch_id())
  );

-- =============================================================================
-- SALES CHANNELS (tenant-scoped)
-- =============================================================================

CREATE POLICY sales_channels_superadmin ON sales_channels
  FOR ALL
  USING ((select get_user_role()) = 'superadmin')
  WITH CHECK ((select get_user_role()) = 'superadmin');

CREATE POLICY sales_channels_owner ON sales_channels
  FOR ALL
  USING (
    (select get_user_role()) = 'owner'
    AND tenant_id = (select get_user_tenant_id())
  )
  WITH CHECK (
    (select get_user_role()) = 'owner'
    AND tenant_id = (select get_user_tenant_id())
  );

CREATE POLICY sales_channels_staff_select ON sales_channels
  FOR SELECT
  USING (
    (select get_user_role()) = 'staff'
    AND tenant_id = (select get_user_tenant_id())
  );

-- =============================================================================
-- DAILY SALES (branch-scoped)
-- =============================================================================

CREATE POLICY daily_sales_superadmin ON daily_sales
  FOR ALL
  USING ((select get_user_role()) = 'superadmin')
  WITH CHECK ((select get_user_role()) = 'superadmin');

CREATE POLICY daily_sales_owner ON daily_sales
  FOR ALL
  USING (
    (select get_user_role()) = 'owner'
    AND branch_id IN (SELECT id FROM branches WHERE tenant_id = (select get_user_tenant_id()))
  )
  WITH CHECK (
    (select get_user_role()) = 'owner'
    AND branch_id IN (SELECT id FROM branches WHERE tenant_id = (select get_user_tenant_id()))
  );

CREATE POLICY daily_sales_staff ON daily_sales
  FOR ALL
  USING (
    (select get_user_role()) = 'staff'
    AND branch_id = (select get_user_branch_id())
  )
  WITH CHECK (
    (select get_user_role()) = 'staff'
    AND branch_id = (select get_user_branch_id())
  );

-- DAILY SALE DISCOUNTS
CREATE POLICY daily_sale_discounts_superadmin ON daily_sale_discounts
  FOR ALL
  USING ((select get_user_role()) = 'superadmin')
  WITH CHECK ((select get_user_role()) = 'superadmin');

CREATE POLICY daily_sale_discounts_owner ON daily_sale_discounts
  FOR ALL
  USING (
    (select get_user_role()) = 'owner'
    AND branch_id IN (SELECT id FROM branches WHERE tenant_id = (select get_user_tenant_id()))
  )
  WITH CHECK (
    (select get_user_role()) = 'owner'
    AND branch_id IN (SELECT id FROM branches WHERE tenant_id = (select get_user_tenant_id()))
  );

CREATE POLICY daily_sale_discounts_staff ON daily_sale_discounts
  FOR ALL
  USING (
    (select get_user_role()) = 'staff'
    AND branch_id = (select get_user_branch_id())
  )
  WITH CHECK (
    (select get_user_role()) = 'staff'
    AND branch_id = (select get_user_branch_id())
  );

-- DAILY SALE DELIVERY DETAILS
CREATE POLICY delivery_details_superadmin ON daily_sale_delivery_details
  FOR ALL
  USING ((select get_user_role()) = 'superadmin')
  WITH CHECK ((select get_user_role()) = 'superadmin');

CREATE POLICY delivery_details_owner ON daily_sale_delivery_details
  FOR ALL
  USING (
    (select get_user_role()) = 'owner'
    AND branch_id IN (SELECT id FROM branches WHERE tenant_id = (select get_user_tenant_id()))
  )
  WITH CHECK (
    (select get_user_role()) = 'owner'
    AND branch_id IN (SELECT id FROM branches WHERE tenant_id = (select get_user_tenant_id()))
  );

CREATE POLICY delivery_details_staff ON daily_sale_delivery_details
  FOR ALL
  USING (
    (select get_user_role()) = 'staff'
    AND branch_id = (select get_user_branch_id())
  )
  WITH CHECK (
    (select get_user_role()) = 'staff'
    AND branch_id = (select get_user_branch_id())
  );

-- DAILY SALE EXTRAS
CREATE POLICY daily_sale_extras_superadmin ON daily_sale_extras
  FOR ALL
  USING ((select get_user_role()) = 'superadmin')
  WITH CHECK ((select get_user_role()) = 'superadmin');

CREATE POLICY daily_sale_extras_owner ON daily_sale_extras
  FOR ALL
  USING (
    (select get_user_role()) = 'owner'
    AND branch_id IN (SELECT id FROM branches WHERE tenant_id = (select get_user_tenant_id()))
  )
  WITH CHECK (
    (select get_user_role()) = 'owner'
    AND branch_id IN (SELECT id FROM branches WHERE tenant_id = (select get_user_tenant_id()))
  );

CREATE POLICY daily_sale_extras_staff ON daily_sale_extras
  FOR ALL
  USING (
    (select get_user_role()) = 'staff'
    AND branch_id = (select get_user_branch_id())
  )
  WITH CHECK (
    (select get_user_role()) = 'staff'
    AND branch_id = (select get_user_branch_id())
  );

-- SALES TARGETS
CREATE POLICY sales_targets_superadmin ON sales_targets
  FOR ALL
  USING ((select get_user_role()) = 'superadmin')
  WITH CHECK ((select get_user_role()) = 'superadmin');

CREATE POLICY sales_targets_owner ON sales_targets
  FOR ALL
  USING (
    (select get_user_role()) = 'owner'
    AND branch_id IN (SELECT id FROM branches WHERE tenant_id = (select get_user_tenant_id()))
  )
  WITH CHECK (
    (select get_user_role()) = 'owner'
    AND branch_id IN (SELECT id FROM branches WHERE tenant_id = (select get_user_tenant_id()))
  );

CREATE POLICY sales_targets_staff_select ON sales_targets
  FOR SELECT
  USING (
    (select get_user_role()) = 'staff'
    AND branch_id = (select get_user_branch_id())
  );

-- MONTHLY EXPENSES
CREATE POLICY monthly_expenses_superadmin ON monthly_expenses
  FOR ALL
  USING ((select get_user_role()) = 'superadmin')
  WITH CHECK ((select get_user_role()) = 'superadmin');

CREATE POLICY monthly_expenses_owner ON monthly_expenses
  FOR ALL
  USING (
    (select get_user_role()) = 'owner'
    AND branch_id IN (SELECT id FROM branches WHERE tenant_id = (select get_user_tenant_id()))
  )
  WITH CHECK (
    (select get_user_role()) = 'owner'
    AND branch_id IN (SELECT id FROM branches WHERE tenant_id = (select get_user_tenant_id()))
  );

CREATE POLICY monthly_expenses_staff ON monthly_expenses
  FOR ALL
  USING (
    (select get_user_role()) = 'staff'
    AND branch_id = (select get_user_branch_id())
  )
  WITH CHECK (
    (select get_user_role()) = 'staff'
    AND branch_id = (select get_user_branch_id())
  );

-- EXPENSE CUSTOM LABELS (tenant-scoped)
CREATE POLICY expense_custom_labels_superadmin ON expense_custom_labels
  FOR ALL
  USING ((select get_user_role()) = 'superadmin')
  WITH CHECK ((select get_user_role()) = 'superadmin');

CREATE POLICY expense_custom_labels_owner ON expense_custom_labels
  FOR ALL
  USING (
    (select get_user_role()) = 'owner'
    AND tenant_id = (select get_user_tenant_id())
  )
  WITH CHECK (
    (select get_user_role()) = 'owner'
    AND tenant_id = (select get_user_tenant_id())
  );

CREATE POLICY expense_custom_labels_staff_select ON expense_custom_labels
  FOR SELECT
  USING (
    (select get_user_role()) = 'staff'
    AND tenant_id = (select get_user_tenant_id())
  );

-- =============================================================================
-- EMPLOYEES (tenant-scoped, branch-filtered for staff)
-- =============================================================================

CREATE POLICY employees_superadmin ON employees
  FOR ALL
  USING ((select get_user_role()) = 'superadmin')
  WITH CHECK ((select get_user_role()) = 'superadmin');

CREATE POLICY employees_owner ON employees
  FOR ALL
  USING (
    (select get_user_role()) = 'owner'
    AND tenant_id = (select get_user_tenant_id())
  )
  WITH CHECK (
    (select get_user_role()) = 'owner'
    AND tenant_id = (select get_user_tenant_id())
  );

CREATE POLICY employees_staff_select ON employees
  FOR SELECT
  USING (
    (select get_user_role()) = 'staff'
    AND tenant_id = (select get_user_tenant_id())
    AND branch_id = (select get_user_branch_id())
  );

-- =============================================================================
-- MONTHLY LABOR (via employee -> tenant/branch)
-- =============================================================================

CREATE POLICY monthly_labor_superadmin ON monthly_labor
  FOR ALL
  USING ((select get_user_role()) = 'superadmin')
  WITH CHECK ((select get_user_role()) = 'superadmin');

CREATE POLICY monthly_labor_owner ON monthly_labor
  FOR ALL
  USING (
    (select get_user_role()) = 'owner'
    AND employee_id IN (
      SELECT id FROM employees WHERE tenant_id = (select get_user_tenant_id())
    )
  )
  WITH CHECK (
    (select get_user_role()) = 'owner'
    AND employee_id IN (
      SELECT id FROM employees WHERE tenant_id = (select get_user_tenant_id())
    )
  );

CREATE POLICY monthly_labor_staff_select ON monthly_labor
  FOR SELECT
  USING (
    (select get_user_role()) = 'staff'
    AND employee_id IN (
      SELECT id FROM employees
      WHERE tenant_id = (select get_user_tenant_id())
        AND branch_id = (select get_user_branch_id())
    )
  );

-- =============================================================================
-- COMPLAINTS
-- =============================================================================

CREATE POLICY complaints_superadmin ON complaints
  FOR ALL
  USING ((select get_user_role()) = 'superadmin')
  WITH CHECK ((select get_user_role()) = 'superadmin');

CREATE POLICY complaints_owner ON complaints
  FOR ALL
  USING (
    (select get_user_role()) = 'owner'
    AND tenant_id = (select get_user_tenant_id())
  )
  WITH CHECK (
    (select get_user_role()) = 'owner'
    AND tenant_id = (select get_user_tenant_id())
  );

CREATE POLICY complaints_staff ON complaints
  FOR ALL
  USING (
    (select get_user_role()) = 'staff'
    AND tenant_id = (select get_user_tenant_id())
    AND branch_id = (select get_user_branch_id())
  )
  WITH CHECK (
    (select get_user_role()) = 'staff'
    AND tenant_id = (select get_user_tenant_id())
    AND branch_id = (select get_user_branch_id())
  );
