import {
  ArrowRight,
  BadgeIndianRupee,
  BarChart3,
  BellRing,
  Boxes,
  Check,
  ClipboardList,
  Mail,
  Menu,
  PackageCheck,
  ReceiptText,
  ShieldCheck,
  Sparkles,
  Truck,
  Users,
  X,
} from 'lucide-react';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { buttonVariants } from '@/components/ui/button';
import { cn } from '@/lib/utils';

const navItems = [
  { label: 'Product', href: '#product' },
  { label: 'Modules', href: '#modules' },
  { label: 'Workflow', href: '#workflow' },
  { label: 'Pricing', href: '#pricing' },
];

const metrics = [
  { label: 'Today sales', value: '₹86,240', trend: '+18%' },
  { label: 'Low stock', value: '14', trend: 'Action' },
  { label: 'Near expiry', value: '32', trend: 'Batch' },
];

const modules = [
  {
    icon: Boxes,
    title: 'Batch inventory',
    text: 'Track medicine, batch, expiry, GST, barcode, stock ledger, and FEFO availability from one clean workspace.',
  },
  {
    icon: ReceiptText,
    title: 'POS billing',
    text: 'Fast checkout with split payments, GST snapshots, returns, customer dues, and WhatsApp invoice sharing.',
  },
  {
    icon: Users,
    title: 'Customers',
    text: 'Purchase history, prescriptions, loyalty points, outstanding invoices, and due collection stay connected.',
  },
  {
    icon: Truck,
    title: 'Suppliers and purchases',
    text: 'Create purchase orders, receive batches into inventory, attach invoices, and manage supplier payments.',
  },
  {
    icon: BarChart3,
    title: 'Reports',
    text: 'Sales, purchases, profit, GST, expiry, customer, supplier, and stock reports built for owner decisions.',
  },
  {
    icon: BellRing,
    title: 'Notifications',
    text: 'Low stock, near expiry, pending payment, and operational reminders reach the team before issues pile up.',
  },
];

const workflow = [
  'Scan barcode or search medicine',
  'Select the right batch automatically',
  'Collect cash, UPI, card, or split payment',
  'Update stock ledger and invoice instantly',
];

const trustItems = [
  'Role-based access for owner, pharmacist, cashier, and inventory teams',
  'Pharmacy-scoped records with multi-branch-ready data design',
  'JWT auth, audit-friendly writes, and strict API validation',
];

export default function HomePage() {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <main className="min-h-screen overflow-hidden bg-background text-foreground">
      <header className="fixed inset-x-0 top-0 z-50 border-b border-white/10 bg-background/82 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <a href="#top" className="flex items-center gap-2 font-semibold">
            <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <PackageCheck className="h-5 w-5" />
            </span>
            <span>PharmaCare</span>
          </a>

          <nav className="hidden items-center gap-7 text-sm text-muted-foreground md:flex">
            {navItems.map((item) => (
              <a key={item.href} href={item.href} className="transition hover:text-foreground">
                {item.label}
              </a>
            ))}
          </nav>

          <div className="hidden items-center gap-3 md:flex">
            <Link to="/auth/login" className={buttonVariants({ variant: 'ghost' })}>
              Sign in
            </Link>
            <Link to="/auth/login" className={buttonVariants()}>
              Open demo
              <ArrowRight />
            </Link>
          </div>

          <button
            type="button"
            className="inline-flex h-9 w-9 items-center justify-center rounded-md border md:hidden"
            onClick={() => setMenuOpen((value) => !value)}
            aria-label="Toggle menu"
          >
            {menuOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
          </button>
        </div>

        {menuOpen && (
          <div className="border-t bg-background px-4 py-4 md:hidden">
            <div className="flex flex-col gap-3 text-sm">
              {navItems.map((item) => (
                <a
                  key={item.href}
                  href={item.href}
                  className="rounded-md px-2 py-2 text-muted-foreground hover:bg-accent hover:text-foreground"
                  onClick={() => setMenuOpen(false)}
                >
                  {item.label}
                </a>
              ))}
              <Link
                to="/auth/login"
                className={cn(buttonVariants(), 'mt-2 w-full')}
                onClick={() => setMenuOpen(false)}
              >
                Open demo
                <ArrowRight />
              </Link>
            </div>
          </div>
        )}
      </header>

      <section id="top" className="relative min-h-screen pt-16">
        <div className="absolute inset-0 bg-[linear-gradient(120deg,rgba(13,148,136,0.14),rgba(255,255,255,0.86)_36%,rgba(245,158,11,0.13))] dark:bg-[linear-gradient(120deg,rgba(20,184,166,0.18),rgba(15,23,42,0.72)_42%,rgba(234,179,8,0.13))]" />
        <div className="absolute inset-x-0 bottom-0 top-20 opacity-70">
          <ProductVisual />
        </div>

        <div className="relative mx-auto flex min-h-[calc(100vh-4rem)] max-w-7xl items-center px-4 py-20 sm:px-6 lg:px-8">
          <div className="max-w-3xl">
            <div className="mb-5 inline-flex items-center gap-2 rounded-full border bg-background/80 px-3 py-1 text-sm text-muted-foreground shadow-sm backdrop-blur">
              <Sparkles className="h-4 w-4 text-primary" />
              Enterprise pharmacy ERP for Indian pharmacies
            </div>
            <h1 className="max-w-4xl text-5xl font-bold leading-[1.05] sm:text-6xl lg:text-7xl">
              PharmaCare
            </h1>
            <p className="mt-6 max-w-2xl text-lg leading-8 text-muted-foreground sm:text-xl">
              Run inventory, POS billing, GST reports, customers, suppliers, purchases, alerts,
              and owner analytics from one fast pharmacy workspace.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link to="/auth/login" className={cn(buttonVariants({ size: 'lg' }), 'h-12')}>
                Try the live demo
                <ArrowRight />
              </Link>
              <a
                href="#modules"
                className={cn(buttonVariants({ variant: 'outline', size: 'lg' }), 'h-12 bg-background/75')}
              >
                Explore modules
              </a>
            </div>
          </div>
        </div>
      </section>

      <section id="product" className="border-y bg-card/60 py-16 sm:py-20">
        <div className="mx-auto grid max-w-7xl gap-8 px-4 sm:px-6 lg:grid-cols-[0.85fr_1.15fr] lg:px-8">
          <div>
            <p className="text-sm font-semibold uppercase text-primary">Built for pharmacy flow</p>
            <h2 className="mt-3 text-3xl font-semibold sm:text-4xl">
              Stock, billing, and compliance move together.
            </h2>
          </div>
          <div className="grid gap-4 sm:grid-cols-3">
            {metrics.map((item) => (
              <div key={item.label} className="rounded-lg border bg-background p-5 shadow-sm">
                <p className="text-sm text-muted-foreground">{item.label}</p>
                <div className="mt-3 flex items-end justify-between gap-3">
                  <p className="text-2xl font-semibold">{item.value}</p>
                  <span className="rounded-md bg-accent px-2 py-1 text-xs font-medium text-accent-foreground">
                    {item.trend}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="modules" className="py-16 sm:py-24">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="max-w-2xl">
            <p className="text-sm font-semibold uppercase text-primary">Complete module set</p>
            <h2 className="mt-3 text-3xl font-semibold sm:text-4xl">
              Everything the counter and the owner need.
            </h2>
          </div>

          <div className="mt-10 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {modules.map((item) => (
              <article key={item.title} className="rounded-lg border bg-card p-6 shadow-sm">
                <item.icon className="h-6 w-6 text-primary" />
                <h3 className="mt-5 text-lg font-semibold">{item.title}</h3>
                <p className="mt-3 leading-7 text-muted-foreground">{item.text}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section id="workflow" className="bg-secondary/65 py-16 sm:py-24">
        <div className="mx-auto grid max-w-7xl gap-10 px-4 sm:px-6 lg:grid-cols-2 lg:px-8">
          <div>
            <p className="text-sm font-semibold uppercase text-primary">Counter speed</p>
            <h2 className="mt-3 text-3xl font-semibold sm:text-4xl">
              A clean billing path for busy pharmacy hours.
            </h2>
            <p className="mt-5 leading-8 text-muted-foreground">
              PharmaCare keeps checkout focused while stock, customer history, payment state, and
              reporting update behind the scenes.
            </p>
          </div>
          <div className="space-y-3">
            {workflow.map((step, index) => (
              <div key={step} className="flex items-center gap-4 rounded-lg border bg-background p-4">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-primary text-sm font-semibold text-primary-foreground">
                  {index + 1}
                </span>
                <span className="font-medium">{step}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-16 sm:py-24">
        <div className="mx-auto grid max-w-7xl gap-8 px-4 sm:px-6 lg:grid-cols-[1fr_0.85fr] lg:px-8">
          <div className="rounded-lg border bg-card p-6 shadow-sm sm:p-8">
            <ShieldCheck className="h-7 w-7 text-primary" />
            <h2 className="mt-5 text-3xl font-semibold">Designed with controlled access.</h2>
            <div className="mt-6 space-y-4">
              {trustItems.map((item) => (
                <div key={item} className="flex gap-3">
                  <Check className="mt-1 h-5 w-5 shrink-0 text-success" />
                  <p className="leading-7 text-muted-foreground">{item}</p>
                </div>
              ))}
            </div>
          </div>

          <div id="pricing" className="rounded-lg border bg-primary p-6 text-primary-foreground shadow-sm sm:p-8">
            <BadgeIndianRupee className="h-7 w-7" />
            <p className="mt-6 text-sm font-semibold uppercase opacity-80">Demo package</p>
            <h2 className="mt-3 text-3xl font-semibold">Ready for deployment planning.</h2>
            <p className="mt-4 leading-7 opacity-85">
              The ERP modules are in place for a full pharmacy demo. Module 14 can take this into
              Vercel, Render, Supabase, and VPS deployment documentation.
            </p>
            <Link
              to="/auth/login"
              className={cn(
                buttonVariants({ variant: 'secondary', size: 'lg' }),
                'mt-7 h-12 bg-white text-foreground hover:bg-white/90',
              )}
            >
              Sign in to demo
              <ArrowRight />
            </Link>
          </div>
        </div>
      </section>

      <footer className="border-t py-8">
        <div className="mx-auto flex max-w-7xl flex-col gap-4 px-4 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between sm:px-6 lg:px-8">
          <p>PharmaCare ERP - inventory, billing, GST, customers, purchases, and reports.</p>
          <div className="flex gap-4">
            <a href="mailto:hello@pharmacare.app" className="inline-flex items-center gap-2 hover:text-foreground">
              <Mail className="h-4 w-4" />
              Contact
            </a>
            <Link to="/auth/login" className="hover:text-foreground">
              Login
            </Link>
          </div>
        </div>
      </footer>
    </main>
  );
}

function ProductVisual() {
  return (
    <div className="pointer-events-none absolute right-[-11rem] top-10 hidden w-[58rem] rotate-[-5deg] lg:block">
      <div className="rounded-lg border bg-background/88 p-4 shadow-2xl backdrop-blur">
        <div className="flex items-center justify-between border-b pb-3">
          <div className="flex items-center gap-2">
            <span className="h-3 w-3 rounded-full bg-destructive" />
            <span className="h-3 w-3 rounded-full bg-warning" />
            <span className="h-3 w-3 rounded-full bg-success" />
          </div>
          <span className="text-xs font-medium text-muted-foreground">PharmaCare / POS + Inventory</span>
        </div>
        <div className="grid gap-4 pt-4 lg:grid-cols-[1.1fr_0.9fr]">
          <div className="rounded-lg border bg-card p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Invoice</p>
                <p className="font-semibold">INV-2026-0048</p>
              </div>
              <ReceiptText className="h-5 w-5 text-primary" />
            </div>
            <div className="mt-5 space-y-3">
              {[
                ['Azithromycin 500', '2 strips', '₹280'],
                ['Paracetamol 650', '4 strips', '₹168'],
                ['ORS Sachet', '6 packs', '₹120'],
              ].map(([name, qty, price]) => (
                <div key={name} className="grid grid-cols-[1fr_auto_auto] gap-4 rounded-md bg-secondary p-3 text-sm">
                  <span className="font-medium">{name}</span>
                  <span className="text-muted-foreground">{qty}</span>
                  <span>{price}</span>
                </div>
              ))}
            </div>
            <div className="mt-5 rounded-lg bg-primary p-4 text-primary-foreground">
              <div className="flex justify-between text-sm opacity-85">
                <span>GST included</span>
                <span>UPI paid</span>
              </div>
              <div className="mt-2 flex items-end justify-between">
                <span className="text-sm">Grand total</span>
                <span className="text-2xl font-semibold">₹568</span>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <div className="rounded-lg border bg-card p-4">
              <div className="flex items-center justify-between">
                <p className="font-semibold">Stock alerts</p>
                <BellRing className="h-5 w-5 text-warning" />
              </div>
              <div className="mt-4 space-y-3">
                {[
                  ['Insulin Glargine', 'Low stock'],
                  ['Cefixime 200', 'Expires soon'],
                  ['Vitamin D3', 'Reorder'],
                ].map(([name, state]) => (
                  <div key={name} className="flex items-center justify-between rounded-md border p-3 text-sm">
                    <span>{name}</span>
                    <span className="rounded-md bg-accent px-2 py-1 text-xs">{state}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="rounded-lg border bg-card p-4">
                <ClipboardList className="h-5 w-5 text-primary" />
                <p className="mt-4 text-2xl font-semibold">248</p>
                <p className="text-xs text-muted-foreground">Active batches</p>
              </div>
              <div className="rounded-lg border bg-card p-4">
                <BarChart3 className="h-5 w-5 text-primary" />
                <p className="mt-4 text-2xl font-semibold">18%</p>
                <p className="text-xs text-muted-foreground">Margin trend</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
