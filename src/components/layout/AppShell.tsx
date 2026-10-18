import { useRef, useState } from 'react';
import type { MouseEvent } from 'react';
import { m } from 'motion/react';
import { spring } from '../../design/motion';
import { useMediaQuery } from '../../hooks/useMediaQuery';
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import CopilotChat from '../chat/CopilotChat';

const SIDEBAR_COLLAPSED_KEY = 'sidebar-collapsed';
const DOUBLE_TAP_DELAY = 400;
const SEARCHABLE_TABS = new Set(['/movies', '/series', '/discover']);

const navItems = [
  { to: '/movies', label: 'Movies', icon: 'movie' },
  { to: '/series', label: 'Series', icon: 'series' },
  { to: '/discover', label: 'Discover', icon: 'binoculars' },
  { to: '/settings', label: 'Settings', icon: 'settings' },
];

// The mobile tab bar also needs Insights (desktop shows it in the sidebar footer).
const tabBarItems = [
  navItems[0],
  navItems[1],
  navItems[2],
  { to: '/insights', label: 'Insights', icon: 'chart' },
  navItems[3],
];

function NavIcon({ icon, size = 'md', 'aria-hidden': ariaHidden }: { icon: string; size?: 'md' | 'lg'; 'aria-hidden'?: boolean | 'true' }) {
  const common = {
    className: size === 'lg' ? 'h-6 w-6' : 'h-[18px] w-[18px]',
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
    case 'chart':
      return (
        <svg {...common}>
          <path d="M3.5 4v16.5H20" />
          <path d="m7 15 3.5-4.5 3 2.5 5-6.5" />
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
    <span className="grid h-9 w-9 shrink-0 place-items-center rounded-[10px] bg-accent text-on-accent shadow-chip">
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
      <span className="block text-[1.0625rem] font-bold tracking-[-0.015em] text-text-primary">Watchlist</span>
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
  const { pathname } = useLocation();
  const mainRef = useRef<HTMLElement>(null);
  const lastTabTap = useRef<{ to: string; time: number } | null>(null);
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

  const isDesktop = useMediaQuery('(min-width: 768px)');

  function handleMobileTabClick(event: MouseEvent<HTMLAnchorElement>, to: string) {
    if (
      !SEARCHABLE_TABS.has(to) || event.button !== 0 || event.detail === 0 ||
      event.metaKey || event.ctrlKey || event.shiftKey || event.altKey
    ) {
      lastTabTap.current = null;
      return;
    }

    const time = event.timeStamp;
    const previous = lastTabTap.current;
    lastTabTap.current = { to, time };

    const search = pathname === to
      ? mainRef.current?.querySelector<HTMLInputElement>('input[type="search"]')
      : null;
    // Retapping the current tab should preserve its search and filters.
    if (search) event.preventDefault();

    if (previous?.to !== to || time - previous.time > DOUBLE_TAP_DELAY || pathname !== to) return;
    if (!search) return;

    lastTabTap.current = null;
    // Keep focus inside the tap handler so mobile browsers can open the keyboard.
    search.focus({ preventScroll: true });
    search.scrollIntoView({ block: 'center', behavior: 'instant' });
  }

  const sidebarLinkClass = ({ isActive }: { isActive: boolean }) =>
    `press flex min-h-10 items-center gap-3 rounded-[10px] text-[0.9375rem] font-medium transition-colors ${collapsed ? 'justify-center px-2' : 'px-3'} ${
      isActive
        ? 'bg-accent/15 font-semibold text-accent'
        : 'text-text-secondary hover:bg-fill hover:text-text-primary'
    }`;

  return (
    <div className="app-bg min-h-screen">
      {/* Status-bar material on iOS PWA: content scrolls underneath, fading out at its edge. */}
      <div className="material-chrome edge-fade-bottom pointer-events-none fixed inset-x-0 top-0 z-[35] h-[calc(var(--safe-area-top)+6px)] md:hidden" />

      {/* Desktop side nav */}
      <m.header
        className="material-chrome fixed inset-y-0 left-0 z-50 hidden overflow-hidden shadow-[inset_-1px_0_0_var(--color-hairline)] md:block"
        initial={false}
        animate={{ width: collapsed ? 68 : 240 }}
        transition={spring.default}
      >
        <nav className="flex h-full w-[240px] flex-col gap-6 px-3 py-5" style={{ width: collapsed ? 68 : 240 }}>
          <BrandMark collapsed={collapsed} />
          <div className="space-y-0.5">
            {navItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                aria-label={collapsed ? item.label : undefined}
                title={collapsed ? item.label : undefined}
                className={sidebarLinkClass}
              >
                <NavIcon icon={item.icon} aria-hidden />
                {!collapsed && <span>{item.label}</span>}
              </NavLink>
            ))}
          </div>

          {/* Secondary links + collapse toggle */}
          <div className="mt-auto space-y-0.5">
            <NavLink
              to="/insights"
              aria-label={collapsed ? 'Insights' : undefined}
              title={collapsed ? 'Insights' : undefined}
              className={sidebarLinkClass}
            >
              <NavIcon icon="chart" aria-hidden />
              {!collapsed && <span>Insights</span>}
            </NavLink>
            <button
              type="button"
              onClick={toggleSidebar}
              aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
              aria-expanded={!collapsed}
              className={`press flex min-h-10 w-full items-center gap-3 rounded-[10px] text-[0.9375rem] font-medium text-text-secondary transition-colors hover:bg-fill hover:text-text-primary ${collapsed ? 'justify-center px-2' : 'px-3'}`}
            >
              <ChevronIcon direction={collapsed ? 'right' : 'left'} aria-hidden />
              {!collapsed && <span>Collapse</span>}
            </button>
          </div>
        </nav>
      </m.header>

      {/* Main content */}
      <m.main
        ref={mainRef}
        className="min-h-screen w-full px-4 pb-[calc(6.5rem+var(--safe-area-bottom))] pt-[calc(1rem+var(--safe-area-top))] md:pb-10 md:pr-8 md:pt-8"
        initial={false}
        animate={{ paddingLeft: isDesktop ? (collapsed ? 100 : 272) : 16 }}
        transition={spring.default}
      >
        <div className="mx-auto w-full max-w-[1600px]">
          <Outlet />
        </div>
      </m.main>

      {/* Mobile tab bar: translucent, content scrolls underneath; hairline instead of a border. */}
      <nav className="material-chrome hairline-top fixed inset-x-0 bottom-0 z-50 pb-[var(--safe-area-bottom)] md:hidden" aria-label="Main">
        <div className="mx-auto grid h-[3.25rem] max-w-lg grid-cols-5 px-1">
          {tabBarItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              onClick={(event) => handleMobileTabClick(event, item.to)}
              className={({ isActive }) =>
                `press touch-manipulation flex flex-col items-center justify-center gap-0.5 rounded-xl transition-colors ${
                  isActive ? 'text-accent' : 'text-text-muted'
                }`
              }
            >
              <NavIcon icon={item.icon} size="lg" />
              <span className="text-[0.625rem] font-semibold tracking-[0.01em]">{item.label}</span>
            </NavLink>
          ))}
        </div>
      </nav>

      <CopilotChat />
    </div>
  );
}
