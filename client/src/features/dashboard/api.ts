import { api, qs } from '@/lib/api';

export const DASHBOARD_RANGES = [7, 30, 90] as const;
export type DashboardRange = (typeof DASHBOARD_RANGES)[number];

export interface DashboardStats {
  range: { days: number; from: string };
  totals: {
    doctors: number;
    patients: number;
    patientsAdded: number;
    patientsAddedPrev: number;
    doctorsAdded: number;
    doctorsAddedPrev: number;
  };
  patientsPerDoctor: { doctorId: string; name: string; specialization: string; count: number }[];
  /** Patients of every doctor outside the top list, so bars add up to the total. */
  othersCount: number;
  series: { date: string; count: number }[];
  conditions: { condition: string; count: number }[];
}

export const fetchDashboard = (days: DashboardRange) => api<DashboardStats>(`/dashboard/stats${qs({ days })}`);
