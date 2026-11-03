'use client';

import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { fetchDashboard, type DashboardRange } from './api';

/** Key prefix ['dashboard'] is invalidated by every doctor/patient mutation. */
export const dashboardKeys = { stats: (days: DashboardRange) => ['dashboard', 'stats', days] as const };

export const useDashboard = (days: DashboardRange) =>
  useQuery({
    queryKey: dashboardKeys.stats(days),
    queryFn: () => fetchDashboard(days),
    placeholderData: keepPreviousData, // refetch keeps the previous render on screen
  });
