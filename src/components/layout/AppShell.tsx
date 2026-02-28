import { NavLink, Outlet } from 'react-router-dom';
import CopilotChat from '../chat/CopilotChat';

const navItems = [
  { to: '/upcoming', label: 'Upcoming', icon: '📅' },
  { to: '/library', label: 'Library', icon: '📚' },
  { to: '/discover', label: 'Discover', icon: '🔥' },
  { to: '/settings', label: 'Settings', icon: '⚙️' },
];

export default function AppShell() {
  return (
    <div className="min-h-screen flex flex-col">
      {/* Desktop top nav */}
      <header className="hidden md:block sticky top-0 z-50 bg-surface/95 backdrop-blur border-b border-border-subtle">
        <nav className="max-w-[1600px] mx-auto px-6 h-14 flex items-center gap-1">
          <span className="font-bold text-lg mr-8 text-accent">🎬 Watchlist</span>
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                `px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-accent/15 text-accent'
                    : 'text-text-secondary hover:text-text-primary hover:bg-surface-raised'
                }`
              }
            >
              {item.label}
            </NavLink>
          ))}
        </nav>
      </header>

      {/* Main content */}
      <main className="flex-1 max-w-[1600px] w-full mx-auto px-4 md:px-6 md:pr-24 py-4 pb-20 md:pb-6">
        <Outlet />
      </main>

      {/* Mobile bottom nav */}
      <nav className="md:hidden fixed bottom-0 inset-x-0 z-50 bg-surface/95 backdrop-blur border-t border-border-subtle">
        <div className="flex justify-around items-center h-16">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                `flex flex-col items-center gap-0.5 px-3 py-1 text-xs transition-colors ${
                  isActive ? 'text-accent' : 'text-text-muted'
                }`
              }
            >
              <span className="text-lg">{item.icon}</span>
              <span>{item.label}</span>
            </NavLink>
          ))}
        </div>
      </nav>

      <CopilotChat />
    </div>
  );
}
