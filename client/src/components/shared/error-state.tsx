import { TriangleAlert } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface ErrorStateProps {
  title?: string;
  message: string;
  onRetry?: () => void;
  retrying?: boolean;
}

export function ErrorState({ title = "Couldn't load this", message, onRetry, retrying }: ErrorStateProps) {
  return (
    <div role="alert" className="flex flex-col items-center rounded-card border border-line bg-surface px-6 py-14 text-center">
      <span className="flex size-12 items-center justify-center rounded-full bg-warning-50 text-warning-700">
        <TriangleAlert className="size-6" aria-hidden />
      </span>
      <h2 className="mt-4 text-base font-semibold">{title}</h2>
      <p className="mt-1.5 max-w-sm text-sm text-ink-muted">{message}</p>
      {onRetry && (
        <Button className="mt-5" variant="tint" onClick={onRetry} loading={retrying}>
          Try again
        </Button>
      )}
    </div>
  );
}
