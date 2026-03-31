-- 011_fix_existing_users.sql
-- แก้ข้อมูล user ที่สมัครไปแล้วแต่ auth trigger เก่าไม่ได้สร้าง tenant/branch
-- รันครั้งเดียวหลังอัปเดต trigger ตัวใหม่

-- สร้าง tenant + branch ให้ user ที่มี store_name ใน metadata แต่ยังไม่มี tenant
DO $$
DECLARE
  v_user record;
  v_tenant_id uuid;
  v_store_name text;
  v_plan plan_type;
BEGIN
  FOR v_user IN
    SELECT au.id, au.raw_user_meta_data, au.email
    FROM auth.users au
    LEFT JOIN public.users pu ON pu.id = au.id
    WHERE (pu.tenant_id IS NULL OR pu.id IS NULL)
      AND au.raw_user_meta_data ->> 'store_name' IS NOT NULL
      AND au.raw_user_meta_data ->> 'store_name' != ''
  LOOP
    v_store_name := v_user.raw_user_meta_data ->> 'store_name';
    v_plan := COALESCE((v_user.raw_user_meta_data ->> 'plan')::plan_type, 'standard');

    -- สร้าง tenant
    INSERT INTO public.tenants (id, name, plan, status)
    VALUES (gen_random_uuid(), v_store_name, v_plan, 'pending')
    RETURNING id INTO v_tenant_id;

    -- สร้าง branch
    INSERT INTO public.branches (id, tenant_id, name, is_active)
    VALUES (gen_random_uuid(), v_tenant_id, v_store_name || ' - สาขาหลัก', true);

    -- อัปเดต/สร้าง user record
    INSERT INTO public.users (id, tenant_id, branch_id, role, full_name, is_active)
    VALUES (
      v_user.id, v_tenant_id, NULL, 'owner',
      COALESCE(v_user.raw_user_meta_data ->> 'full_name', ''), true
    )
    ON CONFLICT (id) DO UPDATE
      SET tenant_id = EXCLUDED.tenant_id,
          role = 'owner',
          full_name = EXCLUDED.full_name;

    RAISE NOTICE 'Created tenant "%" for user %', v_store_name, v_user.email;
  END LOOP;
END;
$$;

-- ===== ตั้ง SuperAdmin =====
-- เปลี่ยน email ให้ตรงกับ admin ของคุณ
-- รัน SQL นี้ใน Supabase SQL Editor:
--
--   UPDATE public.users
--   SET role = 'superadmin', tenant_id = NULL, branch_id = NULL
--   WHERE id = (SELECT id FROM auth.users WHERE email = 'admin@kpcrm.net');
