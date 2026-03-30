# Rules & Project Tracking — Restaurant Inventory Management SaaS

> ไฟล์นี้ใช้ระบุกฎการพัฒนา ติดตามสถานะ และอ้างอิง best practices จาก Agent Skills ที่ติดตั้ง

---

## สถานะโปรเจค (Project Status)

> ตรงกับ PLAN.md — 8 Phases, 35 Tasks

| Phase | ชื่อ | Tasks | สถานะ |
|-------|------|-------|--------|
| 1 | Project Setup & Infrastructure | 1.1-1.9 | ⬜ ยังไม่เริ่ม |
| 2 | Database Schema & Migrations | 2.1-2.7 | ⬜ ยังไม่เริ่ม |
| 3 | Auth & Multi-Tenant | 3.1-3.5 | ⬜ ยังไม่เริ่ม |
| 4 | Inventory Module | 4.1-4.5 | ⬜ ยังไม่เริ่ม |
| 5 | Daily Sale & Expenses | 5.1-5.3 | ⬜ ยังไม่เริ่ม |
| 6 | Labor Management | 6.1-6.3 | ⬜ ยังไม่เริ่ม |
| 7 | P&L, Dashboard & Complaints | 7.1-7.4 | ⬜ ยังไม่เริ่ม |
| 8 | Settings, Polish & Deploy | 8.1-8.7 | ⬜ ยังไม่เริ่ม |

### Task-Level Tracking

| Task | ชื่อ | Size | สถานะ |
|------|------|------|--------|
| 1.1 | สร้างโปรเจค Vite + React + TS | S | ⬜ |
| 1.2 | Folder Structure | S | ⬜ |
| 1.3 | Supabase Client Setup | S | ⬜ |
| 1.4 | PWA Configuration | S | ⬜ |
| 1.5 | Theme System + Base Layout | M | ⬜ |
| 1.6 | React Router + Code Splitting | M | ⬜ |
| 1.7 | Shared UI Components | M | ⬜ |
| 1.8 | Toast Notification | S | ⬜ |
| 1.9 | Date & Currency Utilities | S | ⬜ |
| 2.1 | Enums + Core Tables | M | ⬜ |
| 2.2 | Inventory Tables | L | ⬜ |
| 2.3 | P&L / Sale / Expenses Tables | L | ⬜ |
| 2.4 | Labor & Complaints Tables | M | ⬜ |
| 2.5 | Seed Data | S | ⬜ |
| 2.6 | Database Functions | L | ⬜ |
| 2.7 | TypeScript Types | S | ⬜ |
| 3.1 | Supabase Auth + Provider | M | ⬜ |
| 3.2 | Registration & Login | L | ⬜ |
| 3.3 | RLS Policies ทุกตาราง | XL | ⬜ |
| 3.4 | SuperAdmin Dashboard | L | ⬜ |
| 3.5 | Role-Based Navigation | M | ⬜ |
| 4.1 | Inventory Master Table | L | ⬜ |
| 4.2 | Daily Receiving | M | ⬜ |
| 4.3 | Raw Waste | M | ⬜ |
| 4.4 | Par Stock | L | ⬜ |
| 4.5 | Inventory Reports | M | ⬜ |
| 5.1 | Sales Channels Config | S | ⬜ |
| 5.2 | Daily Sale Entry | XL | ⬜ |
| 5.3 | Other Expenses | L | ⬜ |
| 6.1 | Employee Master Data | M | ⬜ |
| 6.2 | Monthly Labor (FT) | L | ⬜ |
| 6.3 | Monthly Labor (PT + HQ) | M | ⬜ |
| 7.1 | P&L Report | XL | ⬜ |
| 7.2 | Dashboard | L | ⬜ |
| 7.3 | Cross-Branch Report (Pro) | L | ⬜ |
| 7.4 | Complaints | M | ⬜ |
| 8.1 | Branch Management (Pro) | M | ⬜ |
| 8.2 | User/Staff Management | M | ⬜ |
| 8.3 | Plan Upgrade | M | ⬜ |
| 8.4 | Branch Switcher | S | ⬜ |
| 8.5 | Responsive Polish | M | ⬜ |
| 8.6 | Email Notifications | M | ⬜ |
| 8.7 | Deployment | M | ⬜ |

สัญลักษณ์: ⬜ ยังไม่เริ่ม | 🔄 กำลังทำ | ✅ เสร็จแล้ว | ⏸️ พักไว้ก่อน

---

## กฎทั่วไป (General Rules)

### ภาษาและการแสดงผล
- UI ทั้งหมดแสดงเป็น **ภาษาไทย**
- ใช้ **ปีพุทธศักราช (พ.ศ.)** ในการแสดงผล แต่เก็บใน DB เป็น ค.ศ. แล้วแปลงตอน render
- สกุลเงิน **บาท (฿)** — format ด้วย `Intl.NumberFormat('th-TH')`
- ตัวเลขใช้ comma separator เช่น 1,234,567.89

### Naming Conventions
- **Files**: kebab-case (`daily-receiving.tsx`, `use-inventory.ts`)
- **Components**: PascalCase (`DailyReceiving`, `InventoryTable`)
- **Functions/Variables**: camelCase (`totalUsage`, `handleSubmit`)
- **DB Tables/Columns**: snake_case (`inventory_items`, `branch_id`)
- **Constants**: UPPER_SNAKE_CASE (`MAX_BRANCHES`, `SAFETY_STOCK_PCT`)

### Git Conventions
- Branch: `feature/`, `fix/`, `chore/`, `refactor/`
- Commit messages: ภาษาอังกฤษ, conventional commits (`feat:`, `fix:`, `chore:`)
- PR ต้องมี description + test plan

---

## กฎ Database & Supabase (จาก skill: supabase-postgres-best-practices)

### CRITICAL — Query Performance (`query-*`)
- [ ] ทุก foreign key ต้องมี index (`schema-foreign-key-indexes`)
- [ ] เพิ่ม composite index สำหรับ query ที่ filter หลาย column พร้อมกัน เช่น `(tenant_id, branch_id, month, year)`
- [ ] ใช้ partial index สำหรับ query ที่ filter ค่าเฉพาะ เช่น `WHERE is_active = true`
- [ ] ห้ามมี N+1 queries — ใช้ joins หรือ `.select('*, related_table(*)')` ของ Supabase
- [ ] ใช้ `EXPLAIN ANALYZE` ตรวจ query plan ก่อน deploy query ใหม่

### CRITICAL — Connection Management (`conn-*`)
- [ ] ใช้ connection pooling (Supabase มี built-in)
- [ ] ตั้ง idle timeout ไม่ให้ connection ค้าง
- [ ] ใช้ prepared statements สำหรับ query ที่เรียกบ่อย

### CRITICAL — Security & RLS (`security-*`)
- [ ] **ทุก table ต้องเปิด RLS** — ไม่มีข้อยกเว้น
- [ ] RLS policy ต้อง filter ด้วย `tenant_id` เสมอ (multi-tenant isolation)
- [ ] Staff เห็นแค่ `branch_id` ตัวเอง, Owner เห็นทุก branch ใน tenant
- [ ] SuperAdmin bypass ผ่าน `role = 'superadmin'`
- [ ] ห้ามใช้ `SECURITY DEFINER` function โดยไม่จำเป็น
- [ ] ใช้ `auth.uid()` และ custom claims สำหรับ RLS

### HIGH — Schema Design (`schema-*`)
- [ ] Primary key ใช้ `uuid` (gen_random_uuid())
- [ ] ใช้ `timestamptz` สำหรับทุก timestamp column
- [ ] ตั้ง NOT NULL + DEFAULT ที่เหมาะสม
- [ ] ใช้ enum type สำหรับค่าคงที่ (plan, status, role, category)
- [ ] ชื่อ table/column เป็น lowercase snake_case เท่านั้น

### MEDIUM — Data Access Patterns (`data-*`)
- [ ] ใช้ cursor-based pagination สำหรับ list ยาว
- [ ] ใช้ batch insert/upsert สำหรับ bulk operations (daily receiving)
- [ ] ใช้ `ON CONFLICT ... DO UPDATE` สำหรับ upsert patterns

---

## กฎ React & Frontend (จาก skill: vercel-react-best-practices)

### CRITICAL — Eliminating Waterfalls (`async-*`)
- [ ] ใช้ `Promise.all()` สำหรับ fetch ที่ไม่ depend กัน
- [ ] ใช้ `<Suspense>` boundaries แยกส่วนที่โหลดช้า
- [ ] ห้ามทำ sequential await ที่สามารถ parallel ได้
- [ ] Defer non-critical data — โหลด main content ก่อน

### CRITICAL — Bundle Size (`bundle-*`)
- [ ] ห้ามใช้ barrel imports (`index.ts` ที่ re-export ทั้งหมด) — import ตรงจาก file
- [ ] ใช้ `React.lazy()` + dynamic import สำหรับ route-level code splitting
- [ ] Defer third-party scripts ที่ไม่จำเป็นตอน initial load
- [ ] ตรวจ bundle size ด้วย `vite-plugin-visualizer` เป็นระยะ

### HIGH — Client-Side Data Fetching (`client-*`)
- [ ] ใช้ library ที่มี deduplication (เช่น SWR, React Query/TanStack Query)
- [ ] จัดการ event listeners ด้วย cleanup ใน useEffect
- [ ] ใช้ passive event listeners สำหรับ scroll/touch events

### MEDIUM — Re-render Optimization (`rerender-*`)
- [ ] ใช้ `React.memo()` สำหรับ component ที่ render บ่อยแต่ props ไม่เปลี่ยน (เช่น table rows)
- [ ] ใช้ functional setState เมื่อ state ใหม่ depend on state เก่า
- [ ] ใช้ lazy state initialization สำหรับ expensive initial values
- [ ] Derived state คำนวณตรงใน render — ห้ามใช้ useEffect เพื่อ sync state
- [ ] ใช้ `useRef` สำหรับค่าที่เปลี่ยนบ่อยแต่ไม่ต้อง re-render
- [ ] ใช้ `useDeferredValue` / `useTransition` สำหรับ heavy updates

### MEDIUM — Rendering Performance (`rendering-*`)
- [ ] ใช้ `content-visibility: auto` สำหรับ content นอก viewport
- [ ] Hoist static JSX ออกนอก component (ไม่ depend on props/state)
- [ ] ใช้ resource hints (`preload`, `prefetch`) สำหรับ critical resources

---

## กฎ Component Architecture (จาก skill: vercel-composition-patterns)

### HIGH — Component Design (`architecture-*`)
- [ ] ห้ามใช้ boolean props หลายตัว เพื่อ customize behavior — ใช้ composition แทน
- [ ] ใช้ Compound Component pattern สำหรับ UI ที่ซับซ้อน (Forms, Tables, Modals)
- [ ] สร้าง explicit variant components แทน boolean modes เช่น `<InventoryTableReadOnly>` แทน `<InventoryTable editable={false}>`

### MEDIUM — State Management (`state-*`)
- [ ] Decouple state logic ที่ Provider level — component ล่างไม่ต้องรู้ implementation
- [ ] ใช้ Context interface pattern: `{ state, actions, meta }`
- [ ] Lift state ไปยัง Provider เมื่อ siblings ต้องแชร์ state
- [ ] ใช้ `children` สำหรับ composition — หลีกเลี่ยง `renderX` props

### React 19 APIs (`react19-*`)
- [ ] ไม่ต้องใช้ `forwardRef` — ส่ง ref เป็น prop ตรงๆ
- [ ] ใช้ `use()` แทน `useContext()` เมื่อเป็นไปได้

---

## กฎ UI/UX Design (จาก skill: web-design-guidelines)

### Accessibility (A11y)
- [ ] ทุก interactive element ต้อง focusable + มี focus indicator
- [ ] ใช้ semantic HTML (`<nav>`, `<main>`, `<section>`, `<table>`)
- [ ] ทุก `<img>` ต้องมี `alt`, ทุก `<button>` ต้องมี accessible label
- [ ] Color contrast ratio >= 4.5:1 (WCAG AA)
- [ ] รองรับ keyboard navigation ทุกหน้า

### Responsive Design
- [ ] Mobile-first approach (Staff ใช้มือถือกรอกข้อมูล)
- [ ] Breakpoints: `sm:640px`, `md:768px`, `lg:1024px`, `xl:1280px`
- [ ] Sidebar collapse บน mobile
- [ ] Table ใช้ horizontal scroll บน mobile
- [ ] Form fields ใช้ full-width บน mobile
- [ ] Touch targets >= 44x44px

### DaisyUI & Tailwind
- [ ] ใช้ DaisyUI components เป็นหลัก — customize ผ่าน Tailwind utilities
- [ ] Dark mode ผ่าน `data-theme="light"` / `data-theme="dark"`
- [ ] เก็บ theme preference ใน `localStorage`
- [ ] ใช้ Lucide Icons — ห้ามผสม icon libraries
- [ ] Toast notifications ผ่าน React Hot Toast

### Typography & Spacing
- [ ] ใช้ font ที่รองรับภาษาไทยชัดเจน (เช่น Noto Sans Thai, IBM Plex Sans Thai)
- [ ] Consistent spacing — ใช้ Tailwind spacing scale
- [ ] ตัวเลขในตารางใช้ `tabular-nums` / `font-variant-numeric: tabular-nums`

---

## กฎ Business Logic สำคัญ (จาก CLAUDE.md)

### Inventory
- [ ] `usage_qty = opening_qty + Σreceived_qty − closing_qty`
- [ ] `usage_amount = opening_amount + Σreceived_amount − closing_amount`
- [ ] `avg_daily_usage = usage_qty / selling_days` — ต้อง guard division by zero
- [ ] `usage_per_10000 = (usage_qty / total_monthly_sales) × 10000` — guard div/0
- [ ] COGS ดึงจาก Inventory **อัตโนมัติเท่านั้น** — ห้ามกรอกมือ
- [ ] Par Stock safety stock default = 2%

### P&L
- [ ] `GP = Revenue − COGS − Labor`
- [ ] `PAC = GP − Controllable Expenses`
- [ ] `EBITDA = PAC − Non-controllable Expenses`
- [ ] `EBIT = EBITDA − Depreciation`
- [ ] `Net Profit = EBIT − Interest − Tax`
- [ ] ค่าเสื่อม (0601) = `total_depreciation / lease_months`
- [ ] GP Commission (0504) = ยอด Delivery × commission rate แต่ละ platform

### Labor
- [ ] `OT 1.0x = (salary/30/8) × hours`
- [ ] `OT 1.5x = (salary/30/8) × 1.5 × hours`
- [ ] `OT 3.0x = (salary/30/8) × 3 × hours`
- [ ] `Late deduction = (salary/30/8/60) × minutes`
- [ ] `Leave deduction = (salary/30) × days`
- [ ] `Net Pay = Total Income + Total Deductions` (deductions เป็นค่าลบ)

### Division by Zero Guards
- [ ] `selling_days = 0` → `avg_daily_usage = 0`
- [ ] `total_monthly_sales = 0` → `usage_per_10000 = 0`
- [ ] `opening_qty = 0` → `avg_cost_fallback = 0`
- [ ] `purchased_qty = 0` → `avg_cost_from_purchase = 0`

---

## โครงสร้าง Folder (Target)

```
src/
├── app/
│   ├── routes/                    ← React Router v6
│   │   ├── index.tsx              ← Landing/Login
│   │   ├── register.tsx
│   │   ├── pending.tsx
│   │   ├── superadmin/
│   │   │   ├── dashboard.tsx
│   │   │   ├── tenants.tsx
│   │   │   └── settings.tsx
│   │   └── app/
│   │       ├── dashboard.tsx
│   │       ├── inventory/
│   │       │   ├── main-table.tsx
│   │       │   ├── receiving.tsx
│   │       │   ├── raw-waste.tsx
│   │       │   ├── par-stock.tsx
│   │       │   └── report.tsx
│   │       ├── pl/
│   │       │   ├── report.tsx
│   │       │   ├── daily-sale.tsx
│   │       │   ├── expenses.tsx
│   │       │   └── labor/
│   │       │       ├── ft.tsx
│   │       │       ├── pt.tsx
│   │       │       └── hq.tsx
│   │       ├── complaints.tsx
│   │       └── settings/
│   │           ├── branches.tsx
│   │           └── users.tsx
│   └── providers/
│       ├── auth-provider.tsx
│       ├── theme-provider.tsx
│       └── toast-provider.tsx
├── features/
│   ├── auth/
│   ├── inventory/
│   ├── pl/
│   ├── daily-sale/
│   ├── labor/
│   ├── expenses/
│   └── report/
├── components/
│   ├── ui/                        ← Shared DaisyUI-based components
│   └── layout/                    ← Sidebar, Navbar, ThemeToggle
├── lib/
│   ├── supabase.ts
│   ├── utils.ts
│   └── constants.ts
└── hooks/
```

---

## Supabase Tables Checklist

| Table | สถานะ | RLS | Index | หมายเหตุ |
|-------|--------|-----|-------|---------|
| tenants | ⬜ | ⬜ | ⬜ | |
| branches | ⬜ | ⬜ | ⬜ | |
| users | ⬜ | ⬜ | ⬜ | extends auth.users |
| plan_upgrades | ⬜ | ⬜ | ⬜ | |
| inventory_items | ⬜ | ⬜ | ⬜ | name, unit, category |
| opening_stock | ⬜ | ⬜ | ⬜ | |
| daily_receiving | ⬜ | ⬜ | ⬜ | |
| closing_stock | ⬜ | ⬜ | ⬜ | |
| raw_waste | ⬜ | ⬜ | ⬜ | trimmed/untrimmed |
| sales_targets | ⬜ | ⬜ | ⬜ | |
| daily_sales | ⬜ | ⬜ | ⬜ | |
| sales_channels | ⬜ | ⬜ | ⬜ | dine_in/delivery |
| monthly_expenses | ⬜ | ⬜ | ⬜ | |
| employees | ⬜ | ⬜ | ⬜ | ft/pt/hq |
| monthly_labor | ⬜ | ⬜ | ⬜ | |
| complaints | ⬜ | ⬜ | ⬜ | |
