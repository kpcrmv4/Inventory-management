-- 007_seed_data.sql
-- Seed / reference data

-- Inventory categories are defined as enum type inventory_category:
--   '0201_dry'    = วัตถุดิบอาหาร (แห้ง)
--   '0201_frozen' = วัตถุดิบอาหาร (แช่เย็น-แช่แข็ง)
--   '0202'        = วัตถุดิบเครื่องดื่ม
--   '0203'        = เครื่องดื่มแอลกอฮอล์
--   '0204'        = วัตถุดิบขนมหวาน
--   '0205'        = บรรจุภัณฑ์
--   '0409'        = วัสดุสิ้นเปลือง

-- =============================================================================
-- Function to seed default sales channels for a new tenant
-- Called after tenant creation / approval
-- =============================================================================
CREATE OR REPLACE FUNCTION seed_default_sales_channels(p_tenant_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO sales_channels (tenant_id, code, name, type, is_default, sort_order)
  VALUES
    -- Dine-in channels
    (p_tenant_id, '0101', 'หน้าร้าน 1', 'dine_in', true,  1),
    (p_tenant_id, '0102', 'หน้าร้าน 2', 'dine_in', false, 2),
    -- Delivery channels
    (p_tenant_id, '0103', 'GrabFood',    'delivery', true,  3),
    (p_tenant_id, '0104', 'Foodpanda',   'delivery', false, 4),
    (p_tenant_id, '0105', 'LINE MAN',    'delivery', false, 5),
    (p_tenant_id, '0106', 'ShopeeFood',  'delivery', false, 6),
    (p_tenant_id, '0107', 'Robinhood',   'delivery', false, 7),
    (p_tenant_id, '0108', 'Delivery อื่นๆ', 'delivery', false, 8),
    -- Other revenue
    (p_tenant_id, '0110', 'รายได้อื่นๆ', 'dine_in', false, 9)
  ON CONFLICT DO NOTHING;
END;
$$;

-- =============================================================================
-- Default expense code reference (for UI display)
-- =============================================================================
COMMENT ON TABLE monthly_expenses IS
'Expense codes:
  COGS (auto from inventory): 0201, 0202, 0203, 0204, 0205
  COGS (manual): 0206 น้ำแข็ง, 0207 แก๊ส
  Labor: 0301-0313
  Controllable: 0401-0415
  Non-controllable: 0501-0510
  Depreciation: 0601
  Interest: 0701, Tax: 0702';
