import { useState } from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import CopilotChat from '../chat/CopilotChat';

const SIDEBAR_COLLAPSED_KEY = 'sidebar-collapsed';

const navItems = [
  { to: '/movies', label: 'Movies', icon: 'movie' },
  { to: '/series', label: 'Series', icon: 'series' },
  { to: '/discover', label: 'Discover', icon: 'binoculars' },
  { to: '/settings', label: 'Settings', icon: 'settings' },
];

function NavIcon({ icon, 'aria-hidden': ariaHidden }: { icon: string; 'aria-hidden'?: boolean | 'true' }) {
  const common = {
    className: 'h-4 w-4',
    fill: 'none',
    stroke: 'currentColor',
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
    strokeWidth: 1.8,
    viewBox: '0 0 24 24',
    'aria-hidden': ariaHidden,
  };

  switch (icon) {
    case 'movie':
      return (
        <svg {...common}>
          <rect x="3.5" y="5" width="17" height="14" rx="2.5" />
          <path d="M3.5 9h17M8 5l2.5 4M14 5l2.5 4" />
          <path d="m10 12 4 2.5-4 2.5v-5Z" />
        </svg>
      );
    case 'series':
      return (
        <svg {...common}>
          <rect x="3.5" y="5.5" width="17" height="13" rx="2.5" />
          <path d="m9 2.5 3 3 3-3M8 21h8" />
          <path d="M16.5 10.5h.01M16.5 14h.01" />
        </svg>
      );
    case 'binoculars':
      return (
        <svg {...common}>
          <path d="m8.5 6-1-2h-2L3.5 14M15.5 6l1-2h2l2 10" />
          <path d="M8.5 6h7l2 8H6.5l2-8Z" />
          <circle cx="6" cy="16" r="3" />
          <circle cx="18" cy="16" r="3" />
          <path d="M9 16h6" />
        </svg>
      );
    case 'settings':
      return (
        <svg {...common}>
          <path d="M12 8.5a3.5 3.5 0 1 0 0 7 3.5 3.5 0 0 0 0-7Z" />
          <path d="M19.4 15a1.7 1.7 0 0 0 .34 1.88l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.7 1.7 0 0 0-1.88-.34 1.7 1.7 0 0 0-1.03 1.56V21a2 2 0 0 1-4 0v-.09a1.7 1.7 0 0 0-1.03-1.56 1.7 1.7 0 0 0-1.88.34l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.7 1.7 0 0 0 4.6 15a1.7 1.7 0 0 0-1.56-1.03H3a2 2 0 0 1 0-4h.09A1.7 1.7 0 0 0 4.6 8.97a1.7 1.7 0 0 0-.34-1.88l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.7 1.7 0 0 0 8.97 4.6 1.7 1.7 0 0 0 10 3.09V3a2 2 0 0 1 4 0v.09a1.7 1.7 0 0 0 1.03 1.56 1.7 1.7 0 0 0 1.88-.34l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06a1.7 1.7 0 0 0-.34 1.88 1.7 1.7 0 0 0 1.56 1.03H21a2 2 0 0 1 0 4h-.09A1.7 1.7 0 0 0 19.4 15Z" />
        </svg>
      );
    default:
      return null;
  }
}

function BrandMark({ collapsed }: { collapsed: boolean }) {
  const logo = (
    <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg border border-accent/30 bg-accent/15 text-accent">
      <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M4 7h16v12.5A1.5 1.5 0 0 1 18.5 21h-13A1.5 1.5 0 0 1 4 19.5V7Z" />
        <path d="m4 7 2.8-4h4L8 7M12 7l2.8-4h4L16 7M4 11h16" />
      </svg>
    </span>
  );

  if (collapsed) {
    return <div className="flex justify-center">{logo}</div>;
  }

  return (
    <div className="flex items-center gap-3">
      {logo}
      <span className="block text-sm font-bold text-text-primary">Watchlist</span>
    </div>
  );
}

function ChevronIcon({ direction, 'aria-hidden': ariaHidden }: { direction: 'left' | 'right'; 'aria-hidden'?: boolean | 'true' }) {
  return (
    <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} viewBox="0 0 24 24" aria-hidden={ariaHidden}>
      {direction === 'left' ? (
        <path d="M15 18l-6-6 6-6" />
      ) : (
        <path d="M9 18l6-6-6-6" />
      )}
    </svg>
  );
}

function safeLocalStorage(action: 'get', key: string): string | null;
function safeLocalStorage(action: 'set', key: string, value: string): void;
function safeLocalStorage(action: 'get' | 'set', key: string, value?: string): string | null | void {
  try {
    if (action === 'get') return localStorage.getItem(key);
    localStorage.setItem(key, value!);
  } catch {
    // localStorage unavailable (private browsing, storage blocked, etc.)
  }
  return null;
}

export default function AppShell() {
  const [collapsed, setCollapsed] = useState(
    () => safeLocalStorage('get', SIDEBAR_COLLAPSED_KEY) === 'true',
  );

  function toggleSidebar() {
    setCollapsed((prev) => {
      const next = !prev;
      safeLocalStorage('set', SIDEBAR_COLLAPSED_KEY, String(next));
      return next;
    });
  }

  return (
    <div className="app-bg min-h-screen">
      <div className="pointer-events-none fixed inset-x-0 top-0 z-[35] h-[calc(var(--safe-area-top)+2px)] bg-surface/95 backdrop-blur md:hidden" />

      {/* Desktop side nav */}
      <header className={`hidden md:block fixed inset-y-0 left-0 z-50 border-r border-border-subtle bg-surface/95 backdrop-blur-xl transition-all duration-200 ${collapsed ? 'w-[64px]' : 'w-[236px]'}`}>
        <nav className="flex h-full flex-col gap-6 px-3 py-5">
          <BrandMark collapsed={collapsed} />
          <div className="space-y-1">
            {navItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                aria-label={collapsed ? item.label : undefined}
                className={({ isActive }) =>
                  `flex items-center gap-3 rounded-lg text-sm font-medium transition-colors ${collapsed ? 'justify-center px-2 py-2.5' : 'px-3 py-2.5'} ${
                    isActive
                      ? 'bg-accent/15 text-accent border border-accent/20'
                      : 'text-text-secondary hover:text-text-primary hover:bg-surface-raised border border-transparent'
                  }`
                }
              >
                <NavIcon icon={item.icon} aria-hidden />
                {!collapsed && <span>{item.label}</span>}
              </NavLink>
            ))}
          </div>

          {/* Collapse toggle */}
          <div className="mt-auto">
            <button
              type="button"
              onClick={toggleSidebar}
              aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
              aria-expanded={!collapsed}
              className={`flex w-full items-center gap-3 rounded-lg border border-transparent px-3 py-2.5 text-sm font-medium text-text-secondary transition-colors hover:bg-surface-raised hover:text-text-primary ${collapsed ? 'justify-center px-2' : ''}`}
            >
              <ChevronIcon direction={collapsed ? 'right' : 'left'} aria-hidden />
              {!collapsed && <span>Collapse</span>}
            </button>
          </div>
        </nav>
      </header>

      {/* Main content */}
      <main className={`min-h-screen w-full px-4 pb-[calc(6rem+env(safe-area-inset-bottom))] pt-[calc(1.25rem+var(--safe-area-top))] md:py-6 md:pr-6 transition-all duration-200 ${collapsed ? 'md:pl-[80px]' : 'md:pl-[260px]'}`}>
        <div className="w-full">
          <Outlet />
        </div>
      </main>

      {/* Mobile bottom nav */}
      <nav className="md:hidden fixed bottom-0 inset-x-0 z-50 border-t border-border-subtle bg-surface/95 pb-[env(safe-area-inset-bottom)] backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-md items-center justify-around px-2">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                `flex min-w-14 flex-col items-center gap-1 rounded-lg px-2 py-1.5 text-[11px] font-medium transition-colors ${
                  isActive ? 'bg-accent/15 text-accent' : 'text-text-muted'
                }`
              }
            >
              <NavIcon icon={item.icon} />
              <span>{item.label}</span>
            </NavLink>
          ))}
        </div>
      </nav>

      <CopilotChat />
    </div>
  );
}
