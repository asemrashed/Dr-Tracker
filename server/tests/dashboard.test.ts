import request from 'supertest';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { createCollection } from './fakeDb';
import { fillDays, periodBounds } from '../src/modules/dashboard/dashboard.utils';

const { doctors, patients } = vi.hoisted(() => ({
  doctors: {} as ReturnType<typeof createCollection>,
  patients: {} as ReturnType<typeof createCollection>,
}));
vi.mock('../src/modules/doctors/doctor.model', async () => {
  const { createCollection } = await import('./fakeDb');
  Object.assign(doctors, createCollection('doctors'));
  return { Doctor: doctors.model };
});
vi.mock('../src/modules/patients/patient.model', async () => {
  const { createCollection } = await import('./fakeDb');
  Object.assign(patients, createCollection('patients'));
  return { Patient: patients.model };
});

import { createApp } from '../src/app';
import { signToken } from '../src/modules/auth/token';
import { stats } from '../src/modules/dashboard/dashboard.service';

const app = createApp();
const cookie = `dt_token=${signToken({ userId: 'u1', role: 'admin' })}`;
const get = (q = '') => request(app).get(`/api/v1/dashboard/stats${q}`).set('Cookie', cookie);

const NOW = new Date('2026-11-03T10:00:00Z');
const daysAgo = (n: number) => new Date(NOW.getTime() - n * 86_400_000);

let seq = 0;
const doctor = (name: string, over: Record<string, unknown> = {}) =>
  doctors.insert({ name, specialization: 'Cardiology', hospital: 'H', phone: '+8801', email: `${++seq}@x.com`, ...over });
const patient = (doctorId: string, ageDays: number, over: Record<string, unknown> = {}) =>
  patients.insert({ name: `P${++seq}`, age: 30, gender: 'male', phone: '+8801', condition: 'Asthma', doctorId, createdAt: daysAgo(ageDays), ...over });

beforeEach(() => {
  doctors.reset();
  patients.reset();
});

describe('helpers', () => {
  it('computes inclusive UTC period bounds', () => {
    const { from, prevFrom } = periodBounds(7, NOW);
    expect(from.toISOString()).toBe('2026-10-28T00:00:00.000Z'); // 7 days incl. Nov 3
    expect(prevFrom.toISOString()).toBe('2026-10-21T00:00:00.000Z');
  });

  it('zero-fills every day of the period', () => {
    const { from } = periodBounds(3, NOW);
    expect(fillDays([{ _id: '2026-11-02', count: 4 }], from, 3)).toEqual([
      { date: '2026-11-01', count: 0 },
      { date: '2026-11-02', count: 4 },
      { date: '2026-11-03', count: 0 },
    ]);
  });
});

describe('stats()', () => {
  it('aggregates totals, per-doctor, series and conditions, excluding soft-deleted records', async () => {
    const a = doctor('Dr. A', { createdAt: daysAgo(2) });
    const b = doctor('Dr. B', { createdAt: daysAgo(40) });
    doctor('Dr. Gone', { isDeleted: true, createdAt: daysAgo(1) });
    for (let i = 0; i < 3; i++) patient(String(a._id), 1, { condition: 'Asthma' });
    patient(String(a._id), 5, { condition: 'Diabetes' });
    patient(String(b._id), 10, { condition: 'Asthma' });
    patient(String(b._id), 45, { condition: 'Asthma' }); // 45d old: outside the 30-day period, inside the 30 days before it
    patient(String(b._id), 1, { isDeleted: true }); // must be ignored everywhere

    const s = await stats(30, NOW);
    expect(s.totals).toEqual({
      doctors: 2,
      patients: 6,
      patientsAdded: 5, // 1d x3, 5d, 10d
      patientsAddedPrev: 1, // 45d
      doctorsAdded: 1, // Dr. A (2d); Dr. B is 40d old; deleted doctor excluded
      doctorsAddedPrev: 1, // Dr. B (40d)
    });
    expect(s.patientsPerDoctor).toEqual([
      expect.objectContaining({ name: 'Dr. A', count: 4 }),
      expect.objectContaining({ name: 'Dr. B', count: 2 }),
    ]);
    expect(s.othersCount).toBe(0);
    expect(s.conditions).toEqual([
      { condition: 'Asthma', count: 5 },
      { condition: 'Diabetes', count: 1 },
    ]);
    expect(s.series).toHaveLength(30);
    expect(s.series.reduce((n, d) => n + d.count, 0)).toBe(s.totals.patientsAdded);
    expect(s.series.at(-1)).toEqual({ date: '2026-11-03', count: 0 });
    expect(s.series.find((d) => d.date === '2026-11-02')?.count).toBe(3);
  });

  it('keeps the top 8 doctors and puts everyone else in othersCount so bars sum to the total', async () => {
    for (let i = 1; i <= 10; i++) {
      const d = doctor(`Dr. ${i}`);
      for (let j = 0; j < i; j++) patient(String(d._id), 1);
    }
    const s = await stats(7, NOW);
    expect(s.patientsPerDoctor).toHaveLength(8);
    expect(s.patientsPerDoctor[0]).toMatchObject({ name: 'Dr. 10', count: 10 });
    expect(s.othersCount).toBe(1 + 2); // Dr. 1 and Dr. 2
    expect(s.patientsPerDoctor.reduce((n, d) => n + d.count, 0) + s.othersCount).toBe(s.totals.patients);
  });

  it('returns empty, well-formed data for an empty database', async () => {
    const s = await stats(7, NOW);
    expect(s.totals.patients).toBe(0);
    expect(s.patientsPerDoctor).toEqual([]);
    expect(s.conditions).toEqual([]);
    expect(s.series).toHaveLength(7);
  });
});

describe('GET /dashboard/stats', () => {
  it('requires authentication', async () => {
    expect((await request(app).get('/api/v1/dashboard/stats')).status).toBe(401);
  });

  it('defaults to 30 days and accepts 7 / 30 / 90 only', async () => {
    expect((await get()).body.data.range.days).toBe(30);
    expect((await get('?days=90')).body.data.series).toHaveLength(90);
    expect((await get('?days=7')).body.data.series).toHaveLength(7);
    for (const bad of ['5', '0', '-1', 'abc', '365']) {
      const res = await get(`?days=${bad}`);
      expect(res.status, bad).toBe(400);
    }
  });
});
