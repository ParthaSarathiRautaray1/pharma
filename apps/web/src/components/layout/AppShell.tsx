import { useEffect, useState } from 'react';
import { Outlet } from 'react-router-dom';
import { TooltipProvider } from '@/components/ui/tooltip';
import { CommandPalette } from './CommandPalette';
import { MobileSidebar } from './MobileSidebar';
import { Sidebar } from './Sidebar';
import { Topbar } from './Topbar';

const SIDEBAR_KEY = 'pharmacare-sidebar-collapsed';

/** Authenticated ERP frame: sidebar + topbar + routed content. */
export function AppShell() {
  const [collapsed, setCollapsed] = useState(() => localStorage.getItem(SIDEBAR_KEY) === '1');
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [paletteOpen, setPaletteOpen] = useState(false);

  // Global Ctrl/⌘+K
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key.toLowerCase() === 'k' && (e.ctrlKey || e.metaKey)) {
        e.preventDefault();
        setPaletteOpen((v) => !v);
      }
    }
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  function toggleSidebar() {
    setCollapsed((v) => {
      localStorage.setItem(SIDEBAR_KEY, v ? '0' : '1');
      return !v;
    });
  }

  return (
    <TooltipProvider delayDuration={200}>
      <div className="flex min-h-screen">
        <Sidebar collapsed={collapsed} onToggle={toggleSidebar} />
        <div className="flex min-w-0 flex-1 flex-col">
          <Topbar
            onOpenMobileNav={() => setMobileNavOpen(true)}
            onOpenPalette={() => setPaletteOpen(true)}
          />
          <main className="flex-1 p-4 md:p-6">
            <Outlet />
          </main>
        </div>
      </div>
      <MobileSidebar open={mobileNavOpen} onOpenChange={setMobileNavOpen} />
      <CommandPalette open={paletteOpen} onOpenChange={setPaletteOpen} />
    </TooltipProvider>
  );
}
