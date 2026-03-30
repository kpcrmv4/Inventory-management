-- 001_create_enums.sql
-- All enum types for the Restaurant Inventory Management SaaS

CREATE TYPE plan_type AS ENUM ('standard', 'pro');

CREATE TYPE tenant_status AS ENUM ('pending', 'active', 'suspended');

CREATE TYPE user_role AS ENUM ('superadmin', 'owner', 'staff');

CREATE TYPE employee_type AS ENUM ('ft', 'pt', 'hq');

CREATE TYPE waste_type AS ENUM ('trimmed', 'untrimmed');

CREATE TYPE inventory_category AS ENUM (
  '0201_dry',
  '0201_frozen',
  '0202',
  '0203',
  '0204',
  '0205',
  '0409'
);

CREATE TYPE channel_type AS ENUM ('dine_in', 'delivery');

CREATE TYPE discount_type AS ENUM ('0111', '0112', '0113');
