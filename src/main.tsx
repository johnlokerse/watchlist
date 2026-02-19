import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { seedMoviesOnce } from './db/seed.ts'
import { LibraryProvider } from './db/LibraryContext.tsx'

seedMoviesOnce();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <LibraryProvider>
      <App />
    </LibraryProvider>
  </StrictMode>,
)
