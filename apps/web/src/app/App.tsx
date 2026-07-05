/**
 * Application root. Providers (QueryClient, Router, Theme, Toaster) and
 * the route tree are assembled here as modules are built:
 *   /            → marketing site (public, lazy)
 *   /auth/*      → login / forgot password
 *   /app/*       → ERP (protected, role-guarded)
 */
export default function App() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-background text-foreground">
      <div className="text-center">
        <h1 className="text-3xl font-semibold tracking-tight">PharmaCare</h1>
        <p className="mt-2 text-muted-foreground">Scaffold ready — modules coming next.</p>
      </div>
    </main>
  );
}
