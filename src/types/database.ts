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

export interface Database {
  public: {
    Tables: {
      tenants: {
        Row: {
          id: string
          name: string
          plan: PlanType
          status: TenantStatus
          approved_at: string | null
          approved_by: string | null
          expires_at: string | null
          created_at: string
        }
        Insert: Omit<Database['public']['Tables']['tenants']['Row'], 'id' | 'created_at'>
        Update: Partial<Database['public']['Tables']['tenants']['Insert']>
      }
      branches: {
        Row: {
          id: string
          tenant_id: string
          name: string
          address: string | null
          is_active: boolean
          created_at: string
        }
        Insert: Omit<Database['public']['Tables']['branches']['Row'], 'id' | 'created_at'>
        Update: Partial<Database['public']['Tables']['branches']['Insert']>
      }
      users: {
        Row: {
          id: string
          tenant_id: string | null
          branch_id: string | null
          role: UserRole
          full_name: string
          is_active: boolean
          created_at: string
        }
        Insert: Omit<Database['public']['Tables']['users']['Row'], 'id' | 'created_at'>
        Update: Partial<Database['public']['Tables']['users']['Insert']>
      }
      inventory_items: {
        Row: {
          id: string
          tenant_id: string
          branch_id: string
          name: string
          unit: string
          category: InventoryCategory
          is_active: boolean
          created_at: string
        }
        Insert: Omit<Database['public']['Tables']['inventory_items']['Row'], 'id' | 'created_at'>
        Update: Partial<Database['public']['Tables']['inventory_items']['Insert']>
      }
      daily_receiving: {
        Row: {
          id: string
          branch_id: string
          item_id: string
          date: string
          qty: number
          amount: number
          created_at: string
          created_by: string
        }
        Insert: Omit<Database['public']['Tables']['daily_receiving']['Row'], 'id' | 'created_at'>
        Update: Partial<Database['public']['Tables']['daily_receiving']['Insert']>
      }
      employees: {
        Row: {
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
        Insert: Omit<Database['public']['Tables']['employees']['Row'], 'id' | 'created_at'>
        Update: Partial<Database['public']['Tables']['employees']['Insert']>
      }
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
