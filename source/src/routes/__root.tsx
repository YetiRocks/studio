import { createRootRoute, Outlet, Link, useRouter } from '@tanstack/react-router'
import { useState, useEffect, useCallback } from 'react'
import { useToast } from '../hooks/useToast'
import { APPS_BASE, AUTH_BASE, setSessionExpiredHandler } from '../api'

export const Route = createRootRoute({
  component: RootLayout,
})

function LoginPage({ onLogin: _onLogin }: { onLogin: () => void }) {
  const handleGoogleLogin = () => {
    window.location.href = `${AUTH_BASE}/oauth_login?provider=google&redirect_uri=/studio/`
  }

  return (
    <div className="login-page">
      <div className="login-card">
        <img src={`${import.meta.env.BASE_URL}logo_white.svg`} alt="Yeti" className="login-logo" />
        <button className="btn btn-oauth btn-google" onClick={handleGoogleLogin}>
          <svg viewBox="0 0 24 24" style={{ width: 20, height: 20 }}>
            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
          </svg>
          Sign in with Google
        </button>
      </div>
    </div>
  )
}

function RootLayout() {
  const [authenticated, setAuthenticated] = useState<boolean | null>(null)
  const { ToastContainer } = useToast()
  const router = useRouter()

  const checkAuth = useCallback(async () => {
    try {
      // Hit an authenticated endpoint to verify session is valid.
      const res = await fetch(`${APPS_BASE}/Application?limit=1`, { credentials: 'same-origin' })
      setAuthenticated(res.ok)
    } catch {
      setAuthenticated(false)
    }
  }, [])

  useEffect(() => {
    checkAuth()
  }, [checkAuth])

  // Register the 401 handler so api() calls transition to login without reloading
  useEffect(() => {
    setSessionExpiredHandler(() => setAuthenticated(false))
  }, [])

  const handleLogin = () => {
    // Small delay to let the browser store the httpOnly cookie from the
    // login response before firing authenticated API calls
    setTimeout(() => setAuthenticated(true), 50)
  }

  const handleLogout = async () => {
    try {
      await fetch(`${AUTH_BASE}/login`, {
        method: 'DELETE',
        credentials: 'same-origin',
      })
    } catch {
      // Best-effort logout
    }
    setAuthenticated(false)
    router.navigate({ to: '/' })
  }

  if (authenticated === null) {
    return <div className="loading">Loading...</div>
  }

  if (!authenticated) {
    return <LoginPage onLogin={handleLogin} />
  }

  return (
    <div className="app">
      <nav className="nav">
        <div className="nav-left">
          <a href="/">
            <img src={`${import.meta.env.BASE_URL}logo_white.svg`} alt="Yeti" className="nav-logo" />
          </a>
        </div>
        <div className="nav-center">
          <Link to="/applications" className="nav-link" activeProps={{ className: 'nav-link active' }}>
            Applications
          </Link>
          <Link to="/auth" className="nav-link" activeProps={{ className: 'nav-link active' }}>
            Auth
          </Link>
          <Link to="/telemetry" className="nav-link" activeProps={{ className: 'nav-link active' }}>
            Telemetry
          </Link>
          <Link to="/vectors" className="nav-link" activeProps={{ className: 'nav-link active' }}>
            Vectors
          </Link>
          <Link to="/benchmarks" className="nav-link" activeProps={{ className: 'nav-link active' }}>
            Benchmarks
          </Link>
        </div>
        <div className="nav-right">
          <button className="btn nav-action-btn" onClick={handleLogout}>Log Out</button>
        </div>
      </nav>
      <div className="page">
        <div className="admin-layout">
          <Outlet />
        </div>
      </div>

      <ToastContainer />
    </div>
  )
}
