import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import Root from './Root'
import { installOriginTrial } from './lib/webmcp'

// WebMCP origin-trial token for the production domain (public by design; set in .env.local).
installOriginTrial(import.meta.env.VITE_WEBMCP_ORIGIN_TRIAL)

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Root />
  </StrictMode>,
)
