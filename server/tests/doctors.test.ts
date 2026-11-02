import request from 'supertest';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createCollection } from './fakeDb';

const { doctors, patients } = vi.hoisted(() => ({ doctors: {} as ReturnType<typeof createCollection>, patients: {} as ReturnType<typeof createCollection> }));

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
// No MongoDB here: run the "transaction" body directly.
vi.mock('../src/shared/transaction', () => ({ runAtomically: (work: () => unknown) => work() }));

import { createApp } from '../src/app';
import { signToken } from '../src/modules/auth/token';

const app = createApp();
const adminCookie = `dt_token=${signToken({ userId: 'u1', role: 'admin' })}`;
const api = {
  get: (url: string) => request(app).get(`/api/v1${url}`).set('Cookie', adminCookie),
  post: (url: string, body?: object) => request(app).post(`/api/v1${url}`).set('Cookie', adminCookie).send(body),
  patch: (url: string, body?: object) => request(app).patch(`/api/v1${url}`).set('Cookie', adminCookie).send(body),
  del: (url: string) => request(app).delete(`/api/v1${url}`).set('Cookie', adminCookie),
};

const doctor = (over: Record<string, unknown> = {}) =>
  doctors.insert({
    name: 'Dr. Ada Lovelace',
    specialization: 'Cardiology',
    hospital: 'City Hospital',
    phone: '+8801700000000',
    email: `d${Math.random()}@x.com`,
    ...over,
  });
const patient = (doctorId: string, over: Record<string, unknown> = {}) =>
  patients.insert({ name: 'Pat', age: 30, gender: 'male', phone: '+8801700000001', condition: 'Asthma', doctorId, ...over });

beforeEach(() => {
  doctors.reset();
  patients.reset();
});

describe('access control', () => {
  it('rejects unauthenticated requests with 401 on every doctors route', async () => {
    for (const [method, url] of [
      ['get', '/api/v1/doctors'],
      ['post', '/api/v1/doctors'],
      ['get', '/api/v1/doctors/meta/specializations'],
      ['delete', `/api/v1/doctors/${'a'.repeat(24)}`],
      ['delete', `/api/v1/patients/${'a'.repeat(24)}`],
    ] as const) {
      const res = await request(app)[method](url);
      expect(res.status, `${method} ${url}`).toBe(401);
    }
  });
});

describe('validation', () => {
  it('rejects invalid create payloads with field-level details', async () => {
    const res = await api.post('/doctors', { name: 'A', specialization: 'Astrology', phone: 'abc', email: 'nope' });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
    const fields = res.body.error.details.map((d: { field: string }) => d.field);
    expect(fields).toEqual(expect.arrayContaining(['name', 'specialization', 'hospital', 'phone', 'email']));
  });

  it('rejects operator injection in query and body', async () => {
    // Express 5 does not parse nested query objects: `search[$ne]` is just an unknown key that
    // validation strips, so no operator can reach MongoDB and nothing is filtered by it.
    doctor({ name: 'Visible' });
    const q = await request(app).get('/api/v1/doctors?search[$ne]=x').set('Cookie', adminCookie);
    expect(q.status).toBe(200);
    expect(q.body.data).toHaveLength(1);
    const res = await api.post('/doctors', { name: { $gt: '' } });
    expect(res.status).toBe(400);
  });

  it('rejects a malformed id and out-of-range paging', async () => {
    expect((await api.get('/doctors/not-an-id')).status).toBe(400);
    expect((await api.get('/doctors?limit=500')).status).toBe(400);
    expect((await api.get('/doctors?page=0')).status).toBe(400);
  });
});

describe('doctors CRUD', () => {
  const payload = {
    name: '  Dr. Grace Hopper ',
    specialization: 'Neurology',
    hospital: 'Central',
    phone: '+880 1700 000000',
    email: 'Grace@Example.com',
  };

  it('creates a doctor, trimming and lowercasing input, and strips unknown keys', async () => {
    const res = await api.post('/doctors', { ...payload, isDeleted: true, role: 'admin' });
    expect(res.status).toBe(201);
    expect(res.body.data).toMatchObject({ name: 'Dr. Grace Hopper', email: 'grace@example.com', patientCount: 0 });
    expect(doctors.rows[0]!).not.toMatchObject({ role: 'admin' });
    expect(doctors.rows[0]!.isDeleted).toBe(false);
  });

  it('blocks a duplicate email among active doctors but allows reuse after a delete', async () => {
    await api.post('/doctors', payload);
    const dup = await api.post('/doctors', payload);
    expect(dup.status).toBe(409);
    expect(dup.body.error.code).toBe('EMAIL_TAKEN');

    const id = String(doctors.rows[0]!._id);
    expect((await api.del(`/doctors/${id}`)).status).toBe(204);
    expect((await api.post('/doctors', payload)).status).toBe(201);
  });

  it('lists with patient counts, filters and pagination meta', async () => {
    const a = doctor({ name: 'Alice', specialization: 'Cardiology' });
    doctor({ name: 'Bob', specialization: 'Neurology' });
    doctor({ name: 'Gone', isDeleted: true });
    patient(String(a._id));
    patient(String(a._id));
    patient(String(a._id), { isDeleted: true });

    const all = await api.get('/doctors?limit=10');
    expect(all.body.meta).toEqual({ page: 1, limit: 10, total: 2, totalPages: 1 });
    const alice = all.body.data.find((d: { name: string }) => d.name === 'Alice');
    expect(alice.patientCount).toBe(2); // soft-deleted patient not counted

    const filtered = await api.get('/doctors?specialization=Neurology');
    expect(filtered.body.data.map((d: { name: string }) => d.name)).toEqual(['Bob']);

    const searched = await api.get('/doctors?search=ali');
    expect(searched.body.data).toHaveLength(1);
  });

  it('treats search text literally (regex metacharacters are escaped)', async () => {
    doctor({ name: 'Alice' });
    const res = await request(app).get('/api/v1/doctors').query({ search: '.*' }).set('Cookie', adminCookie);
    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(0);
  });

  it('edits a doctor, rejects a taken email and keeps the search key in sync', async () => {
    const a = doctor({ name: 'Alice', email: 'alice@x.com' });
    doctor({ name: 'Bob', email: 'bob@x.com' });
    const ok = await api.patch(`/doctors/${a._id}`, { name: 'Alicia Keys', hospital: 'North Clinic' });
    expect(ok.status).toBe(200);
    expect(ok.body.data).toMatchObject({ name: 'Alicia Keys', hospital: 'North Clinic' });
    expect(a.nameLower).toBe('alicia keys');

    const taken = await api.patch(`/doctors/${a._id}`, { email: 'BOB@x.com' });
    expect(taken.status).toBe(409);
    expect(taken.body.error.code).toBe('EMAIL_TAKEN');

    expect((await api.patch(`/doctors/${a._id}`, {})).status).toBe(400);
    expect((await api.patch(`/doctors/${a._id}`, { specialization: 'Astrology' })).status).toBe(400);
  });

  it('returns 404 for a missing or deleted doctor', async () => {
    const gone = doctor({ isDeleted: true });
    expect((await api.get(`/doctors/${gone._id}`)).status).toBe(404);
    expect((await api.get(`/doctors/${'b'.repeat(24)}`)).status).toBe(404);
  });
});

describe('deleting a doctor', () => {
  it('soft-deletes a doctor with no patients', async () => {
    const d = doctor();
    const res = await api.del(`/doctors/${d._id}`);
    expect(res.status).toBe(204);
    expect(doctors.rows[0]!.isDeleted).toBe(true);
    expect(doctors.rows[0]!.deletedAt).toBeInstanceOf(Date);
  });

  it('returns 409 DOCTOR_HAS_PATIENTS with the data the UI needs, and deletes nothing', async () => {
    const d = doctor();
    patient(String(d._id));
    patient(String(d._id));
    const res = await api.del(`/doctors/${d._id}`);
    expect(res.status).toBe(409);
    expect(res.body.error).toMatchObject({
      code: 'DOCTOR_HAS_PATIENTS',
      details: { patientCount: 2, specialization: 'Cardiology' },
    });
    expect(doctors.rows[0]!.isDeleted).toBe(false);
  });
});

describe('reassign candidates', () => {
  it('lists only active doctors of the same specialization, excluding the source', async () => {
    const src = doctor({ name: 'Src', specialization: 'Cardiology' });
    doctor({ name: 'Same', specialization: 'Cardiology' });
    doctor({ name: 'Other', specialization: 'Neurology' });
    doctor({ name: 'Deleted', specialization: 'Cardiology', isDeleted: true });
    patient(String(src._id));

    const res = await api.get(`/doctors/${src._id}/reassign-candidates`);
    expect(res.status).toBe(200);
    expect(res.body.data.specialization).toBe('Cardiology');
    expect(res.body.data.patientCount).toBe(1);
    expect(res.body.data.candidates.map((c: { name: string }) => c.name)).toEqual(['Same']);
  });

  it('returns an empty list when no same-specialization doctor exists', async () => {
    const src = doctor();
    const res = await api.get(`/doctors/${src._id}/reassign-candidates`);
    expect(res.body.data.candidates).toEqual([]);
  });
});

describe('reassign-and-delete', () => {
  it('moves active patients to the target and soft-deletes the source', async () => {
    const src = doctor({ name: 'Src' });
    const dst = doctor({ name: 'Dst' });
    const p1 = patient(String(src._id));
    const p2 = patient(String(src._id));
    const deletedPatient = patient(String(src._id), { isDeleted: true });

    const res = await api.post(`/doctors/${src._id}/reassign-and-delete`, { targetDoctorId: String(dst._id) });
    expect(res.status).toBe(200);
    expect(res.body.data).toMatchObject({
      movedCount: 2,
      deletedDoctor: { name: 'Src' },
      targetDoctor: { name: 'Dst' },
    });
    expect(p1.doctorId).toBe(String(dst._id));
    expect(p2.doctorId).toBe(String(dst._id));
    expect(deletedPatient.doctorId).toBe(String(src._id)); // already deleted: untouched
    expect(src.isDeleted).toBe(true);
    expect(dst.isDeleted).toBe(false);
  });

  it('rejects a target with a different specialization and changes nothing', async () => {
    const src = doctor({ specialization: 'Cardiology' });
    const dst = doctor({ specialization: 'Neurology' });
    const p = patient(String(src._id));
    const res = await api.post(`/doctors/${src._id}/reassign-and-delete`, { targetDoctorId: String(dst._id) });
    expect(res.status).toBe(400);
    expect(p.doctorId).toBe(String(src._id));
    expect(src.isDeleted).toBe(false);
  });

  it('rejects the same doctor, a deleted target and an unknown target', async () => {
    const src = doctor();
    const deleted = doctor({ isDeleted: true });
    patient(String(src._id));
    const url = `/doctors/${src._id}/reassign-and-delete`;
    expect((await api.post(url, { targetDoctorId: String(src._id) })).status).toBe(400);
    expect((await api.post(url, { targetDoctorId: String(deleted._id) })).status).toBe(404);
    expect((await api.post(url, { targetDoctorId: 'c'.repeat(24) })).status).toBe(404);
    expect((await api.post(url, {})).status).toBe(400);
    expect(src.isDeleted).toBe(false);
  });

  it('is safe to retry: a second call after success is a 404, not a double move', async () => {
    const src = doctor();
    const dst = doctor();
    patient(String(src._id));
    const url = `/doctors/${src._id}/reassign-and-delete`;
    expect((await api.post(url, { targetDoctorId: String(dst._id) })).status).toBe(200);
    expect((await api.post(url, { targetDoctorId: String(dst._id) })).status).toBe(404);
  });
});

describe('patients under a doctor', () => {
  it('creates and lists patients for a doctor', async () => {
    const d = doctor();
    const body = { name: 'Jane Doe', age: '41', gender: 'female', phone: '+8801700000009', condition: 'Diabetes' };
    const created = await api.post(`/doctors/${d._id}/patients`, body);
    expect(created.status).toBe(201);
    expect(created.body.data).toMatchObject({ name: 'Jane Doe', age: 41, doctorId: String(d._id) });

    const list = await api.get(`/doctors/${d._id}/patients`);
    expect(list.body.data).toHaveLength(1);
    expect(list.body.meta.total).toBe(1);
  });

  it('refuses to add a patient to a deleted doctor and validates fields', async () => {
    const gone = doctor({ isDeleted: true });
    const ok = { name: 'Jane Doe', age: 41, gender: 'female', phone: '+8801700000009', condition: 'Diabetes' };
    expect((await api.post(`/doctors/${gone._id}/patients`, ok)).status).toBe(404);

    const d = doctor();
    const bad = await api.post(`/doctors/${d._id}/patients`, { ...ok, age: 200, gender: 'x', condition: 'Flu' });
    expect(bad.status).toBe(400);
  });

  it('soft-deletes a patient, which then no longer counts toward the doctor', async () => {
    const d = doctor();
    const p = patient(String(d._id));
    expect((await api.del(`/patients/${p._id}`)).status).toBe(204);
    expect((await api.del(`/patients/${p._id}`)).status).toBe(404);
    expect((await api.del(`/doctors/${d._id}`)).status).toBe(204); // no longer blocked
  });
});

describe('meta', () => {
  it('returns the fixed specialization list and distinct active hospitals', async () => {
    doctor({ hospital: 'B Hospital' });
    doctor({ hospital: 'A Hospital' });
    doctor({ hospital: 'Closed', isDeleted: true });
    const res = await api.get('/doctors/meta/specializations');
    expect(res.status).toBe(200);
    expect(res.body.data.hospitals).toEqual(['A Hospital', 'B Hospital']);
    expect(res.body.data.specializations).toContain('Cardiology');
  });
});
