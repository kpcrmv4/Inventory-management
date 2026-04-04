import { lazy, Suspense } from 'react'
import { createBrowserRouter, Navigate } from 'react-router-dom'
import { AppLayout } from '../../components/layout/AppLayout'
import { AuthLayout } from '../../components/layout/AuthLayout'
import { ProtectedRoute } from './ProtectedRoute'
import { RoleRoute } from './RoleRoute'

// Auth pages
const LoginPage = lazy(() => import('../../features/auth/pages/LoginPage'))
const RegisterPage = lazy(() => import('../../features/auth/pages/RegisterPage'))
const PendingPage = lazy(() => import('../../features/auth/pages/PendingPage'))

// SuperAdmin
const SADashboard = lazy(() => import('../../features/auth/pages/SuperAdminDashboard'))
const TenantManagement = lazy(() => import('../../features/auth/pages/TenantManagement'))
const SASettings = lazy(() => import('../../features/auth/pages/SuperAdminSettingsPage'))

// App pages
const Dashboard = lazy(() => import('../../features/report/pages/DashboardPage'))
const MainTable = lazy(() => import('../../features/inventory/pages/MainTablePage'))
const Receiving = lazy(() => import('../../features/inventory/pages/ReceivingPage'))
const RawWaste = lazy(() => import('../../features/inventory/pages/RawWastePage'))
const ParStock = lazy(() => import('../../features/inventory/pages/ParStockPage'))
const InventoryReport = lazy(() => import('../../features/inventory/pages/InventoryReportPage'))
const DailySale = lazy(() => import('../../features/daily-sale/pages/DailySalePage'))
const Expenses = lazy(() => import('../../features/expenses/pages/ExpensesPage'))
const PLReport = lazy(() => import('../../features/pl/pages/PLReportPage'))
const FTLabor = lazy(() => import('../../features/labor/pages/FTLaborPage'))
const PTLabor = lazy(() => import('../../features/labor/pages/PTLaborPage'))
const HQLabor = lazy(() => import('../../features/labor/pages/HQLaborPage'))
const Recipes = lazy(() => import('../../features/recipes/pages/RecipesPage'))
const RecipeDetail = lazy(() => import('../../features/recipes/pages/RecipeDetailPage'))
const RecipeDashboard = lazy(() => import('../../features/recipes/pages/RecipeDashboardPage'))
const Complaints = lazy(() => import('../../features/complaints/pages/ComplaintsPage'))
const BranchSettings = lazy(() => import('../../features/settings/pages/BranchSettingsPage'))
const UserSettings = lazy(() => import('../../features/settings/pages/UserSettingsPage'))

function PageLoader() {
  return (
    <div className="flex items-center justify-center h-64">
      <span className="loading loading-spinner loading-lg" />
    </div>
  )
}

function LazyPage({ children }: { children: React.ReactNode }) {
  return <Suspense fallback={<PageLoader />}>{children}</Suspense>
}

export const router = createBrowserRouter([
  // Auth routes
  {
    element: <AuthLayout />,
    children: [
      { path: '/', element: <LazyPage><LoginPage /></LazyPage> },
      { path: '/register', element: <LazyPage><RegisterPage /></LazyPage> },
      { path: '/pending', element: <LazyPage><PendingPage /></LazyPage> },
    ],
  },

  // SuperAdmin routes
  {
    path: '/superadmin',
    element: <ProtectedRoute><RoleRoute allowed={['superadmin']}><AppLayout /></RoleRoute></ProtectedRoute>,
    children: [
      { index: true, element: <Navigate to="dashboard" replace /> },
      { path: 'dashboard', element: <LazyPage><SADashboard /></LazyPage> },
      { path: 'tenants', element: <LazyPage><TenantManagement /></LazyPage> },
      { path: 'settings', element: <LazyPage><SASettings /></LazyPage> },
    ],
  },

  // App routes (Owner + Staff)
  {
    path: '/app',
    element: <ProtectedRoute><RoleRoute allowed={['owner', 'staff']}><AppLayout /></RoleRoute></ProtectedRoute>,
    children: [
      { index: true, element: <Navigate to="dashboard" replace /> },
      { path: 'dashboard', element: <LazyPage><Dashboard /></LazyPage> },
      // Inventory
      { path: 'inventory/main-table', element: <LazyPage><MainTable /></LazyPage> },
      { path: 'inventory/receiving', element: <LazyPage><Receiving /></LazyPage> },
      { path: 'inventory/raw-waste', element: <LazyPage><RawWaste /></LazyPage> },
      { path: 'inventory/par-stock', element: <LazyPage><ParStock /></LazyPage> },
      { path: 'inventory/report', element: <LazyPage><InventoryReport /></LazyPage> },
      // P&L
      { path: 'pl/daily-sale', element: <LazyPage><DailySale /></LazyPage> },
      { path: 'pl/expenses', element: <LazyPage><Expenses /></LazyPage> },
      { path: 'pl/report', element: <RoleRoute allowed={['owner']}><LazyPage><PLReport /></LazyPage></RoleRoute> },
      { path: 'pl/labor/ft', element: <RoleRoute allowed={['owner']}><LazyPage><FTLabor /></LazyPage></RoleRoute> },
      { path: 'pl/labor/pt', element: <RoleRoute allowed={['owner']}><LazyPage><PTLabor /></LazyPage></RoleRoute> },
      { path: 'pl/labor/hq', element: <RoleRoute allowed={['owner']}><LazyPage><HQLabor /></LazyPage></RoleRoute> },
      // Recipes
      { path: 'recipes', element: <LazyPage><Recipes /></LazyPage> },
      { path: 'recipes/dashboard', element: <RoleRoute allowed={['owner']}><LazyPage><RecipeDashboard /></LazyPage></RoleRoute> },
      { path: 'recipes/:id', element: <LazyPage><RecipeDetail /></LazyPage> },
      // Other
      { path: 'complaints', element: <LazyPage><Complaints /></LazyPage> },
      { path: 'settings/branches', element: <RoleRoute allowed={['owner']}><LazyPage><BranchSettings /></LazyPage></RoleRoute> },
      { path: 'settings/users', element: <RoleRoute allowed={['owner']}><LazyPage><UserSettings /></LazyPage></RoleRoute> },
    ],
  },
])
