import { Construction } from 'lucide-react';
import { PageHeader } from './PageHeader';

/** Placeholder page used while a module is under construction. */
export function ComingSoon({ title }: { title: string }) {
  return (
    <div>
      <PageHeader title={title} />
      <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed py-24 text-center">
        <span className="flex h-12 w-12 items-center justify-center rounded-full bg-muted text-muted-foreground">
          <Construction className="h-6 w-6" />
        </span>
        <p className="font-medium">This module is on its way</p>
        <p className="max-w-sm text-sm text-muted-foreground">
          {title} is being built as part of the phased rollout.
        </p>
      </div>
    </div>
  );
}
