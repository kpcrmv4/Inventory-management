# CLAUDE.md — Restaurant Inventory Management SaaS

## ภาพรวมระบบ

ระบบจัดการร้านอาหารแบบ SaaS (Software as a Service) สำหรับธุรกิจร้านอาหาร ใช้บริหาร Inventory (วัตถุดิบ/บรรจุภัณฑ์/วัสดุสิ้นเปลือง) และ P&L (งบกำไร-ขาดทุน) รายเดือน รองรับหลาย Tenant และหลายสาขา

ระบบแสดงผลเป็นภาษาไทย ใช้ปีพุทธศักราช (พ.ศ. = ค.ศ. + 543) สกุลเงินบาท

---

## ส่วนที่ 0: สถาปัตยกรรมระบบ (SaaS Architecture)

### 0.1 Tech Stack

```
Frontend                    Backend / DB              Deploy
──────────────────          ──────────────────        ──────────────
React (Vite)                Supabase                  Vercel (Frontend)
Tailwind CSS                ├── PostgreSQL             Supabase (Backend)
DaisyUI                     ├── Auth (JWT)
Lucide Icons                ├── Row Level Security
React Hot Toast             ├── Storage
PWA (vite-plugin-pwa)       └── Edge Functions
SPA (React Router v6)
Dark Mode (DaisyUI themes)
Responsive Design
```

### 0.2 Multi-Tenant Architecture

```
SuperAdmin
└── จัดการ Tenant ทั้งหมด / Approve / Billing / Feature Flags

Tenant (ร้านอาหาร 1 บริษัท/เจ้าของ)
├── Plan: Standard  → 1 Branch
└── Plan: Pro       → สูงสุด 5 Branches (สร้างเองได้)

Owner (ต่อ Tenant)
└── เข้าถึงได้ทุก Branch ใน Tenant ตัวเอง

Staff (ต่อ Branch)
└── เข้าถึงได้เฉพาะ Branch ที่ถูก Assign
```

### 0.3 Subscription Plans

| Feature | Standard | Pro |
|---------|----------|-----|
| จำนวน Branch | 1 | สูงสุด 5 |
| Inventory | ✅ | ✅ |
| P&L | ✅ | ✅ |
| Labor Management | ✅ | ✅ |
| Cross-branch Report | ❌ | ✅ |
| Consolidated P&L | ❌ | ✅ |
| Upgrade ได้ | → Pro | - |
| ราคา | รายปี | รายปี |

### 0.4 User Roles & Permissions

| Action | SuperAdmin | Owner | Staff |
|--------|-----------|-------|-------|
| Approve Tenant | ✅ | ❌ | ❌ |
| จัดการ Tenant ทั้งหมด | ✅ | ❌ | ❌ |
| ดู P&L Report | ✅ | ✅ | ❌ |
| จัดการพนักงาน | ✅ | ✅ | ❌ |
| แก้ไข Master Data | ✅ | ✅ | ❌ |
| ป้อนของเข้า / Waste | ✅ | ✅ | ✅ |
| กรอก Daily Sale | ✅ | ✅ | ✅ |
| กรอกค่าใช้จ่ายรายวัน | ✅ | ✅ | ✅ |
| จัดการ Branch (Pro) | ✅ | ✅ | ❌ |

### 0.5 Signup & Approval Flow

```
1. ผู้ใช้สมัคร (กรอกชื่อร้าน, เลือก Plan, ข้อมูลติดต่อ)
2. สถานะ: pending → รอ SuperAdmin อนุมัติ
3. SuperAdmin ตรวจสอบและ Approve / Reject
4. หลัง Approve: ระบบส่ง Email แจ้ง → ผู้ใช้ Login ได้
5. Tenant expires_at = approved_at + 1 ปี (ต่ออายุรายปี)
```

### 0.6 Database Schema (Supabase)

```sql
-- TENANTS
tenants
├── id            uuid PK
├── name          text                          ← ชื่อร้าน/บริษัท
├── plan          enum('standard','pro')
├── status        enum('pending','active','suspended')
├── approved_at   timestamp
├── approved_by   uuid FK users
├── expires_at    timestamp                     ← รายปี
└── created_at    timestamp

-- BRANCHES
branches
├── id            uuid PK
├── tenant_id     uuid FK tenants
├── name          text
├── address       text
├── is_active     boolean
└── created_at    timestamp

-- USERS (extends auth.users)
users
├── id            uuid PK (= auth.uid)
├── tenant_id     uuid FK tenants
├── branch_id     uuid FK branches             ← null = Owner (เข้าได้ทุก branch)
├── role          enum('superadmin','owner','staff')
├── full_name     text
├── is_active     boolean
└── created_at    timestamp

-- PLAN UPGRADE LOG
plan_upgrades
├── id            uuid PK
├── tenant_id     uuid FK
├── from_plan     enum
├── to_plan       enum
├── upgraded_at   timestamp
└── upgraded_by   uuid FK users
```

### 0.7 Row Level Security (RLS) แนวคิดหลัก

```sql
-- Staff เห็นแค่ branch ตัวเอง
policy: tenant_id = auth.tenant_id
        AND (role = 'owner' OR branch_id = auth.branch_id)

-- Owner เห็นทุก branch ใน tenant ตัวเอง
policy: tenant_id = auth.tenant_id AND role = 'owner'

-- SuperAdmin เห็นทุก tenant
policy: role = 'superadmin'
```

### 0.8 Folder Structure (React/Vite)

```
src/
├── app/
│   ├── routes/              ← React Router v6
│   └── providers/           ← Auth, Theme, Toast
├── features/
│   ├── auth/                ← Login, Register, Approve
│   ├── inventory/           ← Inventory logic ทั้งหมด
│   ├── pl/                  ← P&L logic
│   ├── daily-sale/          ← บันทึกยอดขายรายวัน
│   ├── labor/               ← FT / PT / HQ
│   ├── expenses/            ← Other expenses
│   └── report/              ← Reports & Analytics
├── components/
│   ├── ui/                  ← Shared components (DaisyUI based)
│   └── layout/              ← Sidebar, Navbar, ThemeToggle
├── lib/
│   ├── supabase.ts
│   └── utils.ts
└── hooks/                   ← Custom React hooks
```

### 0.9 Route Structure

```
/                            ← Landing / Login
/register                    ← สมัคร (เลือก Plan)
/pending                     ← หน้ารอ Approve

/superadmin/
├── dashboard
├── tenants                  ← Approve / Suspend / ดูรายละเอียด
└── settings

/app/                        ← Owner + Staff (ต้อง login + active)
├── dashboard                ← Overview สรุป KPI
├── inventory/
│   ├── main-table           ← ข้อมูลหลัก Inventory
│   ├── receiving            ← ป้อนของเข้ารายวัน
│   ├── raw-waste            ← บันทึก Waste
│   ├── par-stock            ← ประมาณการสั่งซื้อ
│   └── report               ← Report การใช้วัตถุดิบ
├── pl/
│   ├── report               ← งบ P&L
│   ├── daily-sale           ← บันทึกยอดขายรายวัน
│   ├── expenses             ← Other expenses
│   └── labor/
│       ├── ft               ← พนักงาน Full-Time
│       ├── pt               ← พนักงาน Part-Time
│       └── hq               ← ทีม HQ
├── complaints               ← ข้อร้องเรียนลูกค้า
└── settings/
    ├── branches             ← Pro only: จัดการสาขา
    └── users                ← จัดการ Staff
```

---

## ส่วนที่ 1: INVENTORY (ระบบคลังวัตถุดิบ)

### 1.1 หมวดหมู่สินค้า (Category)

สินค้าจัดเป็น 7 หมวด แต่ละหมวดมี section แยกกัน:

| รหัส | ชื่อหมวด | ตัวอย่าง |
|------|----------|---------|
| 0201_dry | วัตถุดิบอาหาร (แห้ง) | ซอส เครื่องปรุง ข้าว แป้ง |
| 0201_frozen | วัตถุดิบอาหาร (แช่เย็น-แช่แข็ง) | เนื้อสัตว์ อาหารทะเล ผัก |
| 0202 | วัตถุดิบเครื่องดื่ม | นม กาแฟ ชา น้ำผลไม้ |
| 0203 | เครื่องดื่มแอลกอฮอล์ | เบียร์ ไวน์ สุรา |
| 0204 | วัตถุดิบขนมหวาน | แป้ง น้ำตาล ครีม |
| 0205 | บรรจุภัณฑ์ | กล่อง ถุง ขวด |
| 0409 | วัสดุสิ้นเปลือง | ผ้าเช็ด สก็อตไบรท์ ถุงมือ |

### 1.2 ข้อมูลหลัก Inventory (Supabase Tables)

**Header ระดับเดือน:**
- `total_monthly_sales` = ยอดขายรวมเดือน (รวมส่วนลด) ← ใช้คำนวณ Usage per 10,000 บาท
- `selling_days` = จำนวนวันขาย ← ใช้คำนวณค่าเฉลี่ยใช้ต่อวัน

**ข้อมูลแต่ละรายการ:**

| Field | ประเภท | หมายเหตุ |
|-------|--------|---------|
| name | ข้อมูลคงที่ | ชื่อรายการ |
| unit | ข้อมูลคงที่ | หน่วยนับ |
| opening_qty | กรอกมือ | ยอดตั้งต้น (จำนวน) |
| opening_amount | กรอกมือ | ยอดตั้งต้น (เงิน) |
| daily_receiving | กรอกมือ | รับเข้ารายวัน (จำนวน, เงิน) |
| closing_unit_price | กรอกมือ | ราคาต่อหน่วยสิ้นเดือน |
| closing_qty | กรอกมือ | ยอดคงเหลือสิ้นเดือน (นับจริง) |

**คำนวณอัตโนมัติ:**

| Field | สูตร |
|-------|------|
| closing_amount | `closing_unit_price × closing_qty` |
| usage_qty | `opening_qty + Σreceived_qty − closing_qty` |
| usage_amount | `opening_amount + Σreceived_amount − closing_amount` |
| avg_daily_usage | `usage_qty / selling_days` |
| total_purchased_qty | `usage_qty − opening_qty + closing_qty` |
| avg_cost_from_purchase | `IF(purchased=0, 0, (usage_amount − opening_amount + closing_amount) / purchased)` |
| avg_cost_fallback | `IF(no purchase, opening_amount / opening_qty, 0)` |
| usage_per_10000 | `(usage_qty / total_monthly_sales) × 10000` |
| usage_per_1000 | `(usage_qty / total_monthly_sales) × 1000` |

**สูตร COGS หลัก:**
```
Usage Amount = Opening Amount + Total Purchases − Closing Amount
ต้นทุนวัตถุดิบ = ยอดตั้งต้น + ยอดซื้อทั้งเดือน − ยอดคงเหลือสิ้นเดือน
```

### 1.3 การรับของเข้ารายวัน (Daily Receiving)

- Staff กรอก: ชื่อสินค้า (เลือกจาก dropdown), จำนวนซื้อ, จำนวนเงิน
- รองรับรายการซื้อหลายรายการต่อวัน (ไม่จำกัด)
- ข้อมูลถูก aggregate กลับไปยัง Inventory หลักอัตโนมัติ

### 1.4 Raw Waste (ของเสีย/วัตถุดิบเสียหาย)

แบ่งเป็น 2 ประเภท:
- **Trimmed (ตัดแต่งแล้ว)**: วัตถุดิบที่ผ่านการตัดแต่งแล้วเสียหาย
- **Untrimmed (ยังไม่ตัดแต่ง)**: วัตถุดิบที่ยังไม่ได้ตัดแต่งแต่เสียหาย

| Field | หมายเหตุ |
|-------|---------|
| item (ต่อวัน) | จำนวน waste แต่ละรายการ |
| avg_cost | `IF(avg_cost_from_purchase = 0, avg_cost_fallback, avg_cost_from_purchase)` |
| total_waste_qty | `SUM(วัน 1-31)` |
| total_waste_amount | `total_waste_qty × avg_cost` |

### 1.5 Sales Target (เป้าการขายรายวัน)

| Field | หมายเหตุ |
|-------|---------|
| day_of_week | จันทร์-อาทิตย์ |
| date | วันที่ 1-31 |
| target_amount | เป้าการขาย (บาท) |
| monthly_total | SUM ทั้งเดือน |

ใช้สำหรับคำนวณ Par Stock และเปรียบเทียบกับยอดขายจริง

### 1.6 Par Stock (ประมาณการสั่งซื้อวัตถุดิบ)

**สูตรหลัก:**

| Field | สูตร |
|-------|------|
| usage_per_10000 | ← ดึงจาก Inventory หลัก |
| estimated_monthly_usage | `(usage_per_10000 × monthly_sales_target) / 10000` |
| with_safety_stock | `estimated_monthly_usage × (1 + safety_stock_pct)` |
| estimated_cost | `with_safety_stock × avg_cost` |
| daily_par | `(with_safety_stock / monthly_sales_target) × daily_sales_target` |

- Safety Stock % เริ่มต้น = 2%
- ⚠️ Par Stock ใช้ข้อมูล Actual (รวม waste, สูญหาย) ไม่ใช่ Base Case จากสูตรอาหาร

### 1.7 Report การใช้วัตถุดิบ

รายงาน 3 ส่วน:
1. **Ranking จำนวนการใช้** — เรียงตามจำนวนที่ใช้มากที่สุด
2. **Ranking ยอดเงินการใช้** — เรียงตามยอดเงินที่ใช้มากที่สุด
3. **Ranking จำนวนการซื้อ** — เรียงตามจำนวนที่ซื้อมากที่สุด

แสดงยอดรวมแต่ละหมวด: 0201 อาหาร / 0202 เครื่องดื่ม / 0203 แอลกอฮอล์ / 0204 ขนมหวาน / 0205 บรรจุภัณฑ์ / 0409 วัสดุสิ้นเปลือง

---

## ส่วนที่ 2: P&L (งบกำไร-ขาดทุน)

### 2.1 โครงสร้างงบ P&L

```
═══════════════════════════════════════════════════════
รายได้การขาย (Revenue)
═══════════════════════════════════════════════════════
0101-0109  รายได้แยกตามช่องทาง (หน้าร้าน + Delivery)
0110       รายได้อื่นๆ
0111       ส่วนลดหน้าร้าน
0112       ส่วนลด Delivery (รวมทุก platform)
0113       ส่วนลด Entertain
0114       VAT (กรอกมือ ใส่เครื่องหมาย "-")
0115       เงินสด ส่วนเกิน/ส่วนขาด
───────────────────────────────────────────────────────
           รวมรายได้การขาย
═══════════════════════════════════════════════════════

═══════════════════════════════════════════════════════
ต้นทุนขาย (COGS)  ← ดึงจาก Inventory อัตโนมัติ
═══════════════════════════════════════════════════════
0201  วัตถุดิบอาหาร       ← Inventory usage_amount
0202  วัตถุดิบเครื่องดื่ม  ← Inventory usage_amount
0203  แอลกอฮอล์           ← Inventory usage_amount
0204  วัตถุดิบขนมหวาน     ← Inventory usage_amount
0205  บรรจุภัณฑ์          ← Inventory usage_amount
0206  ค่าน้ำแข็ง           ← Other expenses
0207  ค่าแก๊ส              ← Other expenses
───────────────────────────────────────────────────────
           รวมต้นทุนขาย
═══════════════════════════════════════════════════════

═══════════════════════════════════════════════════════
ค่าใช้จ่ายพนักงาน (Labor)
═══════════════════════════════════════════════════════
0301  เงินเดือนพนักงานหน้าสาขา (FT + PT)
0302  OT หน้าสาขา
0303  สวัสดิการหน้าสาขา
0304  ประกันสังคมหน้าสาขา
0305  รายหักหน้าสาขา
0306  เงินเดือนทีมบริหาร (HQ)
0307  OT ทีมบริหาร
0308  สวัสดิการทีมบริหาร
0309  ประกันสังคมทีมบริหาร
0310  รายหักทีมบริหาร
0311  ค่าเดินทางพนักงาน
0312  ค่ารักษาพยาบาล
0313  โบนัส (กรอกมือ)
───────────────────────────────────────────────────────
           รวมค่าใช้จ่ายพนักงาน
═══════════════════════════════════════════════════════

★ Gross Profit (GP) = รายได้ − COGS − Labor

═══════════════════════════════════════════════════════
ค่าใช้จ่ายที่ควบคุมได้ (Controllable Expenses)
═══════════════════════════════════════════════════════
0401  ค่าไฟฟ้า
0402  ค่าน้ำประปา
0403  ค่าโทรศัพท์และ Internet
0404  ค่าอุปกรณ์บริการและเครื่องเขียน
0405  ค่าอุปกรณ์ครัว
0406  ค่าซ่อมแซมและบำรุงรักษา
0407  ค่าพาหนะเดินทาง
0408  ค่าโฆษณาและการตลาด
0409  ค่าวัสดุสิ้นเปลือง ← Inventory
0410  ค่าพัฒนาร้านและอาหาร
0411  ค่าใช้จ่ายอื่นๆ
0412-0415  ค่าใช้จ่ายเพิ่มเติม (ตั้งชื่อเองได้)
───────────────────────────────────────────────────────
           รวม Controllable Expenses
═══════════════════════════════════════════════════════

★ PAC = GP − Controllable Expenses

═══════════════════════════════════════════════════════
ค่าใช้จ่ายที่ควบคุมไม่ได้ (Non-controllable Expenses)
═══════════════════════════════════════════════════════
0501  ค่าเช่าร้าน (Fixed)
0502  ค่าทำบัญชี (Fixed)
0503  ค่าธรรมเนียมธนาคาร
0504  ค่าบริการ GP Delivery ← จาก Daily Sale (commission)
0505  ผ่อนชำระ (Fixed)
0506-0510  ค่าใช้จ่ายไม่ควบคุมเพิ่มเติม (ตั้งชื่อเองได้)
───────────────────────────────────────────────────────
           รวม Non-controllable Expenses
═══════════════════════════════════════════════════════

★ EBITDA = PAC − Non-controllable Expenses

0601  ค่าเสื่อมและค่าตัดจำหน่าย = ค่าเสื่อมทั้งหมด / ระยะเวลาสัญญาเช่า(เดือน)

★ EBIT = EBITDA − ค่าเสื่อม

0701  ดอกเบี้ยเงินกู้ (กรอกมือ)
0702  ภาษีนิติบุคคล (กรอกมือ)

★ Net Profit = EBIT − ดอกเบี้ย − ภาษี
```

**คอลัมน์แสดงผล:**
- `amount` = จำนวนเงิน (บาท)
- `pct_before_discount` = `amount / (รายได้ − ส่วนลดทั้งหมด)`
- `pct_after_discount` = `amount / รายได้สุทธิ`

### 2.2 Daily Sale (บันทึกยอดขายรายวัน)

**ช่องทางการขาย (กำหนดเองได้ต่อ Tenant):**

| ประเภท | ตัวอย่าง |
|--------|---------|
| หน้าร้าน (dine_in) | ช่องทาง 0101, 0102 |
| Delivery | GrabFood, Foodpanda, LINE MAN, ShopeeFood, อื่นๆ |
| รายได้อื่นๆ | 0110 |

**ส่วนลด:**
- `0111` ส่วนลดหน้าร้าน
- `0112` ส่วนลด Delivery (รวมทุก platform)
- `0113` ส่วนลด Entertain

**ข้อมูลเพิ่มเติมต่อวัน:**
- จำนวนบิล, จำนวนหัว (หน้าร้าน)
- จำนวนบิลแยก Delivery Platform
- ค่า GP Commission แยก Platform

**ยอดสะสม (DTD — Date To Date):**
- เป้าสะสม, ยอดขายสะสม, ส่วนต่าง

### 2.3 Other Expenses (ค่าใช้จ่ายอื่นๆ รายเดือน)

**ค่าใช้จ่ายคงที่ (Fixed) กรอกต่อเดือน:**
- 0401 ค่าไฟฟ้า (เงิน + หน่วย), 0402 ค่าน้ำ
- 0403 โทรศัพท์, 0404 Internet
- 0501 ค่าเช่าร้าน, 0502 ค่าทำบัญชี, 0505 ผ่อนชำระ
- 0601 ค่าเสื่อม = ค่าเสื่อมทั้งหมด / ระยะเวลาสัญญาเช่า

**ค่าใช้จ่ายรายวัน (Variable):**
- 0206 น้ำแข็ง (วัน, จำนวนถุง, เงิน)
- 0207 แก๊ส (วัน, จำนวนถัง, เงิน)
- 0311-0415 ค่าใช้จ่ายอื่นๆ (วัน, รายการ, เงิน)

### 2.4 Labor (เงินเดือนพนักงาน)

แยก 3 ประเภท: **FT (Full-Time)** / **PT (Part-Time)** / **HQ (ส่วนกลาง)**

**รายได้:**

| Field | สูตร |
|-------|------|
| salary | กรอกมือ |
| OT 1.0x (ชม., บาท) | `((salary/30)/8) × hours` |
| OT 1.5x (ชม., บาท) | `((salary/30)/8) × 1.5 × hours` |
| OT 3.0x (ชม., บาท) | `((salary/30)/8) × 3 × hours` |
| OT custom | กรอกมือ |
| Service Charge, Incentive, ค่าอาหาร, ค่ารถ, เบี้ยขยัน | กรอกมือ |
| **รายได้รวม** | `SUM(ทั้งหมดข้างต้น)` |

**รายหัก:**

| Field | สูตร |
|-------|------|
| ลาป่วย (วัน, บาท) | `−(salary/30) × days` |
| ลากิจ (วัน, บาท) | `−(salary/30) × days` |
| ขาดงาน (วัน, บาท) | `−(salary/30) × days` |
| มาสาย (นาที, บาท) | `−((salary/30)/8/60) × minutes` |
| หักเงินกู้, ภาษี, ประกันสังคม | กรอกมือ |
| **รายหักรวม** | `SUM(ทั้งหมดข้างต้น)` |
| **จ่ายสุทธิ** | `รายได้รวม + รายหักรวม` |

### 2.5 ข้อร้องเรียนลูกค้า (Complaints)

| Field | หมายเหตุ |
|-------|---------|
| complaint_date | วันที่ร้องเรียน |
| type | ประเภทข้อร้องเรียน |
| detail | รายละเอียด |
| image_url | รูปภาพ (Supabase Storage) |
| branch_id | สาขา |
| staff_id | พนักงานที่เกี่ยวข้อง |
| resolved_at | วันที่แก้ไขเสร็จ |

---

## ส่วนที่ 3: ความเชื่อมโยงระหว่าง Inventory และ P&L

```
Inventory Module                    P&L Module
─────────────────────               ─────────────────────
usage_amount (0201 อาหาร)     ──→   COGS 0201
usage_amount (0202 เครื่องดื่ม) ──→  COGS 0202
usage_amount (0203 แอลกอฮอล์) ──→   COGS 0203
usage_amount (0204 ขนมหวาน)   ──→   COGS 0204
usage_amount (0205 บรรจุภัณฑ์) ──→  COGS 0205
usage_amount (0409 วัสดุ)     ──→   Controllable 0409

P&L Module                          Inventory Module
─────────────────────               ─────────────────────
total_monthly_sales           ──→   คำนวณ usage_per_10000
daily_sales_target            ──→   คำนวณ par_stock รายวัน
```

**กฎสำคัญ:** ค่า COGS ใน P&L ดึงจาก Inventory อัตโนมัติ **ห้ามกรอกมือ**

---

## ส่วนที่ 4: Business Logic สำคัญ

### 4.1 การคำนวณที่ต้องทำฝั่ง Server/Client

1. **Usage**: `opening + Σreceived − closing = usage`
2. **ราคาเฉลี่ยต้นทุน**: weighted average จากการซื้อ / fallback ใช้ราคาตั้งต้น
3. **Par Stock**: `(usage_per_10000 × sales_target / 10000) × (1 + safety%)`
4. **OT**: `(salary / 30 / 8) × multiplier × hours`
5. **Late deduction**: `(salary / 30 / 8 / 60) × minutes`
6. **GP Commission (0504)**: คำนวณจากยอดขาย Delivery × อัตรา commission แต่ละ platform
7. **ค่าเสื่อม (0601)**: `total_depreciation / lease_months`

### 4.2 ข้อมูลที่กรอกมือ vs คำนวณอัตโนมัติ

**กรอกมือ (Staff/Owner):**
- ป้อนของเข้ารายวัน, Raw Waste รายวัน
- Opening Stock (ต้นเดือน), Closing Stock + ราคา (สิ้นเดือน)
- Daily Sale แยก Platform, ส่วนลดแยกประเภท
- ค่าใช้จ่ายรายวัน (น้ำแข็ง, แก๊ส ฯลฯ), ค่าใช้จ่ายคงที่
- ข้อมูลพนักงาน (OT ชั่วโมง, ลา, สาย, สวัสดิการ)
- VAT, โบนัส, ดอกเบี้ย, ภาษีนิติบุคคล

**คำนวณอัตโนมัติ (ระบบ):**
- Usage (จำนวน + เงิน), ราคาเฉลี่ยต้นทุน
- Usage per 10,000 / 1,000, Par Stock
- OT เป็นเงิน, ค่าหักจากการลา/ขาด/สาย
- COGS รวมทุกหมวด (ดึงจาก Inventory)
- GP, PAC, EBITDA, EBIT, Net Profit
- % ต้นทุนทุกรายการ

### 4.3 Supabase Table Mapping

| Feature | Supabase Table | หมายเหตุ |
|---------|---------------|---------|
| สินค้าคลัง | inventory_items | name, unit, category, branch_id |
| Opening Stock | opening_stock | quantity, amount, month, year |
| รับของเข้า | daily_receiving | date, item_id, qty, amount |
| Closing Stock | closing_stock | unit_price, quantity, month, year |
| Raw Waste | raw_waste | date, item_id, qty, type (trimmed/untrimmed) |
| เป้าขาย | sales_targets | date, target_amount, branch_id |
| ยอดขายรายวัน | daily_sales | date, channel_id, amount, bills, heads |
| ช่องทางขาย | sales_channels | code, name, type (dine_in/delivery) |
| ค่าใช้จ่าย | monthly_expenses | code, amount, date, branch_id |
| พนักงาน | employees | name, position, salary, type (ft/pt/hq) |
| เงินเดือน | monthly_labor | employee_id, salary, OT, deductions |
| ข้อร้องเรียน | complaints | all fields |

---

## ส่วนที่ 5: PWA & UX Guidelines

### 5.1 PWA Config

```ts
// vite.config.ts
VitePWA({
  registerType: 'autoUpdate',
  manifest: {
    name: 'Restaurant Inventory',
    short_name: 'Inventory',
    display: 'standalone',
    theme_color: '#...',
  },
  workbox: {
    globPatterns: ['**/*.{js,css,html,ico,png,svg}']
  }
})
```

### 5.2 Dark Mode

- ใช้ DaisyUI theme switching (`data-theme="light"` / `data-theme="dark"`)
- เก็บ preference ใน `localStorage`
- Toggle button อยู่ใน Navbar

### 5.3 Responsive Design

- Mobile first (Staff มักใช้มือถือกรอกข้อมูล)
- Sidebar collapse บน mobile
- Table scroll horizontal บน mobile
- Form ใช้ full-width บน mobile

### 5.4 Toast Notifications (React Hot Toast)

- ✅ Success: บันทึกสำเร็จ
- ❌ Error: เกิดข้อผิดพลาด
- ⚠️ Warning: ข้อมูลไม่ครบ
- ℹ️ Info: แจ้งสถานะ
