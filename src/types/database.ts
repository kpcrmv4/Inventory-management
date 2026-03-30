export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type PlanType = 'standard' | 'pro'
export type TenantStatus = 'pending' | 'active' | 'suspended'
export type UserRole = 'superadmin' | 'owner' | 'staff'
export type EmployeeType = 'ft' | 'pt' | 'hq'
export type WasteType = 'trimmed' | 'untrimmed'
export type ChannelType = 'dine_in' | 'delivery'

export type InventoryCategory =
  | '0201_dry'
  | '0201_frozen'
  | '0202'
  | '0203'
  | '0204'
  | '0205'
  | '0409'

/* ------------------------------------------------------------------ */
/*  Row types — used directly in application code                     */
/* ------------------------------------------------------------------ */

export interface Tenant {
  id: string
  name: string
  plan: PlanType
  status: TenantStatus
  approved_at: string | null
  approved_by: string | null
  expires_at: string | null
  created_at: string
}

export interface Branch {
  id: string
  tenant_id: string
  name: string
  address: string | null
  is_active: boolean
  created_at: string
}

export interface UserProfile {
  id: string
  tenant_id: string | null
  branch_id: string | null
  role: UserRole
  full_name: string
  is_active: boolean
  created_at: string
}

export interface PlanUpgrade {
  id: string
  tenant_id: string
  from_plan: PlanType
  to_plan: PlanType
  upgraded_at: string
  upgraded_by: string
}

export interface InventoryItem {
  id: string
  tenant_id: string
  branch_id: string
  name: string
  unit: string
  category: InventoryCategory
  is_active: boolean
  created_at: string
}

export interface InventoryMonthlyHeader {
  id: string
  branch_id: string
  month: number
  year: number
  total_monthly_sales: number
  selling_days: number
  created_at: string
}

export interface OpeningStock {
  id: string
  item_id: string
  branch_id: string
  month: number
  year: number
  quantity: number
  amount: number
  created_at: string
}

export interface ClosingStock {
  id: string
  item_id: string
  branch_id: string
  month: number
  year: number
  unit_price: number
  quantity: number
  created_at: string
}

export interface RawWaste {
  id: string
  branch_id: string
  item_id: string
  date: string
  qty: number
  type: WasteType
  created_at: string
  created_by: string
}

export interface DailyReceiving {
  id: string
  branch_id: string
  item_id: string
  date: string
  qty: number
  amount: number
  created_at: string
  created_by: string
}

export interface SalesChannel {
  id: string
  tenant_id: string
  code: string
  name: string
  type: ChannelType
  commission_pct: number
  is_active: boolean
  sort_order: number
  created_at: string
}

export interface DailySale {
  id: string
  branch_id: string
  date: string
  channel_id: string
  amount: number
  bills: number
  heads: number
  gp_commission: number
  created_at: string
  created_by: string
}

export interface DailySaleDiscount {
  id: string
  branch_id: string
  date: string
  code: string
  amount: number
  created_at: string
}

export interface DailySaleExtra {
  id: string
  branch_id: string
  date: string
  code: string
  amount: number
  created_at: string
}

export interface SalesTarget {
  id: string
  branch_id: string
  date: string
  target_amount: number
  created_at: string
}

export interface MonthlyExpense {
  id: string
  branch_id: string
  code: string
  amount: number
  units: number | null
  date: string | null
  month: number
  year: number
  label: string | null
  created_at: string
}

export interface DepreciationSetting {
  id: string
  branch_id: string
  total_depreciation: number
  lease_months: number
  created_at: string
}

export interface Employee {
  id: string
  tenant_id: string
  branch_id: string
  name: string
  position: string
  salary: number
  type: EmployeeType
  is_active: boolean
  start_date: string
  created_at: string
}

export interface MonthlyLabor {
  id: string
  branch_id: string
  employee_id: string
  month: number
  year: number
  salary: number
  ot_1x_hours: number
  ot_1x_amount: number
  ot_15x_hours: number
  ot_15x_amount: number
  ot_3x_hours: number
  ot_3x_amount: number
  ot_custom: number
  service_charge: number
  incentive: number
  food_allowance: number
  transport_allowance: number
  diligence: number
  total_income: number
  sick_leave_days: number
  sick_leave_amount: number
  personal_leave_days: number
  personal_leave_amount: number
  absent_days: number
  absent_amount: number
  late_minutes: number
  late_amount: number
  loan_deduction: number
  tax_deduction: number
  social_security: number
  total_deductions: number
  net_pay: number
  created_at: string
}

export interface Complaint {
  id: string
  tenant_id: string
  branch_id: string
  complaint_date: string
  type: string
  detail: string
  image_url: string | null
  staff_id: string | null
  resolved_at: string | null
  created_by: string
  created_at: string
}

/* ------------------------------------------------------------------ */
/*  Supabase Database type — maps table names to Row types            */
/*  Using simple Row/Insert/Update so Supabase client infers properly */
/* ------------------------------------------------------------------ */

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type TableDef<T extends Record<string, any>> = {
  Row: T
  Insert: Partial<T> & Omit<T, 'id' | 'created_at'>
  Update: Partial<T>
}

export interface Database {
  public: {
    Tables: {
      tenants: TableDef<Tenant>
      branches: TableDef<Branch>
      users: TableDef<UserProfile>
      plan_upgrades: TableDef<PlanUpgrade>
      inventory_items: TableDef<InventoryItem>
      inventory_monthly_header: TableDef<InventoryMonthlyHeader>
      opening_stock: TableDef<OpeningStock>
      closing_stock: TableDef<ClosingStock>
      raw_waste: TableDef<RawWaste>
      daily_receiving: TableDef<DailyReceiving>
      sales_channels: TableDef<SalesChannel>
      daily_sales: TableDef<DailySale>
      daily_sale_discounts: TableDef<DailySaleDiscount>
      daily_sale_extras: TableDef<DailySaleExtra>
      sales_targets: TableDef<SalesTarget>
      monthly_expenses: TableDef<MonthlyExpense>
      depreciation_settings: TableDef<DepreciationSetting>
      employees: TableDef<Employee>
      monthly_labor: TableDef<MonthlyLabor>
      complaints: TableDef<Complaint>
    }
    Enums: {
      plan_type: PlanType
      tenant_status: TenantStatus
      user_role: UserRole
      employee_type: EmployeeType
      waste_type: WasteType
      inventory_category: InventoryCategory
    }
  }
}
