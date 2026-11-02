import type { Metadata } from 'next';
import { Logo } from '@/components/shared/logo';
import { BrandPanel } from '@/features/auth/components/brand-panel';
import { LoginForm } from '@/features/auth/components/login-form';
import { safeRedirectPath } from '@/lib/utils';

export const metadata: Metadata = { title: 'Sign in' };

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const { next } = await searchParams;

  return (
    <main className="grid min-h-dvh lg:grid-cols-[minmax(0,1.05fr)_minmax(0,1fr)]">
      <BrandPanel />
      <section className="flex items-center justify-center px-4 py-10 sm:px-8">
        <div className="w-full max-w-[420px]">
          <Logo className="mb-10 lg:hidden" />
          <LoginForm redirectTo={safeRedirectPath(next)} />
        </div>
      </section>
    </main>
  );
}
