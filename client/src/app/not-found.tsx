import { Compass } from 'lucide-react';
import Link from 'next/link';
import { Logo } from '@/components/shared/logo';
import { buttonVariants } from '@/components/ui/button';

export default function NotFound() {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center px-6 text-center">
      <Logo />
      <span className="mt-10 flex size-12 items-center justify-center rounded-full bg-primary-50 text-primary-600">
        <Compass className="size-6" aria-hidden />
      </span>
      <h1 className="mt-4 text-[26px] font-semibold tracking-tight">Page not found</h1>
      <p className="mt-1.5 max-w-sm text-[15px] text-ink-muted">The page you are looking for does not exist or has moved.</p>
      <Link href="/dashboard" className={`${buttonVariants({ variant: 'primary' })} mt-6`}>
        Go to dashboard
      </Link>
    </main>
  );
}
