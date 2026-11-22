import { lazy, StrictMode, Suspense, useEffect, useState } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import Landing from './Landing'
import { TopBar } from './ui'

// The app (and Firebase behind it) only loads when someone opens it.
const App = lazy(() => import('./App'))

const TITLES: Record<string, string> = {
  '/': 'Paperwork Decoder · Understand official letters privately',
  '/app': 'Decode a letter · Paperwork Decoder',
}

function AppSkeleton() {
  return (
    <div className="page">
      <TopBar />
      <div className="card skeleton" aria-hidden="true">
        <span style={{ width: '40%' }} />
        <span style={{ height: 220 }} />
        <span style={{ width: '60%' }} />
      </div>
    </div>
  )
}

function Root() {
  const [path, setPath] = useState(location.pathname)
  useEffect(() => {
    const onChange = () => setPath(location.pathname)
    addEventListener('popstate', onChange)
    return () => removeEventListener('popstate', onChange)
  }, [])
  const inApp = path.replace(/\/$/, '') === '/app'
  useEffect(() => {
    document.title = TITLES[inApp ? '/app' : '/']
  }, [inApp])
  return inApp ? (
    <Suspense fallback={<AppSkeleton />}>
      <App />
    </Suspense>
  ) : (
    <Landing />
  )
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Root />
  </StrictMode>,
)
