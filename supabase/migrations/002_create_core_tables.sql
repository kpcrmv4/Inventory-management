-- 002_create_core_tables.sql
-- Core tables: tenants, branches, users, plan_upgrades

-- =============================================================================
-- TENANTS
-- =============================================================================
CREATE TABLE tenants (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name        text NOT NULL,
  plan        plan_type NOT NULL DEFAULT 'standard',
  status      tenant_status NOT NULL DEFAULT 'pending',
  approved_at timestamptz,
  approved_by uuid,
  expires_at  timestamptz,
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_tenants_status ON tenants (status);

-- =============================================================================
-- BRANCHES
-- =============================================================================
CREATE TABLE branches (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id   uuid NOT NULL REFERENCES tenants (id) ON DELETE CASCADE,
  name        text NOT NULL,
  address     text,
  is_active   boolean NOT NULL DEFAULT true,
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_branches_tenant_id ON branches (tenant_id);

-- Function to enforce max branches per plan
CREATE OR REPLACE FUNCTION check_branch_limit()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_plan plan_type;
  v_count int;
  v_max int;
BEGIN
  SELECT plan INTO v_plan FROM tenants WHERE id = NEW.tenant_id;

  SELECT count(*) INTO v_count
  FROM branches
  WHERE tenant_id = NEW.tenant_id AND is_active = true;

  IF v_plan = 'standard' THEN
    v_max := 1;
  ELSIF v_plan = 'pro' THEN
    v_max := 5;
  ELSE
    v_max := 1;
  END IF;

  IF v_count >= v_max THEN
    RAISE EXCEPTION 'Branch limit reached for plan %. Max allowed: %', v_plan, v_max;
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_check_branch_limit
  BEFORE INSERT ON branches
  FOR EACH ROW
  EXECUTE FUNCTION check_branch_limit();

-- =============================================================================
-- USERS (extends auth.users)
-- =============================================================================
CREATE TABLE users (
  id          uuid PRIMARY KEY,  -- = auth.uid()
  tenant_id   uuid REFERENCES tenants (id) ON DELETE SET NULL,
  branch_id   uuid REFERENCES branches (id) ON DELETE SET NULL,
  role        user_role NOT NULL DEFAULT 'staff',
  full_name   text NOT NULL DEFAULT '',
  is_active   boolean NOT NULL DEFAULT true,
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_users_tenant_id ON users (tenant_id);
CREATE INDEX idx_users_branch_id ON users (branch_id);
CREATE INDEX idx_users_role ON users (role);

-- Add FK from tenants.approved_by -> users.id (deferred to avoid circular dep)
ALTER TABLE tenants
  ADD CONSTRAINT fk_tenants_approved_by
  FOREIGN KEY (approved_by) REFERENCES users (id) ON DELETE SET NULL;

-- =============================================================================
-- PLAN UPGRADES
-- =============================================================================
CREATE TABLE plan_upgrades (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id   uuid NOT NULL REFERENCES tenants (id) ON DELETE CASCADE,
  from_plan   plan_type NOT NULL,
  to_plan     plan_type NOT NULL,
  upgraded_at timestamptz NOT NULL DEFAULT now(),
  upgraded_by uuid NOT NULL REFERENCES users (id) ON DELETE SET NULL
);

CREATE INDEX idx_plan_upgrades_tenant_id ON plan_upgrades (tenant_id);
