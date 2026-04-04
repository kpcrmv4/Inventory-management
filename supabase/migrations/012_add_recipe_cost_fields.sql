-- 012_add_recipe_cost_fields.sql
-- เพิ่มชั้นต้นทุนเพิ่มเติมใน recipe_variants (optional — ไม่บังคับกรอก)
-- ร้านที่ไม่ใช้ (เช่น ร้านเหล้า) ปล่อย 0 ได้ ระบบจะคำนวณเฉพาะที่มีค่า

-- ต้นทุนบรรจุภัณฑ์ต่อชิ้น (เช่น กล่อง ถุง ช้อน)
ALTER TABLE recipe_variants
  ADD COLUMN packaging_cost numeric(10,2) NOT NULL DEFAULT 0;

-- ค่า GP Platform % (เช่น Grab 16%, LINE MAN 30%)
-- เก็บเป็นทศนิยม: 0.16 = 16%
ALTER TABLE recipe_variants
  ADD COLUMN gp_platform_pct numeric(5,4) NOT NULL DEFAULT 0;

-- ต้นทุนผันแปรอื่นๆ ต่อชิ้น (เช่น ค่าส่ง, น้ำแข็ง, แก้ว)
ALTER TABLE recipe_variants
  ADD COLUMN other_variable_cost numeric(10,2) NOT NULL DEFAULT 0;
