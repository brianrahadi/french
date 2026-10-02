import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { RouterProvider } from 'react-router/dom'
import '@fontsource-variable/inter'
import '@fontsource-variable/source-serif-4'
import '@mantine/core/styles.css'
import './styles/tokens.css'
import './styles/base.css'
import './styles/components.css'
import './styles/session.css'
import './styles/features.css'
import './styles/practice.css'
import { router } from './router'
import { AppProvider } from './components/AppProvider'
import { initSync } from './lib/sync/engine'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AppProvider>
      <RouterProvider router={router} />
    </AppProvider>
  </StrictMode>,
)

// Sign-in and cloud sync (only when a Supabase project is configured).
// After signing in with Google, go back to the page it was started from.
void initSync().then((back) => {
  if (back) void router.navigate(back, { replace: true })
})
