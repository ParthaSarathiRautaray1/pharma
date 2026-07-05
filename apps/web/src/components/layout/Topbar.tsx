import { Bell, KeyRound, LogOut, Menu, Moon, Search, Sun } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useLogout } from '@/features/auth/api/auth-api';
import { useAuthStore } from '@/stores/auth-store';
import { useThemeStore } from '@/stores/theme-store';

const ROLE_LABELS: Record<string, string> = {
  SUPER_ADMIN: 'Super Admin',
  OWNER: 'Owner',
  PHARMACIST: 'Pharmacist',
  CASHIER: 'Cashier',
  INVENTORY_MANAGER: 'Inventory Manager',
};

interface TopbarProps {
  onOpenMobileNav: () => void;
  onOpenPalette: () => void;
}

export function Topbar({ onOpenMobileNav, onOpenPalette }: TopbarProps) {
  const user = useAuthStore((s) => s.user);
  const { theme, toggleTheme } = useThemeStore();
  const logout = useLogout();
  const navigate = useNavigate();

  const initials = user?.name
    .split(' ')
    .map((p) => p[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();

  return (
    <header className="sticky top-0 z-40 flex h-14 shrink-0 items-center gap-2 border-b bg-background/80 px-4 backdrop-blur">
      {/* Mobile nav trigger */}
      <Button variant="ghost" size="icon" className="md:hidden" onClick={onOpenMobileNav}>
        <Menu className="h-5 w-5" />
        <span className="sr-only">Open navigation</span>
      </Button>

      {/* Search / palette trigger */}
      <button
        onClick={onOpenPalette}
        className="flex h-9 w-full max-w-xs items-center gap-2 rounded-md border bg-card px-3 text-sm text-muted-foreground transition-colors hover:bg-accent"
      >
        <Search className="h-4 w-4" />
        <span className="flex-1 truncate text-left">Search…</span>
        <kbd className="pointer-events-none hidden rounded border bg-muted px-1.5 font-mono text-[10px] font-medium sm:inline-block">
          Ctrl K
        </kbd>
      </button>

      <div className="ml-auto flex items-center gap-1">
        {/* Theme toggle */}
        <Button variant="ghost" size="icon" onClick={toggleTheme} aria-label="Toggle theme">
          {theme === 'dark' ? <Sun className="h-4.5 w-4.5" /> : <Moon className="h-4.5 w-4.5" />}
        </Button>

        {/* Notifications (wired to live data in Module 12) */}
        <Button variant="ghost" size="icon" aria-label="Notifications" onClick={() => navigate('/app/notifications')}>
          <Bell className="h-4.5 w-4.5" />
        </Button>

        {/* User menu */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              className="ml-1 flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary transition-shadow hover:ring-2 hover:ring-ring"
              aria-label="Account menu"
            >
              {initials}
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel>
              <span className="block text-sm font-medium text-foreground">{user?.name}</span>
              <span className="block text-xs font-normal">
                {ROLE_LABELS[user?.role ?? ''] ?? user?.role} · {user?.pharmacyName ?? 'Platform'}
              </span>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <Link to="/app/settings/password">
                <KeyRound />
                Change password
              </Link>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onSelect={() =>
                logout.mutate(undefined, {
                  onSettled: () => navigate('/auth/login', { replace: true }),
                })
              }
            >
              <LogOut />
              Sign out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
