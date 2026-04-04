-- 013_reset_tenant_function.sql
-- Function to reset all data for a given tenant (preserves tenant + branch + user rows)
-- Usage: SELECT reset_tenant_data('tenant-uuid-here');

CREATE OR REPLACE FUNCTION reset_tenant_data(p_tenant_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_branch_ids uuid[];
  v_item_ids uuid[];
  v_employee_ids uuid[];
BEGIN
  -- Collect branch IDs
  SELECT array_agg(id) INTO v_branch_ids
  FROM branches WHERE tenant_id = p_tenant_id;

  IF v_branch_ids IS NULL THEN
    RAISE NOTICE 'No branches found for tenant %', p_tenant_id;
    RETURN;
  END IF;

  -- Collect inventory item IDs
  SELECT array_agg(id) INTO v_item_ids
  FROM inventory_items WHERE tenant_id = p_tenant_id;

  -- Collect employee IDs
  SELECT array_agg(id) INTO v_employee_ids
  FROM employees WHERE tenant_id = p_tenant_id;

  -- ═══════════════════════════════════════════════════════════════
  -- 1) Recipe data (CASCADE จาก recipes จะลบ variants + ingredients)
  -- ═══════════════════════════════════════════════════════════════
  DELETE FROM recipes WHERE tenant_id = p_tenant_id;

  -- ═══════════════════════════════════════════════════════════════
  -- 2) Inventory transactional data
  -- ═══════════════════════════════════════════════════════════════
  IF v_item_ids IS NOT NULL THEN
    DELETE FROM raw_waste       WHERE item_id = ANY(v_item_ids);
    DELETE FROM daily_receiving  WHERE item_id = ANY(v_item_ids);
    DELETE FROM closing_stock    WHERE item_id = ANY(v_item_ids);
    DELETE FROM opening_stock    WHERE item_id = ANY(v_item_ids);
  END IF;

  DELETE FROM inventory_monthly_header WHERE branch_id = ANY(v_branch_ids);
  DELETE FROM inventory_items          WHERE tenant_id = p_tenant_id;

  -- ═══════════════════════════════════════════════════════════════
  -- 3) P&L transactional data
  -- ═══════════════════════════════════════════════════════════════
  DELETE FROM daily_sale_delivery_details WHERE branch_id = ANY(v_branch_ids);
  DELETE FROM daily_sale_discounts       WHERE branch_id = ANY(v_branch_ids);
  DELETE FROM daily_sale_extras          WHERE branch_id = ANY(v_branch_ids);
  DELETE FROM daily_sales                WHERE branch_id = ANY(v_branch_ids);
  DELETE FROM sales_targets              WHERE branch_id = ANY(v_branch_ids);
  DELETE FROM monthly_expenses           WHERE branch_id = ANY(v_branch_ids);

  -- ═══════════════════════════════════════════════════════════════
  -- 4) Labor data
  -- ═══════════════════════════════════════════════════════════════
  IF v_employee_ids IS NOT NULL THEN
    DELETE FROM monthly_labor WHERE employee_id = ANY(v_employee_ids);
  END IF;
  DELETE FROM employees WHERE tenant_id = p_tenant_id;

  -- ═══════════════════════════════════════════════════════════════
  -- 5) Complaints
  -- ═══════════════════════════════════════════════════════════════
  DELETE FROM complaints WHERE tenant_id = p_tenant_id;

  -- ═══════════════════════════════════════════════════════════════
  -- 6) Sales channels & custom labels (re-seed channels after)
  -- ═══════════════════════════════════════════════════════════════
  DELETE FROM sales_channels       WHERE tenant_id = p_tenant_id;
  DELETE FROM expense_custom_labels WHERE tenant_id = p_tenant_id;

  -- Re-seed default sales channels
  PERFORM seed_default_sales_channels(p_tenant_id);

  RAISE NOTICE 'Tenant % data reset complete. Branches and users preserved.', p_tenant_id;
END;
$$;

COMMENT ON FUNCTION reset_tenant_data IS
'ล้างข้อมูลทั้งหมดของ Tenant (Inventory, P&L, Labor, Recipes, Complaints)
แต่คงไว้: Tenant row, Branch rows, User rows, แล้ว re-seed sales channels ให้ใหม่';
