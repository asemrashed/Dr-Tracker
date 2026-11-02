'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useQueryClient } from '@tanstack/react-query';
import { CircleAlert } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { PasswordInput } from '@/components/ui/password-input';
import { ApiError } from '@/lib/api';
import type { UserRole } from '../api';
import { DEMO_LOGIN_ENABLED, DEMO_PASSWORD, type DemoAccount } from '../demo-accounts';
import { authKeys, useLogin } from '../hooks';
import { loginSchema, type LoginValues } from '../schemas';
import { DemoAccess } from './demo-access';

function errorMessage(error: unknown): string {
  if (error instanceof ApiError) {
    if (error.status === 401) return 'Invalid email or password.';
    return error.message; // includes ROLE_NOT_ENABLED, rate limit and network messages
  }
  return 'Something went wrong. Please try again.';
}

export function LoginForm({ redirectTo }: { redirectTo: string }) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const login = useLogin();
  const [formError, setFormError] = useState<string | null>(null);
  const [demoRole, setDemoRole] = useState<UserRole | null>(null);
  const demoTimer = useRef<number | undefined>(undefined);

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<LoginValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', password: '' },
  });

  useEffect(() => () => window.clearTimeout(demoTimer.current), []);

  // Stay disabled after success too, so the button never flashes back before the redirect.
  const busy = login.isPending || login.isSuccess;

  const submit = handleSubmit((values) => {
    setFormError(null);
    login.mutate(values, {
      onSuccess: (user) => {
        queryClient.setQueryData(authKeys.me, user);
        router.refresh();
        window.location.replace(redirectTo);
      },
      onError: (error) => {
        setFormError(errorMessage(error));
        setDemoRole(null);
      },
    });
  });

  /** Fill the fields (so the reviewer sees it happen), then submit the normal login form. */
  const signInWithDemo = (account: DemoAccount) => {
    setFormError(null);
    setDemoRole(account.role);
    setValue('email', account.email, { shouldValidate: true });
    setValue('password', DEMO_PASSWORD, { shouldValidate: true });
    demoTimer.current = window.setTimeout(() => void submit(), 350);
  };

  return (
    <div>
      <h1 className="text-[28px] font-semibold leading-tight tracking-tight">Welcome back</h1>
      <p className="mt-2 text-[15px] text-ink-muted">Sign in to manage doctors, patients and insights.</p>

      <form onSubmit={submit} noValidate className="mt-8 space-y-5">
        {formError && (
          <div
            role="alert"
            className="flex items-start gap-2.5 rounded-input bg-danger-50 px-3.5 py-3 text-sm text-danger-700"
          >
            <CircleAlert className="mt-0.5 size-4 shrink-0" aria-hidden />
            <span>{formError}</span>
          </div>
        )}

        <div>
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            type="email"
            inputMode="email"
            autoComplete="email"
            placeholder="you@example.com"
            aria-invalid={errors.email ? true : undefined}
            aria-describedby={errors.email ? 'email-error' : undefined}
            {...register('email')}
          />
          {errors.email && (
            <p id="email-error" className="mt-1.5 text-[13px] text-danger-700">
              {errors.email.message}
            </p>
          )}
        </div>

        <div>
          <Label htmlFor="password">Password</Label>
          <PasswordInput
            id="password"
            autoComplete="current-password"
            placeholder="Enter your password"
            aria-invalid={errors.password ? true : undefined}
            aria-describedby={errors.password ? 'password-error' : undefined}
            {...register('password')}
          />
          {errors.password && (
            <p id="password-error" className="mt-1.5 text-[13px] text-danger-700">
              {errors.password.message}
            </p>
          )}
        </div>

        <Button type="submit" className="w-full" loading={busy}>
          {busy ? 'Signing in…' : 'Sign in'}
        </Button>
      </form>

      {DEMO_LOGIN_ENABLED && <DemoAccess activeRole={demoRole} busy={busy} onSelect={signInWithDemo} />}
    </div>
  );
}
