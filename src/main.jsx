import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { RouterProvider } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import { AuthProvider } from './context/AuthContext'
import router from './router/index'
import './index.css'

/**
 * Application entry point.
 *
 * Tree structure:
 *   StrictMode          → surface subtle bugs early in development
 *   └── AuthProvider    → global session state (single Supabase listener)
 *       └── RouterProvider → all page routing via React Router v7
 *           └── Toaster    → global toast notifications (success / error)
 *
 * Note: App.jsx is no longer used — routing is handled by the router.
 * We keep App.jsx on disk untouched (per requirement: preserve existing files).
 */
createRoot(document.getElementById('root')).render(
  <StrictMode>
    <AuthProvider>
      <RouterProvider router={router} />
      <Toaster
        position="top-right"
        toastOptions={{
          duration: 4000,
          style: {
            fontSize: '14px',
            maxWidth: '380px',
          },
          success: { iconTheme: { primary: '#16a34a', secondary: '#fff' } },
          error:   { iconTheme: { primary: '#dc2626', secondary: '#fff' } },
        }}
      />
    </AuthProvider>
  </StrictMode>
)
