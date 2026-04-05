import { Outlet } from 'react-router-dom'

export function AuthLayout() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-pattern p-4 relative overflow-hidden">
      {/* Decorative gradient blobs */}
      <div className="absolute top-[-20%] right-[-10%] w-96 h-96 rounded-full bg-gradient-brand opacity-10 blur-3xl" />
      <div className="absolute bottom-[-20%] left-[-10%] w-80 h-80 rounded-full bg-gradient-brand opacity-5 blur-3xl" />

      <div className="card bg-base-100 card-enhanced w-full max-w-md relative z-10">
        <div className="card-body">
          {/* Brand header */}
          <div className="flex items-center justify-center gap-3 mb-4">
            <div className="icon-box bg-gradient-brand text-white shadow-lg shadow-primary/25">
              <span className="text-sm font-bold tracking-tight">IV</span>
            </div>
            <div>
              <h2 className="text-lg font-bold">Inventory</h2>
              <p className="text-[10px] text-base-content/40 tracking-wider uppercase">Restaurant Management</p>
            </div>
          </div>
          <div className="section-divider mb-4" />
          <Outlet />
        </div>
      </div>
    </div>
  )
}
