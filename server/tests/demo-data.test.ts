import { describe, expect, it } from 'vitest';
import { buildDemoData, DEMO_EMAIL_DOMAIN } from '../src/scripts/demo-data';
import { createDoctorSchema } from '../src/modules/doctors/doctor.schema';
import { createPatientSchema } from '../src/modules/patients/patient.schema';
import { SPECIALIZATIONS } from '../src/shared/constants';

const NOW = new Date('2026-11-03T10:00:00Z');
const DAY = 86_400_000;
const data = buildDemoData({ now: NOW });

describe('demo data generator', () => {
  it('is deterministic for the same seed and clock', () => {
    expect(buildDemoData({ now: NOW })).toEqual(data);
    expect(buildDemoData({ now: NOW, seed: 99 }).doctors[0]?.name).not.toBe(data.doctors[0]?.name);
  });

  it('produces exactly the requested number of patients', () => {
    expect(data.patients).toHaveLength(600);
    expect(buildDemoData({ now: NOW, patients: 5000 }).patients).toHaveLength(5000);
    expect(buildDemoData({ now: NOW, patients: 90 }).patients).toHaveLength(90);
  });

  it('covers every specialization; Oncology and Ophthalmology have a single doctor (no-candidate demo)', () => {
    const per = new Map<string, number>();
    data.doctors.forEach((d) => per.set(d.specialization, (per.get(d.specialization) ?? 0) + 1));
    expect(data.doctors).toHaveLength(30);
    expect([...per.keys()].sort()).toEqual([...SPECIALIZATIONS].sort());
    expect(per.get('Oncology')).toBe(1);
    expect(per.get('Ophthalmology')).toBe(1);
    for (const [spec, n] of per) if (spec !== 'Oncology' && spec !== 'Ophthalmology') expect(n, spec).toBeGreaterThanOrEqual(2);
  });

  it('gives every doctor at least 3 patients, with a skewed distribution', () => {
    const per = new Map<number, number>();
    data.patients.forEach((p) => per.set(p.doctorKey, (per.get(p.doctorKey) ?? 0) + 1));
    expect(per.size).toBe(30);
    const counts = [...per.values()].sort((a, b) => b - a);
    expect(Math.min(...counts)).toBeGreaterThanOrEqual(3);
    expect(counts[0]!).toBeGreaterThan(counts.at(-1)! * 3); // busy doctors vs the long tail
  });

  it('only generates values the API itself would accept', () => {
    for (const d of data.doctors) {
      expect(() => createDoctorSchema.parse({ name: d.name, specialization: d.specialization, hospital: d.hospital, phone: d.phone, email: d.email }), d.email).not.toThrow();
    }
    for (const p of data.patients) {
      expect(() => createPatientSchema.parse({ name: p.name, age: p.age, gender: p.gender, phone: p.phone, condition: p.condition }), p.name).not.toThrow();
    }
  });

  it('has unique demo e-mails and normalized search keys', () => {
    const emails = data.doctors.map((d) => d.email);
    expect(new Set(emails).size).toBe(emails.length);
    expect(emails.every((e) => e.endsWith(`@${DEMO_EMAIL_DOMAIN}`))).toBe(true);
    expect(data.doctors.every((d) => d.nameLower === d.name.toLowerCase())).toBe(true);
    expect(data.patients.every((p) => p.nameLower === p.name.toLowerCase())).toBe(true);
  });

  it('keeps dates sensible: never in the future, never before the doctor, within 90 days', () => {
    const byKey = new Map(data.doctors.map((d) => [d.key, d]));
    for (const p of data.patients) {
      expect(p.createdAt.getTime()).toBeLessThanOrEqual(NOW.getTime());
      expect(p.createdAt.getTime()).toBeGreaterThanOrEqual(byKey.get(p.doctorKey)!.createdAt.getTime());
      expect(NOW.getTime() - p.createdAt.getTime()).toBeLessThan(91 * DAY);
    }
    const recentDoctors = data.doctors.filter((d) => NOW.getTime() - d.createdAt.getTime() < 30 * DAY);
    expect(recentDoctors.length).toBeGreaterThanOrEqual(3); // "doctors added" tile has something to say
  });

  it('shows growth over time and quieter weekends (so the chart is not flat noise)', () => {
    const recent = data.patients.filter((p) => NOW.getTime() - p.createdAt.getTime() < 45 * DAY).length;
    expect(recent).toBeGreaterThan(data.patients.length - recent);
    const weekend = data.patients.filter((p) => [5, 6].includes(p.createdAt.getUTCDay())).length;
    expect(weekend / data.patients.length).toBeLessThan(0.2); // 2/7 = 0.29 if uniform
  });

  it('uses a realistic condition and age mix', () => {
    const peds = data.doctors.filter((d) => d.specialization === 'Pediatrics').map((d) => d.key);
    expect(data.patients.filter((p) => peds.includes(p.doctorKey)).every((p) => p.age <= 16)).toBe(true);
    expect(new Set(data.patients.map((p) => p.condition)).size).toBeGreaterThanOrEqual(8);
    // The catch-all "Other" must not dominate the condition chart.
    expect(data.patients.filter((p) => p.condition === 'Other').length / data.patients.length).toBeLessThan(0.15);
  });
});
