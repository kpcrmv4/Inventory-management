-- 008_auth_trigger.sql
-- Auto-create tenant + branch + user when auth.users is inserted during signup

-- Drop old trigger/function if exists
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user();

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_full_name text;
  v_store_name text;
  v_plan plan_type;
  v_tenant_id uuid;
  v_branch_id uuid;
BEGIN
  -- Extract metadata from signup
  v_full_name := COALESCE(
    NEW.raw_user_meta_data ->> 'full_name',
    NEW.raw_user_meta_data ->> 'name',
    ''
  );
  v_store_name := NEW.raw_user_meta_data ->> 'store_name';
  v_plan := COALESCE(
    (NEW.raw_user_meta_data ->> 'plan')::plan_type,
    'standard'
  );

  -- If store_name provided = new tenant signup
  IF v_store_name IS NOT NULL AND v_store_name != '' THEN
    -- Create tenant (pending approval)
    INSERT INTO public.tenants (id, name, plan, status)
    VALUES (gen_random_uuid(), v_store_name, v_plan, 'pending')
    RETURNING id INTO v_tenant_id;

    -- Create default branch
    INSERT INTO public.branches (id, tenant_id, name, is_active)
    VALUES (gen_random_uuid(), v_tenant_id, v_store_name || ' - สาขาหลัก', true)
    RETURNING id INTO v_branch_id;

    -- Create user as owner (can see all branches)
    -- ON CONFLICT DO UPDATE เผื่อ user record ถูกสร้างไว้แล้วโดย trigger เก่า
    INSERT INTO public.users (id, tenant_id, branch_id, role, full_name, is_active)
    VALUES (NEW.id, v_tenant_id, NULL, 'owner', v_full_name, true)
    ON CONFLICT (id) DO UPDATE
      SET tenant_id = EXCLUDED.tenant_id,
          role = 'owner',
          full_name = EXCLUDED.full_name;
  ELSE
    -- Staff invite or other signup — just create user record
    v_tenant_id := (NEW.raw_user_meta_data ->> 'tenant_id')::uuid;
    v_branch_id := (NEW.raw_user_meta_data ->> 'branch_id')::uuid;

    INSERT INTO public.users (id, tenant_id, branch_id, role, full_name, is_active)
    VALUES (
      NEW.id,
      v_tenant_id,
      v_branch_id,
      COALESCE((NEW.raw_user_meta_data ->> 'role')::user_role, 'staff'),
      v_full_name,
      true
    )
    ON CONFLICT (id) DO UPDATE
      SET tenant_id = COALESCE(EXCLUDED.tenant_id, public.users.tenant_id),
          branch_id = COALESCE(EXCLUDED.branch_id, public.users.branch_id),
          full_name = EXCLUDED.full_name;
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();
