import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { LazyMotion, MotionConfig } from 'motion/react'
import './index.css'
import App from './App.tsx'
import { LibraryProvider } from './db/LibraryContext.tsx'

const loadMotionFeatures = () => import('./design/motionFeatures').then((mod) => mod.default)

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <LazyMotion features={loadMotionFeatures}>
      <MotionConfig reducedMotion="user">
        <LibraryProvider>
          <App />
        </LibraryProvider>
      </MotionConfig>
    </LazyMotion>
  </StrictMode>,
)
