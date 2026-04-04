-- 011_create_recipe_tables.sql
-- Recipe Management: สูตรอาหาร + ตัวเลือก (ธรรมดา/พิเศษ) + วัตถุดิบต่อตัวเลือก

-- =============================================================================
-- ENUM: recipe category
-- =============================================================================
CREATE TYPE recipe_category AS ENUM ('food', 'beverage', 'dessert', 'other');

-- =============================================================================
-- RECIPES — เมนูหลัก (เช่น "ข้าวผัดกุ้ง")
-- =============================================================================
CREATE TABLE recipes (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id   uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name        text NOT NULL,
  category    recipe_category NOT NULL DEFAULT 'food',
  image_url   text,
  is_active   boolean NOT NULL DEFAULT true,
  sort_order  int NOT NULL DEFAULT 0,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_recipes_tenant ON recipes(tenant_id);

-- =============================================================================
-- RECIPE VARIANTS — ตัวเลือกของเมนู (เช่น "ธรรมดา", "พิเศษ")
-- เมนูที่ไม่มีตัวเลือก จะมี variant เดียวที่ is_default = true
-- =============================================================================
CREATE TABLE recipe_variants (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  recipe_id     uuid NOT NULL REFERENCES recipes(id) ON DELETE CASCADE,
  name          text NOT NULL DEFAULT 'ปกติ',
  selling_price numeric(10,2) NOT NULL DEFAULT 0,
  is_default    boolean NOT NULL DEFAULT false,
  is_active     boolean NOT NULL DEFAULT true,
  sort_order    int NOT NULL DEFAULT 0,
  created_at    timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_recipe_variants_recipe ON recipe_variants(recipe_id);

-- =============================================================================
-- RECIPE INGREDIENTS — วัตถุดิบต่อ variant
-- ผูกกับ inventory_items เพื่อดึง avg_cost มาคำนวณต้นทุนได้
-- =============================================================================
CREATE TABLE recipe_ingredients (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  variant_id  uuid NOT NULL REFERENCES recipe_variants(id) ON DELETE CASCADE,
  item_id     uuid NOT NULL REFERENCES inventory_items(id) ON DELETE CASCADE,
  quantity    numeric(12,4) NOT NULL DEFAULT 0,
  created_at  timestamptz NOT NULL DEFAULT now(),

  UNIQUE(variant_id, item_id)
);

CREATE INDEX idx_recipe_ingredients_variant ON recipe_ingredients(variant_id);
CREATE INDEX idx_recipe_ingredients_item ON recipe_ingredients(item_id);

-- =============================================================================
-- RLS
-- =============================================================================
ALTER TABLE recipes ENABLE ROW LEVEL SECURITY;
ALTER TABLE recipe_variants ENABLE ROW LEVEL SECURITY;
ALTER TABLE recipe_ingredients ENABLE ROW LEVEL SECURITY;

-- ── RECIPES ──

CREATE POLICY recipes_superadmin ON recipes
  FOR ALL
  USING ((select get_user_role()) = 'superadmin')
  WITH CHECK ((select get_user_role()) = 'superadmin');

CREATE POLICY recipes_owner ON recipes
  FOR ALL
  USING (
    (select get_user_role()) = 'owner'
    AND tenant_id = (select get_user_tenant_id())
  )
  WITH CHECK (
    (select get_user_role()) = 'owner'
    AND tenant_id = (select get_user_tenant_id())
  );

CREATE POLICY recipes_staff_select ON recipes
  FOR SELECT
  USING (
    (select get_user_role()) = 'staff'
    AND tenant_id = (select get_user_tenant_id())
  );

-- ── RECIPE VARIANTS ──

CREATE POLICY recipe_variants_superadmin ON recipe_variants
  FOR ALL
  USING ((select get_user_role()) = 'superadmin')
  WITH CHECK ((select get_user_role()) = 'superadmin');

CREATE POLICY recipe_variants_owner ON recipe_variants
  FOR ALL
  USING (
    (select get_user_role()) = 'owner'
    AND recipe_id IN (SELECT id FROM recipes WHERE tenant_id = (select get_user_tenant_id()))
  )
  WITH CHECK (
    (select get_user_role()) = 'owner'
    AND recipe_id IN (SELECT id FROM recipes WHERE tenant_id = (select get_user_tenant_id()))
  );

CREATE POLICY recipe_variants_staff_select ON recipe_variants
  FOR SELECT
  USING (
    (select get_user_role()) = 'staff'
    AND recipe_id IN (SELECT id FROM recipes WHERE tenant_id = (select get_user_tenant_id()))
  );

-- ── RECIPE INGREDIENTS ──

CREATE POLICY recipe_ingredients_superadmin ON recipe_ingredients
  FOR ALL
  USING ((select get_user_role()) = 'superadmin')
  WITH CHECK ((select get_user_role()) = 'superadmin');

CREATE POLICY recipe_ingredients_owner ON recipe_ingredients
  FOR ALL
  USING (
    (select get_user_role()) = 'owner'
    AND variant_id IN (
      SELECT rv.id FROM recipe_variants rv
      JOIN recipes r ON r.id = rv.recipe_id
      WHERE r.tenant_id = (select get_user_tenant_id())
    )
  )
  WITH CHECK (
    (select get_user_role()) = 'owner'
    AND variant_id IN (
      SELECT rv.id FROM recipe_variants rv
      JOIN recipes r ON r.id = rv.recipe_id
      WHERE r.tenant_id = (select get_user_tenant_id())
    )
  );

CREATE POLICY recipe_ingredients_staff_select ON recipe_ingredients
  FOR SELECT
  USING (
    (select get_user_role()) = 'staff'
    AND variant_id IN (
      SELECT rv.id FROM recipe_variants rv
      JOIN recipes r ON r.id = rv.recipe_id
      WHERE r.tenant_id = (select get_user_tenant_id())
    )
  );
