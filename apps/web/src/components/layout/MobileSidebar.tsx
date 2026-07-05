import * as DialogPrimitive from '@radix-ui/react-dialog';
import { HeartPulse, X } from 'lucide-react';
import { Link, NavLink } from 'react-router-dom';
import { navItemsForRole } from '@/constants/nav';
import { cn } from '@/lib/utils';
import { useAuthStore } from '@/stores/auth-store';

/** Slide-in drawer nav for < md screens. */
export function MobileSidebar({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const role = useAuthStore((s) => s.user?.role);
  const items = navItemsForRole(role);

  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm data-[state=open]:animate-in data-[state=open]:fade-in-0" />
        <DialogPrimitive.Content
          className={cn(
            'fixed inset-y-0 left-0 z-50 flex w-72 flex-col border-r bg-card shadow-lg',
            'data-[state=open]:animate-in data-[state=open]:slide-in-from-left data-[state=closed]:animate-out data-[state=closed]:slide-out-to-left',
          )}
        >
          <DialogPrimitive.Title className="sr-only">Navigation</DialogPrimitive.Title>
          <div className="flex h-14 items-center justify-between border-b px-4">
            <Link to="/app" className="flex items-center gap-2" onClick={() => onOpenChange(false)}>
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                <HeartPulse className="h-4.5 w-4.5" />
              </span>
              <span className="font-semibold tracking-tight">PharmaCare</span>
            </Link>
            <DialogPrimitive.Close className="rounded-md p-1 text-muted-foreground hover:text-foreground">
              <X className="h-5 w-5" />
            </DialogPrimitive.Close>
          </div>
          <nav className="flex-1 space-y-1 overflow-y-auto p-2">
            {items.map((item) => (
              <NavLink
                key={item.path}
                to={item.path}
                end={item.path === '/app'}
                onClick={() => onOpenChange(false)}
                className={({ isActive }) =>
                  cn(
                    'flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium transition-colors',
                    isActive
                      ? 'bg-primary/10 text-primary'
                      : 'text-muted-foreground hover:bg-accent hover:text-foreground',
                  )
                }
              >
                <item.icon className="h-4.5 w-4.5" />
                {item.label}
              </NavLink>
            ))}
          </nav>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
