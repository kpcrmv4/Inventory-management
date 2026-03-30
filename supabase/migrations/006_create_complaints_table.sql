-- 006_create_complaints_table.sql
-- Customer complaints table

CREATE TABLE complaints (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       uuid NOT NULL REFERENCES tenants (id) ON DELETE CASCADE,
  branch_id       uuid NOT NULL REFERENCES branches (id) ON DELETE CASCADE,
  complaint_date  date NOT NULL DEFAULT CURRENT_DATE,
  type            text NOT NULL DEFAULT '',
  detail          text NOT NULL DEFAULT '',
  image_url       text,
  staff_id        uuid REFERENCES users (id) ON DELETE SET NULL,
  resolved_at     timestamptz,
  created_by      uuid REFERENCES users (id) ON DELETE SET NULL,
  created_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_complaints_tenant_id ON complaints (tenant_id);
CREATE INDEX idx_complaints_branch_id ON complaints (branch_id);
CREATE INDEX idx_complaints_date ON complaints (complaint_date);
