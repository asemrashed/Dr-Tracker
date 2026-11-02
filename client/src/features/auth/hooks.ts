'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { fetchMe, login, logout } from './api';

export const authKeys = { me: ['auth', 'me'] as const };

/** The signed-in user. Cached, and never retried (a 401 is an answer, not a glitch). */
export function useCurrentUser() {
  return useQuery({
    queryKey: authKeys.me,
    queryFn: fetchMe,
    retry: false,
    staleTime: 5 * 60_000,
  });
}

export function useLogin() {
  // mutationKey lets the global error handler skip login (the form shows its own errors).
  return useMutation({ mutationKey: ['login'], mutationFn: login });
}

export function useLogout() {
  const router = useRouter();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: logout,
    onSettled: () => {
      // Drop every cached query so the next user never sees the previous user's data.
      queryClient.clear();
      router.replace('/login');
    },
  });
}
