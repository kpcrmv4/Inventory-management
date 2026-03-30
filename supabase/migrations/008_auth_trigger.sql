-- 008_auth_trigger.sql
-- Auto-create public.users record when auth.users is inserted

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_full_name text;
  v_tenant_id uuid;
  v_role user_role;
BEGIN
  -- Extract full_name from user metadata
  v_full_name := COALESCE(
    NEW.raw_user_meta_data ->> 'full_name',
    NEW.raw_user_meta_data ->> 'name',
    ''
  );

  -- Extract tenant_id if provided during signup
  v_tenant_id := (NEW.raw_user_meta_data ->> 'tenant_id')::uuid;

  -- Default role is owner for new signups
  v_role := 'owner';

  INSERT INTO public.users (id, tenant_id, role, full_name, is_active)
  VALUES (NEW.id, v_tenant_id, v_role, v_full_name, true)
  ON CONFLICT (id) DO NOTHING;

  RETURN NEW;
END;
$$;

-- Trigger on auth.users insert
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();
