-- 010_create_functions.sql
-- Business logic functions

-- =============================================================================
-- calculate_inventory_usage
-- Returns usage data for all inventory items in a branch for a given month/year
-- =============================================================================
CREATE OR REPLACE FUNCTION calculate_inventory_usage(
  p_branch_id uuid,
  p_month int,
  p_year int
)
RETURNS TABLE (
  item_id              uuid,
  item_name            text,
  unit                 text,
  category             inventory_category,
  opening_qty          numeric(12,4),
  opening_amount       numeric(12,2),
  total_received_qty   numeric(12,4),
  total_received_amount numeric(12,2),
  closing_qty          numeric(12,4),
  closing_unit_price   numeric(12,2),
  closing_amount       numeric(12,2),
  usage_qty            numeric(12,4),
  usage_amount         numeric(12,2),
  avg_daily_usage      numeric(12,4),
  total_purchased_qty  numeric(12,4),
  avg_cost_from_purchase numeric(12,4),
  avg_cost_fallback    numeric(12,4),
  avg_cost             numeric(12,4),
  total_waste_qty      numeric(12,4),
  total_waste_amount   numeric(12,2),
  usage_per_10000      numeric(12,4),
  usage_per_1000       numeric(12,4)
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_selling_days int;
  v_total_monthly_sales numeric(12,2);
  v_start_date date;
  v_end_date date;
BEGIN
  -- Get monthly header data
  SELECT h.selling_days, h.total_monthly_sales
  INTO v_selling_days, v_total_monthly_sales
  FROM inventory_monthly_header h
  WHERE h.branch_id = p_branch_id
    AND h.month = p_month
    AND h.year = p_year;

  -- Default if no header found
  v_selling_days := COALESCE(v_selling_days, 1);
  v_total_monthly_sales := COALESCE(v_total_monthly_sales, 0);

  -- Calculate date range for the month
  v_start_date := make_date(p_year, p_month, 1);
  v_end_date := (v_start_date + interval '1 month' - interval '1 day')::date;

  RETURN QUERY
  SELECT
    ii.id AS item_id,
    ii.name AS item_name,
    ii.unit,
    ii.category,

    -- Opening stock
    COALESCE(os.quantity, 0) AS opening_qty,
    COALESCE(os.amount, 0) AS opening_amount,

    -- Total received (aggregated from daily_receiving)
    COALESCE(dr_agg.total_qty, 0) AS total_received_qty,
    COALESCE(dr_agg.total_amount, 0) AS total_received_amount,

    -- Closing stock
    COALESCE(cs.quantity, 0) AS closing_qty,
    COALESCE(cs.unit_price, 0) AS closing_unit_price,
    COALESCE(cs.unit_price * cs.quantity, 0) AS closing_amount,

    -- Usage = opening + received - closing
    COALESCE(os.quantity, 0) + COALESCE(dr_agg.total_qty, 0) - COALESCE(cs.quantity, 0) AS usage_qty,
    COALESCE(os.amount, 0) + COALESCE(dr_agg.total_amount, 0) - COALESCE(cs.unit_price * cs.quantity, 0) AS usage_amount,

    -- Avg daily usage
    CASE WHEN v_selling_days > 0 THEN
      (COALESCE(os.quantity, 0) + COALESCE(dr_agg.total_qty, 0) - COALESCE(cs.quantity, 0)) / v_selling_days
    ELSE 0 END AS avg_daily_usage,

    -- Total purchased qty = usage_qty - opening_qty + closing_qty
    (COALESCE(os.quantity, 0) + COALESCE(dr_agg.total_qty, 0) - COALESCE(cs.quantity, 0))
      - COALESCE(os.quantity, 0) + COALESCE(cs.quantity, 0) AS total_purchased_qty,

    -- Avg cost from purchase
    CASE WHEN COALESCE(dr_agg.total_qty, 0) > 0 THEN
      (
        (COALESCE(os.amount, 0) + COALESCE(dr_agg.total_amount, 0) - COALESCE(cs.unit_price * cs.quantity, 0))
        - COALESCE(os.amount, 0)
        + COALESCE(cs.unit_price * cs.quantity, 0)
      ) / COALESCE(dr_agg.total_qty, 0)
    ELSE 0 END AS avg_cost_from_purchase,

    -- Avg cost fallback (from opening stock)
    CASE WHEN COALESCE(dr_agg.total_qty, 0) = 0 AND COALESCE(os.quantity, 0) > 0 THEN
      COALESCE(os.amount, 0) / os.quantity
    ELSE 0 END AS avg_cost_fallback,

    -- Avg cost (use purchase avg if available, else fallback)
    CASE
      WHEN COALESCE(dr_agg.total_qty, 0) > 0 THEN
        COALESCE(dr_agg.total_amount, 0) / dr_agg.total_qty
      WHEN COALESCE(os.quantity, 0) > 0 THEN
        COALESCE(os.amount, 0) / os.quantity
      ELSE 0
    END AS avg_cost,

    -- Total waste qty and amount
    COALESCE(w_agg.total_waste_qty, 0) AS total_waste_qty,
    COALESCE(w_agg.total_waste_qty, 0) *
      CASE
        WHEN COALESCE(dr_agg.total_qty, 0) > 0 THEN
          COALESCE(dr_agg.total_amount, 0) / dr_agg.total_qty
        WHEN COALESCE(os.quantity, 0) > 0 THEN
          COALESCE(os.amount, 0) / os.quantity
        ELSE 0
      END AS total_waste_amount,

    -- Usage per 10,000 baht sales
    CASE WHEN v_total_monthly_sales > 0 THEN
      ((COALESCE(os.quantity, 0) + COALESCE(dr_agg.total_qty, 0) - COALESCE(cs.quantity, 0))
        / v_total_monthly_sales) * 10000
    ELSE 0 END AS usage_per_10000,

    -- Usage per 1,000 baht sales
    CASE WHEN v_total_monthly_sales > 0 THEN
      ((COALESCE(os.quantity, 0) + COALESCE(dr_agg.total_qty, 0) - COALESCE(cs.quantity, 0))
        / v_total_monthly_sales) * 1000
    ELSE 0 END AS usage_per_1000

  FROM inventory_items ii

  -- Opening stock
  LEFT JOIN opening_stock os
    ON os.item_id = ii.id
    AND os.branch_id = p_branch_id
    AND os.month = p_month
    AND os.year = p_year

  -- Closing stock
  LEFT JOIN closing_stock cs
    ON cs.item_id = ii.id
    AND cs.branch_id = p_branch_id
    AND cs.month = p_month
    AND cs.year = p_year

  -- Aggregated daily receiving
  LEFT JOIN LATERAL (
    SELECT
      SUM(dr.qty) AS total_qty,
      SUM(dr.amount) AS total_amount
    FROM daily_receiving dr
    WHERE dr.item_id = ii.id
      AND dr.branch_id = p_branch_id
      AND dr.date BETWEEN v_start_date AND v_end_date
  ) dr_agg ON true

  -- Aggregated waste
  LEFT JOIN LATERAL (
    SELECT SUM(rw.qty) AS total_waste_qty
    FROM raw_waste rw
    WHERE rw.item_id = ii.id
      AND rw.branch_id = p_branch_id
      AND rw.date BETWEEN v_start_date AND v_end_date
  ) w_agg ON true

  WHERE ii.branch_id = p_branch_id
    AND ii.is_active = true

  ORDER BY ii.category, ii.name;
END;
$$;


-- =============================================================================
-- calculate_pl_summary
-- Returns complete P&L summary as JSONB for a branch/month/year
-- =============================================================================
CREATE OR REPLACE FUNCTION calculate_pl_summary(
  p_branch_id uuid,
  p_month int,
  p_year int
)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_start_date date;
  v_end_date date;
  v_tenant_id uuid;

  -- Revenue
  v_total_sales numeric(12,2) := 0;
  v_discount_0111 numeric(12,2) := 0;
  v_discount_0112 numeric(12,2) := 0;
  v_discount_0113 numeric(12,2) := 0;
  v_total_discounts numeric(12,2) := 0;
  v_vat numeric(12,2) := 0;
  v_cash_over_short numeric(12,2) := 0;
  v_net_revenue numeric(12,2) := 0;

  -- COGS
  v_cogs_0201 numeric(12,2) := 0;
  v_cogs_0202 numeric(12,2) := 0;
  v_cogs_0203 numeric(12,2) := 0;
  v_cogs_0204 numeric(12,2) := 0;
  v_cogs_0205 numeric(12,2) := 0;
  v_cogs_0206 numeric(12,2) := 0;
  v_cogs_0207 numeric(12,2) := 0;
  v_total_cogs numeric(12,2) := 0;

  -- Labor
  v_labor_ft_pt_salary numeric(12,2) := 0;
  v_labor_ft_pt_ot numeric(12,2) := 0;
  v_labor_ft_pt_benefits numeric(12,2) := 0;
  v_labor_ft_pt_ss numeric(12,2) := 0;
  v_labor_ft_pt_deductions numeric(12,2) := 0;
  v_labor_hq_salary numeric(12,2) := 0;
  v_labor_hq_ot numeric(12,2) := 0;
  v_labor_hq_benefits numeric(12,2) := 0;
  v_labor_hq_ss numeric(12,2) := 0;
  v_labor_hq_deductions numeric(12,2) := 0;
  v_labor_transport numeric(12,2) := 0;
  v_labor_medical numeric(12,2) := 0;
  v_labor_bonus numeric(12,2) := 0;
  v_total_labor numeric(12,2) := 0;

  -- Profit metrics
  v_gross_profit numeric(12,2) := 0;

  -- Controllable expenses
  v_total_controllable numeric(12,2) := 0;
  v_pac numeric(12,2) := 0;

  -- Non-controllable expenses
  v_total_non_controllable numeric(12,2) := 0;
  v_gp_commission numeric(12,2) := 0;
  v_ebitda numeric(12,2) := 0;

  -- Depreciation
  v_depreciation numeric(12,2) := 0;
  v_ebit numeric(12,2) := 0;

  -- Below EBIT
  v_interest numeric(12,2) := 0;
  v_corporate_tax numeric(12,2) := 0;
  v_net_profit numeric(12,2) := 0;

  v_result jsonb;
BEGIN
  -- Date range
  v_start_date := make_date(p_year, p_month, 1);
  v_end_date := (v_start_date + interval '1 month' - interval '1 day')::date;

  -- Get tenant_id
  SELECT tenant_id INTO v_tenant_id FROM branches WHERE id = p_branch_id;

  -- =========================================================================
  -- REVENUE: sum daily sales
  -- =========================================================================
  SELECT COALESCE(SUM(ds.amount), 0)
  INTO v_total_sales
  FROM daily_sales ds
  WHERE ds.branch_id = p_branch_id
    AND ds.date BETWEEN v_start_date AND v_end_date;

  -- Discounts
  SELECT
    COALESCE(SUM(CASE WHEN d.discount_type = '0111' THEN d.amount ELSE 0 END), 0),
    COALESCE(SUM(CASE WHEN d.discount_type = '0112' THEN d.amount ELSE 0 END), 0),
    COALESCE(SUM(CASE WHEN d.discount_type = '0113' THEN d.amount ELSE 0 END), 0)
  INTO v_discount_0111, v_discount_0112, v_discount_0113
  FROM daily_sale_discounts d
  WHERE d.branch_id = p_branch_id
    AND d.date BETWEEN v_start_date AND v_end_date;

  v_total_discounts := v_discount_0111 + v_discount_0112 + v_discount_0113;

  -- VAT and cash over/short
  SELECT
    COALESCE(SUM(e.vat), 0),
    COALESCE(SUM(e.cash_over_short), 0)
  INTO v_vat, v_cash_over_short
  FROM daily_sale_extras e
  WHERE e.branch_id = p_branch_id
    AND e.date BETWEEN v_start_date AND v_end_date;

  v_net_revenue := v_total_sales - v_total_discounts + v_vat + v_cash_over_short;

  -- =========================================================================
  -- COGS: from inventory usage amounts
  -- =========================================================================
  SELECT
    COALESCE(SUM(CASE WHEN iu.category IN ('0201_dry', '0201_frozen') THEN iu.usage_amount ELSE 0 END), 0),
    COALESCE(SUM(CASE WHEN iu.category = '0202' THEN iu.usage_amount ELSE 0 END), 0),
    COALESCE(SUM(CASE WHEN iu.category = '0203' THEN iu.usage_amount ELSE 0 END), 0),
    COALESCE(SUM(CASE WHEN iu.category = '0204' THEN iu.usage_amount ELSE 0 END), 0),
    COALESCE(SUM(CASE WHEN iu.category = '0205' THEN iu.usage_amount ELSE 0 END), 0)
  INTO v_cogs_0201, v_cogs_0202, v_cogs_0203, v_cogs_0204, v_cogs_0205
  FROM calculate_inventory_usage(p_branch_id, p_month, p_year) iu;

  -- COGS manual items (ice, gas) from monthly_expenses
  SELECT COALESCE(SUM(amount), 0) INTO v_cogs_0206
  FROM monthly_expenses
  WHERE branch_id = p_branch_id AND month = p_month AND year = p_year AND code = '0206';

  SELECT COALESCE(SUM(amount), 0) INTO v_cogs_0207
  FROM monthly_expenses
  WHERE branch_id = p_branch_id AND month = p_month AND year = p_year AND code = '0207';

  v_total_cogs := v_cogs_0201 + v_cogs_0202 + v_cogs_0203 + v_cogs_0204 + v_cogs_0205 + v_cogs_0206 + v_cogs_0207;

  -- =========================================================================
  -- LABOR: from monthly_labor joined with employees
  -- =========================================================================

  -- FT + PT salary (0301)
  SELECT COALESCE(SUM(ml.salary), 0)
  INTO v_labor_ft_pt_salary
  FROM monthly_labor ml
  JOIN employees emp ON emp.id = ml.employee_id
  WHERE emp.branch_id = p_branch_id
    AND emp.type IN ('ft', 'pt')
    AND ml.month = p_month AND ml.year = p_year;

  -- FT + PT OT (0302)
  SELECT COALESCE(SUM(ml.ot_1x_amount + ml.ot_15x_amount + ml.ot_3x_amount + ml.ot_custom), 0)
  INTO v_labor_ft_pt_ot
  FROM monthly_labor ml
  JOIN employees emp ON emp.id = ml.employee_id
  WHERE emp.branch_id = p_branch_id
    AND emp.type IN ('ft', 'pt')
    AND ml.month = p_month AND ml.year = p_year;

  -- FT + PT benefits (0303): service_charge + incentive + food + diligence
  SELECT COALESCE(SUM(ml.service_charge + ml.incentive + ml.food_allowance + ml.diligence_allowance), 0)
  INTO v_labor_ft_pt_benefits
  FROM monthly_labor ml
  JOIN employees emp ON emp.id = ml.employee_id
  WHERE emp.branch_id = p_branch_id
    AND emp.type IN ('ft', 'pt')
    AND ml.month = p_month AND ml.year = p_year;

  -- FT + PT social security (0304)
  SELECT COALESCE(SUM(ml.social_security), 0)
  INTO v_labor_ft_pt_ss
  FROM monthly_labor ml
  JOIN employees emp ON emp.id = ml.employee_id
  WHERE emp.branch_id = p_branch_id
    AND emp.type IN ('ft', 'pt')
    AND ml.month = p_month AND ml.year = p_year;

  -- FT + PT deductions (0305)
  SELECT COALESCE(SUM(ml.sick_amount + ml.personal_amount + ml.absent_amount + ml.late_amount + ml.loan_deduction + ml.tax_deduction), 0)
  INTO v_labor_ft_pt_deductions
  FROM monthly_labor ml
  JOIN employees emp ON emp.id = ml.employee_id
  WHERE emp.branch_id = p_branch_id
    AND emp.type IN ('ft', 'pt')
    AND ml.month = p_month AND ml.year = p_year;

  -- HQ salary (0306)
  SELECT COALESCE(SUM(ml.salary), 0)
  INTO v_labor_hq_salary
  FROM monthly_labor ml
  JOIN employees emp ON emp.id = ml.employee_id
  WHERE emp.branch_id = p_branch_id
    AND emp.type = 'hq'
    AND ml.month = p_month AND ml.year = p_year;

  -- HQ OT (0307)
  SELECT COALESCE(SUM(ml.ot_1x_amount + ml.ot_15x_amount + ml.ot_3x_amount + ml.ot_custom), 0)
  INTO v_labor_hq_ot
  FROM monthly_labor ml
  JOIN employees emp ON emp.id = ml.employee_id
  WHERE emp.branch_id = p_branch_id
    AND emp.type = 'hq'
    AND ml.month = p_month AND ml.year = p_year;

  -- HQ benefits (0308)
  SELECT COALESCE(SUM(ml.service_charge + ml.incentive + ml.food_allowance + ml.diligence_allowance), 0)
  INTO v_labor_hq_benefits
  FROM monthly_labor ml
  JOIN employees emp ON emp.id = ml.employee_id
  WHERE emp.branch_id = p_branch_id
    AND emp.type = 'hq'
    AND ml.month = p_month AND ml.year = p_year;

  -- HQ social security (0309)
  SELECT COALESCE(SUM(ml.social_security), 0)
  INTO v_labor_hq_ss
  FROM monthly_labor ml
  JOIN employees emp ON emp.id = ml.employee_id
  WHERE emp.branch_id = p_branch_id
    AND emp.type = 'hq'
    AND ml.month = p_month AND ml.year = p_year;

  -- HQ deductions (0310)
  SELECT COALESCE(SUM(ml.sick_amount + ml.personal_amount + ml.absent_amount + ml.late_amount + ml.loan_deduction + ml.tax_deduction), 0)
  INTO v_labor_hq_deductions
  FROM monthly_labor ml
  JOIN employees emp ON emp.id = ml.employee_id
  WHERE emp.branch_id = p_branch_id
    AND emp.type = 'hq'
    AND ml.month = p_month AND ml.year = p_year;

  -- Transport (0311)
  SELECT COALESCE(SUM(ml.transport_allowance), 0)
  INTO v_labor_transport
  FROM monthly_labor ml
  JOIN employees emp ON emp.id = ml.employee_id
  WHERE emp.branch_id = p_branch_id
    AND ml.month = p_month AND ml.year = p_year;

  -- Medical (0312) from monthly_expenses
  SELECT COALESCE(SUM(amount), 0) INTO v_labor_medical
  FROM monthly_expenses
  WHERE branch_id = p_branch_id AND month = p_month AND year = p_year AND code = '0312';

  -- Bonus (0313)
  SELECT COALESCE(SUM(ml.bonus), 0)
  INTO v_labor_bonus
  FROM monthly_labor ml
  JOIN employees emp ON emp.id = ml.employee_id
  WHERE emp.branch_id = p_branch_id
    AND ml.month = p_month AND ml.year = p_year;

  v_total_labor := v_labor_ft_pt_salary + v_labor_ft_pt_ot + v_labor_ft_pt_benefits
    + v_labor_ft_pt_ss + v_labor_ft_pt_deductions
    + v_labor_hq_salary + v_labor_hq_ot + v_labor_hq_benefits
    + v_labor_hq_ss + v_labor_hq_deductions
    + v_labor_transport + v_labor_medical + v_labor_bonus;

  -- =========================================================================
  -- GROSS PROFIT
  -- =========================================================================
  v_gross_profit := v_net_revenue - v_total_cogs - v_total_labor;

  -- =========================================================================
  -- CONTROLLABLE EXPENSES (0401-0415, including 0409 from inventory)
  -- =========================================================================
  DECLARE
    v_cogs_0409 numeric(12,2) := 0;
    v_controllable_from_expenses numeric(12,2) := 0;
  BEGIN
    -- 0409 from inventory
    SELECT COALESCE(SUM(iu.usage_amount), 0)
    INTO v_cogs_0409
    FROM calculate_inventory_usage(p_branch_id, p_month, p_year) iu
    WHERE iu.category = '0409';

    -- Other controllable from monthly_expenses (0401-0408, 0410-0415)
    SELECT COALESCE(SUM(amount), 0)
    INTO v_controllable_from_expenses
    FROM monthly_expenses
    WHERE branch_id = p_branch_id
      AND month = p_month AND year = p_year
      AND code IN ('0401','0402','0403','0404','0405','0406','0407','0408','0410','0411','0412','0413','0414','0415');

    v_total_controllable := v_controllable_from_expenses + v_cogs_0409;
  END;

  v_pac := v_gross_profit - v_total_controllable;

  -- =========================================================================
  -- NON-CONTROLLABLE EXPENSES (0501-0510)
  -- =========================================================================

  -- GP Commission (0504) from delivery details
  SELECT COALESCE(SUM(dd.gp_commission), 0)
  INTO v_gp_commission
  FROM daily_sale_delivery_details dd
  WHERE dd.branch_id = p_branch_id
    AND dd.date BETWEEN v_start_date AND v_end_date;

  -- Other non-controllable from monthly_expenses
  DECLARE
    v_non_controllable_from_expenses numeric(12,2) := 0;
  BEGIN
    SELECT COALESCE(SUM(amount), 0)
    INTO v_non_controllable_from_expenses
    FROM monthly_expenses
    WHERE branch_id = p_branch_id
      AND month = p_month AND year = p_year
      AND code IN ('0501','0502','0503','0505','0506','0507','0508','0509','0510');

    v_total_non_controllable := v_non_controllable_from_expenses + v_gp_commission;
  END;

  v_ebitda := v_pac - v_total_non_controllable;

  -- =========================================================================
  -- DEPRECIATION (0601)
  -- =========================================================================
  SELECT COALESCE(SUM(amount), 0) INTO v_depreciation
  FROM monthly_expenses
  WHERE branch_id = p_branch_id AND month = p_month AND year = p_year AND code = '0601';

  v_ebit := v_ebitda - v_depreciation;

  -- =========================================================================
  -- INTEREST (0701) & TAX (0702)
  -- =========================================================================
  SELECT COALESCE(SUM(amount), 0) INTO v_interest
  FROM monthly_expenses
  WHERE branch_id = p_branch_id AND month = p_month AND year = p_year AND code = '0701';

  SELECT COALESCE(SUM(amount), 0) INTO v_corporate_tax
  FROM monthly_expenses
  WHERE branch_id = p_branch_id AND month = p_month AND year = p_year AND code = '0702';

  v_net_profit := v_ebit - v_interest - v_corporate_tax;

  -- =========================================================================
  -- BUILD RESULT
  -- =========================================================================
  v_result := jsonb_build_object(
    'revenue', jsonb_build_object(
      'total_sales', v_total_sales,
      'discount_0111', v_discount_0111,
      'discount_0112', v_discount_0112,
      'discount_0113', v_discount_0113,
      'total_discounts', v_total_discounts,
      'vat', v_vat,
      'cash_over_short', v_cash_over_short,
      'net_revenue', v_net_revenue
    ),
    'cogs', jsonb_build_object(
      'cogs_0201_food', v_cogs_0201,
      'cogs_0202_beverage', v_cogs_0202,
      'cogs_0203_alcohol', v_cogs_0203,
      'cogs_0204_dessert', v_cogs_0204,
      'cogs_0205_packaging', v_cogs_0205,
      'cogs_0206_ice', v_cogs_0206,
      'cogs_0207_gas', v_cogs_0207,
      'total_cogs', v_total_cogs
    ),
    'labor', jsonb_build_object(
      'ft_pt_salary_0301', v_labor_ft_pt_salary,
      'ft_pt_ot_0302', v_labor_ft_pt_ot,
      'ft_pt_benefits_0303', v_labor_ft_pt_benefits,
      'ft_pt_social_security_0304', v_labor_ft_pt_ss,
      'ft_pt_deductions_0305', v_labor_ft_pt_deductions,
      'hq_salary_0306', v_labor_hq_salary,
      'hq_ot_0307', v_labor_hq_ot,
      'hq_benefits_0308', v_labor_hq_benefits,
      'hq_social_security_0309', v_labor_hq_ss,
      'hq_deductions_0310', v_labor_hq_deductions,
      'transport_0311', v_labor_transport,
      'medical_0312', v_labor_medical,
      'bonus_0313', v_labor_bonus,
      'total_labor', v_total_labor
    ),
    'gross_profit', v_gross_profit,
    'controllable_expenses', v_total_controllable,
    'pac', v_pac,
    'non_controllable_expenses', v_total_non_controllable,
    'gp_commission_0504', v_gp_commission,
    'ebitda', v_ebitda,
    'depreciation_0601', v_depreciation,
    'ebit', v_ebit,
    'interest_0701', v_interest,
    'corporate_tax_0702', v_corporate_tax,
    'net_profit', v_net_profit,
    'percentages', jsonb_build_object(
      'cogs_pct', CASE WHEN v_net_revenue > 0 THEN ROUND((v_total_cogs / v_net_revenue) * 100, 2) ELSE 0 END,
      'labor_pct', CASE WHEN v_net_revenue > 0 THEN ROUND((v_total_labor / v_net_revenue) * 100, 2) ELSE 0 END,
      'gp_pct', CASE WHEN v_net_revenue > 0 THEN ROUND((v_gross_profit / v_net_revenue) * 100, 2) ELSE 0 END,
      'controllable_pct', CASE WHEN v_net_revenue > 0 THEN ROUND((v_total_controllable / v_net_revenue) * 100, 2) ELSE 0 END,
      'pac_pct', CASE WHEN v_net_revenue > 0 THEN ROUND((v_pac / v_net_revenue) * 100, 2) ELSE 0 END,
      'non_controllable_pct', CASE WHEN v_net_revenue > 0 THEN ROUND((v_total_non_controllable / v_net_revenue) * 100, 2) ELSE 0 END,
      'ebitda_pct', CASE WHEN v_net_revenue > 0 THEN ROUND((v_ebitda / v_net_revenue) * 100, 2) ELSE 0 END,
      'ebit_pct', CASE WHEN v_net_revenue > 0 THEN ROUND((v_ebit / v_net_revenue) * 100, 2) ELSE 0 END,
      'net_profit_pct', CASE WHEN v_net_revenue > 0 THEN ROUND((v_net_profit / v_net_revenue) * 100, 2) ELSE 0 END
    )
  );

  RETURN v_result;
END;
$$;
