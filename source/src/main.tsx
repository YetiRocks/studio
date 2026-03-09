import React from 'react'
import ReactDOM from 'react-dom/client'
import { RouterProvider } from '@tanstack/react-router'
import { router } from './router'
import './yeti.css'
import './index.css'
import './applications.css'
import './telemetry.css'
import './benchmarks.css'
import './auth.css'
import './vectors.css'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <RouterProvider router={router} />
  </React.StrictMode>,
)
