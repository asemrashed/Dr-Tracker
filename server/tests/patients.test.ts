import request from 'supertest';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { createCollection } from './fakeDb';

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
vi.mock('../src/shared/transaction', () => ({ runAtomically: (work: () => unknown) => work() }));

import { createApp } from '../src/app';
import { signToken } from '../src/modules/auth/token';

const app = createApp();
const cookie = `dt_token=${signToken({ userId: 'u1', role: 'admin' })}`;
const get = (url: string) => request(app).get(`/api/v1${url}`).set('Cookie', cookie);
const patch = (url: string, body: object) => request(app).patch(`/api/v1${url}`).set('Cookie', cookie).send(body);

const doctor = (over: Record<string, unknown> = {}) =>
  doctors.insert({ name: 'Dr. A', specialization: 'Cardiology', hospital: 'H', phone: '+8801700000000', email: 'a@x.com', ...over });
const patient = (doctorId: string, over: Record<string, unknown> = {}) =>
  patients.insert({ name: 'Pat', age: 30, gender: 'male', phone: '+8801700000001', condition: 'Asthma', doctorId, ...over });

beforeEach(() => {
  doctors.reset();
  patients.reset();
});

describe('GET /patients', () => {
  it('requires authentication', async () => {
    expect((await request(app).get('/api/v1/patients')).status).toBe(401);
    expect((await request(app).patch(`/api/v1/patients/${'a'.repeat(24)}`).send({ age: 3 })).status).toBe(401);
  });

  it('lists active patients with their doctor, filters and pagination meta', async () => {
    const d1 = doctor({ name: 'Dr. One' });
    const d2 = doctor({ name: 'Dr. Two', specialization: 'Neurology' });
    patient(String(d1._id), { name: 'Alice', condition: 'Asthma', gender: 'female' });
    patient(String(d1._id), { name: 'Albert', condition: 'Diabetes', gender: 'male' });
    patient(String(d2._id), { name: 'Bob', condition: 'Asthma', gender: 'male' });
    patient(String(d2._id), { name: 'Ghost', isDeleted: true });

    const all = await get('/patients');
    expect(all.status).toBe(200);
    expect(all.body.meta).toEqual({ page: 1, limit: 10, total: 3, totalPages: 1 });
    const bob = all.body.data.find((p: { name: string }) => p.name === 'Bob');
    expect(bob.doctor).toMatchObject({ name: 'Dr. Two', specialization: 'Neurology' });

    expect((await get('/patients?condition=Asthma')).body.data).toHaveLength(2);
    expect((await get('/patients?gender=female')).body.data.map((p: { name: string }) => p.name)).toEqual(['Alice']);
    expect((await get(`/patients?doctorId=${d2._id}`)).body.data.map((p: { name: string }) => p.name)).toEqual(['Bob']);
    expect((await get('/patients?search=al')).body.data).toHaveLength(2);
    expect((await get('/patients?condition=asthma')).status).toBe(400); // enum is case-sensitive
    expect((await get('/patients?doctorId=nope')).status).toBe(400);
  });

  it('sorts by age and paginates', async () => {
    const d = doctor();
    for (const [name, age] of [['A', 50], ['B', 20], ['C', 35]] as const) patient(String(d._id), { name, age });
    const res = await get('/patients?sort=age&order=asc&limit=2&page=2');
    expect(res.body.data.map((p: { age: number }) => p.age)).toEqual([50]);
    expect(res.body.meta).toMatchObject({ total: 3, totalPages: 2, page: 2 });
  });
});

describe('PATCH /patients/:id', () => {
  it('edits fields, coerces age, and keeps the search key in sync', async () => {
    const d = doctor();
    const p = patient(String(d._id), { name: 'Old Name' });
    const res = await patch(`/patients/${p._id}`, { name: 'New Name', age: '44', condition: 'Migraine' });
    expect(res.status).toBe(200);
    expect(res.body.data).toMatchObject({ name: 'New Name', age: 44, condition: 'Migraine' });
    expect(p.nameLower).toBe('new name');
  });

  it('reassigns a patient to another active doctor', async () => {
    const d1 = doctor();
    const d2 = doctor({ name: 'Dr. Two', specialization: 'Neurology' }); // any specialization is fine for a single patient
    const p = patient(String(d1._id));
    const res = await patch(`/patients/${p._id}`, { doctorId: String(d2._id) });
    expect(res.status).toBe(200);
    expect(res.body.data.doctor.name).toBe('Dr. Two');
    expect(p.doctorId).toBe(String(d2._id));
  });

  it('rejects a deleted or unknown target doctor and leaves the patient unchanged', async () => {
    const d1 = doctor();
    const gone = doctor({ isDeleted: true });
    const p = patient(String(d1._id));
    expect((await patch(`/patients/${p._id}`, { doctorId: String(gone._id) })).status).toBe(400);
    expect((await patch(`/patients/${p._id}`, { doctorId: 'c'.repeat(24) })).status).toBe(400);
    expect(p.doctorId).toBe(String(d1._id));
  });

  it('validates input and 404s for missing or deleted patients', async () => {
    const d = doctor();
    const p = patient(String(d._id));
    expect((await patch(`/patients/${p._id}`, {})).status).toBe(400);
    expect((await patch(`/patients/${p._id}`, { age: 500 })).status).toBe(400);
    expect((await patch(`/patients/${p._id}`, { gender: 'x' })).status).toBe(400);
    const gone = patient(String(d._id), { isDeleted: true });
    expect((await patch(`/patients/${gone._id}`, { age: 5 })).status).toBe(404);
    expect((await patch(`/patients/${'b'.repeat(24)}`, { age: 5 })).status).toBe(404);
  });
});

describe('GET /doctors/meta/options', () => {
  it('returns active doctors only, minimal fields', async () => {
    doctor({ name: 'Dr. Zed' });
    doctor({ name: 'Dr. Amy' });
    doctor({ name: 'Dr. Gone', isDeleted: true });
    const res = await get('/doctors/meta/options');
    expect(res.status).toBe(200);
    expect(res.body.data.map((d: { name: string }) => d.name)).toEqual(['Dr. Amy', 'Dr. Zed']);
    expect(Object.keys(res.body.data[0]).sort()).toEqual(['id', 'name', 'specialization']);
  });
});
