import { KeyRound, LogOut, Moon, Sun } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import { navItemsForRole } from '@/constants/nav';
import { useLogout } from '@/features/auth/api/auth-api';
import { useAuthStore } from '@/stores/auth-store';
import { useThemeStore } from '@/stores/theme-store';

/** Global Ctrl/⌘+K palette: navigate + quick actions. */
export function CommandPalette({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const navigate = useNavigate();
  const role = useAuthStore((s) => s.user?.role);
  const { theme, toggleTheme } = useThemeStore();
  const logout = useLogout();
  const [query, setQuery] = useState('');

  useEffect(() => {
    if (!open) setQuery('');
  }, [open]);

  function run(action: () => void) {
    onOpenChange(false);
    action();
  }

  return (
    <CommandDialog open={open} onOpenChange={onOpenChange}>
      <CommandInput placeholder="Search pages and actions…" value={query} onValueChange={setQuery} />
      <CommandList>
        <CommandEmpty>No results found.</CommandEmpty>
        <CommandGroup heading="Navigate">
          {navItemsForRole(role).map((item) => (
            <CommandItem key={item.path} onSelect={() => run(() => navigate(item.path))}>
              <item.icon />
              {item.label}
            </CommandItem>
          ))}
        </CommandGroup>
        <CommandGroup heading="Actions">
          <CommandItem onSelect={() => run(toggleTheme)}>
            {theme === 'dark' ? <Sun /> : <Moon />}
            Switch to {theme === 'dark' ? 'light' : 'dark'} mode
          </CommandItem>
          <CommandItem onSelect={() => run(() => navigate('/app/settings/password'))}>
            <KeyRound />
            Change password
          </CommandItem>
          <CommandItem
            onSelect={() =>
              run(() =>
                logout.mutate(undefined, {
                  onSettled: () => navigate('/auth/login', { replace: true }),
                }),
              )
            }
          >
            <LogOut />
            Sign out
          </CommandItem>
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  );
}
