import { ChevronsLeft, HeartPulse } from 'lucide-react';
import { NavLink, Link } from 'react-router-dom';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { navItemsForRole } from '@/constants/nav';
import { cn } from '@/lib/utils';
import { useAuthStore } from '@/stores/auth-store';

interface SidebarProps {
  collapsed: boolean;
  onToggle: () => void;
}

export function Sidebar({ collapsed, onToggle }: SidebarProps) {
  const role = useAuthStore((s) => s.user?.role);
  const items = navItemsForRole(role);

  return (
    <aside
      className={cn(
        'hidden h-screen shrink-0 flex-col border-r bg-card transition-[width] duration-200 md:flex',
        collapsed ? 'w-16' : 'w-60',
      )}
    >
      {/* Brand */}
      <Link to="/app" className="flex h-14 items-center gap-2 border-b px-4">
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground">
          <HeartPulse className="h-4.5 w-4.5" />
        </span>
        {!collapsed && <span className="truncate font-semibold tracking-tight">PharmaCare</span>}
      </Link>

      {/* Nav */}
      <nav className="flex-1 space-y-1 overflow-y-auto p-2">
        {items.map((item) => {
          const link = (
            <NavLink
              key={item.path}
              to={item.path}
              end={item.path === '/app'}
              className={({ isActive }) =>
                cn(
                  'flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors',
                  isActive
                    ? 'bg-primary/10 text-primary'
                    : 'text-muted-foreground hover:bg-accent hover:text-foreground',
                  collapsed && 'justify-center px-2',
                )
              }
            >
              <item.icon className="h-4.5 w-4.5 shrink-0" />
              {!collapsed && <span className="truncate">{item.label}</span>}
            </NavLink>
          );

          return collapsed ? (
            <Tooltip key={item.path}>
              <TooltipTrigger asChild>{link}</TooltipTrigger>
              <TooltipContent side="right">{item.label}</TooltipContent>
            </Tooltip>
          ) : (
            link
          );
        })}
      </nav>

      {/* Collapse toggle */}
      <button
        onClick={onToggle}
        className="flex h-11 items-center justify-center gap-2 border-t text-xs text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
        aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
      >
        <ChevronsLeft className={cn('h-4 w-4 transition-transform', collapsed && 'rotate-180')} />
        {!collapsed && 'Collapse'}
      </button>
    </aside>
  );
}
