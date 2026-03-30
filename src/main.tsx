import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { RouterProvider } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import { ThemeProvider } from './app/providers/ThemeProvider'
import { AuthProvider } from './app/providers/AuthProvider'
import { router } from './app/routes'
import './index.css'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ThemeProvider>
      <AuthProvider>
        <RouterProvider router={router} />
        <Toaster
          position="top-right"
          toastOptions={{
            duration: 3000,
            style: { borderRadius: '8px' },
          }}
        />
      </AuthProvider>
    </ThemeProvider>
  </StrictMode>,
)
