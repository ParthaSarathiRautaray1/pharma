import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';

/** Placeholder — replaced by the full marketing site in Module 13. */
export default function HomePage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-4 px-4 text-center">
      <h1 className="text-4xl font-bold tracking-tight">PharmaCare</h1>
      <p className="max-w-md text-muted-foreground">
        Modern pharmacy management — inventory, billing, GST invoicing and analytics in one
        place.
      </p>
      <Button className="mt-2">
        <Link to="/auth/login">Sign in to your pharmacy</Link>
      </Button>
    </main>
  );
}
