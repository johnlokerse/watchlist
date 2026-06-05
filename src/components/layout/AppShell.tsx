import { useState } from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import CopilotChat from '../chat/CopilotChat';

const SIDEBAR_COLLAPSED_KEY = 'sidebar-collapsed';

const navItems = [
  { to: '/upcoming', label: 'Upcoming', icon: 'calendar' },
  { to: '/library', label: 'Library', icon: 'library' },
  { to: '/discover', label: 'Discover', icon: 'search' },
  { to: '/settings', label: 'Settings', icon: 'settings' },
];

function NavIcon({ icon }: { icon: string }) {
  const common = {
    className: 'h-4 w-4',
    fill: 'none',
    stroke: 'currentColor',
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
    strokeWidth: 1.8,
    viewBox: '0 0 24 24',
  };

  switch (icon) {
    case 'calendar':
      return (
        <svg {...common}>
          <rect x="3.5" y="4.5" width="17" height="16" rx="2.5" />
          <path d="M8 2.8v4M16 2.8v4M3.5 9h17" />
          <path d="M8 13h.01M12 13h.01M16 13h.01M8 17h.01M12 17h.01" />
        </svg>
      );
    case 'library':
      return (
        <svg {...common}>
          <path d="M4 5.5h11.5a2.5 2.5 0 0 1 2.5 2.5v11.5H6.5A2.5 2.5 0 0 1 4 17V5.5Z" />
          <path d="M7.5 5.5v14M9.5 9h5M9.5 12h5" />
          <path d="M18 8h2a1.5 1.5 0 0 1 1.5 1.5v10H18" />
        </svg>
      );
    case 'search':
      return (
        <svg {...common}>
          <circle cx="10.5" cy="10.5" r="6" />
          <path d="m15 15 5 5" />
        </svg>
      );
    default:
      return (
        <svg {...common}>
          <path d="M12 8.5a3.5 3.5 0 1 0 0 7 3.5 3.5 0 0 0 0-7Z" />
          <path d="M19.4 15a1.7 1.7 0 0 0 .34 1.88l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.7 1.7 0 0 0-1.88-.34 1.7 1.7 0 0 0-1.03 1.56V21a2 2 0 0 1-4 0v-.09a1.7 1.7 0 0 0-1.03-1.56 1.7 1.7 0 0 0-1.88.34l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.7 1.7 0 0 0 4.6 15a1.7 1.7 0 0 0-1.56-1.03H3a2 2 0 0 1 0-4h.09A1.7 1.7 0 0 0 4.6 8.97a1.7 1.7 0 0 0-.34-1.88l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.7 1.7 0 0 0 8.97 4.6 1.7 1.7 0 0 0 10 3.09V3a2 2 0 0 1 4 0v.09a1.7 1.7 0 0 0 1.03 1.56 1.7 1.7 0 0 0 1.88-.34l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06a1.7 1.7 0 0 0-.34 1.88 1.7 1.7 0 0 0 1.56 1.03H21a2 2 0 0 1 0 4h-.09A1.7 1.7 0 0 0 19.4 15Z" />
        </svg>
      );
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

function ChevronIcon({ direction }: { direction: 'left' | 'right' }) {
  return (
    <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} viewBox="0 0 24 24">
      {direction === 'left' ? (
        <path d="M15 18l-6-6 6-6" />
      ) : (
        <path d="M9 18l6-6-6-6" />
      )}
    </svg>
  );
}

export default function AppShell() {
  const [collapsed, setCollapsed] = useState(
    () => localStorage.getItem(SIDEBAR_COLLAPSED_KEY) === 'true',
  );

  function toggleSidebar() {
    setCollapsed((prev) => {
      const next = !prev;
      localStorage.setItem(SIDEBAR_COLLAPSED_KEY, String(next));
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
                title={collapsed ? item.label : undefined}
                className={({ isActive }) =>
                  `flex items-center gap-3 rounded-lg text-sm font-medium transition-colors ${collapsed ? 'justify-center px-2 py-2.5' : 'px-3 py-2.5'} ${
                    isActive
                      ? 'bg-accent/15 text-accent border border-accent/20'
                      : 'text-text-secondary hover:text-text-primary hover:bg-surface-raised border border-transparent'
                  }`
                }
              >
                <NavIcon icon={item.icon} />
                {!collapsed && item.label}
              </NavLink>
            ))}
          </div>

          {/* Collapse toggle */}
          <div className="mt-auto">
            <button
              onClick={toggleSidebar}
              title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
              className={`flex w-full items-center gap-3 rounded-lg border border-transparent px-3 py-2.5 text-sm font-medium text-text-secondary transition-colors hover:bg-surface-raised hover:text-text-primary ${collapsed ? 'justify-center px-2' : ''}`}
            >
              <ChevronIcon direction={collapsed ? 'right' : 'left'} />
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
