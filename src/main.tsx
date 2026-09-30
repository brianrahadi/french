import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { RouterProvider } from 'react-router/dom'
import '@fontsource-variable/inter'
import '@fontsource-variable/source-serif-4'
import './styles/tokens.css'
import './styles/base.css'
import './styles/components.css'
import './styles/session.css'
import './styles/features.css'
import './styles/practice.css'
import { router } from './router'
import { ThemeSync } from './components/ThemeSync'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ThemeSync />
    <RouterProvider router={router} />
  </StrictMode>,
)
