/**
 * Integration smoke test against a REAL MongoDB (uses MONGODB_URI from server/.env).
 * Verifies what the unit tests' in-memory fakes cannot: index creation, the partial unique email
 * index, the reassign-and-delete flow (in a transaction when supported) and query plans.
 * Everything it creates is tagged with a marker hospital and removed at the end.
 *
 * Usage: npm run smoke -w server
 */
import assert from 'node:assert/strict';
import mongoose from 'mongoose';
import { connectDb, disconnectDb } from '../config/db';
import { Doctor } from '../modules/doctors/doctor.model';
import * as dashboard from '../modules/dashboard/dashboard.service';
import * as doctors from '../modules/doctors/doctor.service';
import { Patient } from '../modules/patients/patient.model';
import * as patients from '../modules/patients/patient.service';
import { AppError } from '../shared/AppError';

const MARK = 'SMOKE-TEST-HOSPITAL';
const tag = Date.now().toString(36);
const step = (msg: string) => console.log(`  ok  ${msg}`);

const doc = (name: string, specialization: 'Cardiology' | 'Neurology', email = `${name}.${tag}@smoke.test`) => ({
  name: `Dr. ${name}`,
  specialization,
  hospital: MARK,
  phone: '+8801700000000',
  email,
});
const pat = (n: number) => ({ name: `Smoke Patient ${n}`, age: 30 + n, gender: 'female' as const, phone: '+8801700000001', condition: 'Asthma' as const });

async function expectAppError(fn: () => Promise<unknown>, code: string) {
  try {
    await fn();
  } catch (err) {
    assert.ok(err instanceof AppError, `expected AppError ${code}, got ${String(err)}`);
    assert.equal(err.code, code);
    return;
  }
  assert.fail(`expected ${code} but the call succeeded`);
}

async function cleanup() {
  const ids = (await Doctor.find({ hospital: MARK }).select('_id').lean()).map((d) => d._id);
  await Patient.deleteMany({ doctorId: { $in: ids } });
  await Doctor.deleteMany({ hospital: MARK });
}

async function main() {
  await connectDb();
  const hello = await mongoose.connection.db!.admin().command({ hello: 1 });
  console.log(`Connected. Topology: ${hello.setName ? `replica set "${hello.setName}" (transactions ON)` : 'standalone (transactions OFF, idempotent-order fallback)'}`);

  await cleanup(); // leftovers from an aborted earlier run

  console.log('\nIndexes');
  await Promise.all([Doctor.init(), Patient.init()]);
  const docIdx = await Doctor.collection.indexes();
  const patIdx = await Patient.collection.indexes();
  const emailIdx = docIdx.find((i) => i.key.email === 1);
  assert.ok(emailIdx?.unique, 'doctor email index should be unique');
  assert.deepEqual(emailIdx?.partialFilterExpression, { isDeleted: false });
  step(`doctors: ${docIdx.length} indexes incl. partial unique email`);
  assert.ok(patIdx.some((i) => i.key.doctorId === 1 && i.key.isDeleted === 1), 'patient doctorId index missing');
  step(`patients: ${patIdx.length} indexes incl. { isDeleted, doctorId, createdAt }`);

  console.log('\nDoctor rules');
  const a = await doctors.create(doc('Alpha', 'Cardiology'));
  const b = await doctors.create(doc('Bravo', 'Cardiology'));
  const c = await doctors.create(doc('Charlie', 'Neurology'));
  await expectAppError(() => doctors.create(doc('Alpha2', 'Cardiology', a.email)), 'EMAIL_TAKEN');
  step('duplicate active email rejected (EMAIL_TAKEN)');
  const rawDup = Doctor.create({ ...doc('Alpha3', 'Cardiology', a.email), nameLower: 'dr. alpha3' });
  await assert.rejects(rawDup, (e: { code?: number }) => e.code === 11000);
  step('unique partial index enforced by MongoDB itself (E11000)');

  for (let i = 1; i <= 3; i++) await patients.createForDoctor(a.id, pat(i));
  const listed = await doctors.list({ page: 1, limit: 10, sort: 'name', order: 'asc', search: 'dr. al' });
  assert.equal(listed.items.find((d) => d.id === a.id)?.patientCount, 3);
  step('list: prefix search + patientCount aggregate');

  await expectAppError(() => doctors.remove(a.id), 'DOCTOR_HAS_PATIENTS');
  step('delete blocked while patients exist');

  const cands = await doctors.reassignCandidates(a.id);
  assert.deepEqual(cands.candidates.map((x) => x.id), [b.id]);
  step('reassign candidates: same specialization only');

  await assert.rejects(doctors.reassignAndDelete(a.id, c.id), (e: AppError) => e.status === 400);
  step('different specialization rejected');

  const res = await doctors.reassignAndDelete(a.id, b.id);
  assert.equal(res.movedCount, 3);
  assert.equal((await doctors.getById(b.id)).patientCount, 3);
  await expectAppError(() => doctors.getById(a.id), 'NOT_FOUND');
  step('reassign-and-delete moved 3 patients and soft-deleted the source');

  await doctors.create(doc('Alpha-again', 'Cardiology', a.email));
  step('email reusable after the owner was soft-deleted (partial index)');

  console.log('\nPatients (Phase 3)');
  const plist = await patients.list({ page: 1, limit: 10, sort: 'name', order: 'asc', doctorId: b.id, condition: 'Asthma' });
  assert.equal(plist.meta.total, 3);
  assert.equal(plist.items[0]?.doctor?.id, b.id);
  step('list: doctorId + condition filters, doctor name attached');
  const first = plist.items[0]!;
  const edited = await patients.update(first.id, { name: 'Smoke Renamed', age: 77 });
  assert.equal(edited.name, 'Smoke Renamed');
  const byPrefix = await patients.list({ page: 1, limit: 10, sort: 'createdAt', order: 'desc', search: 'smoke renamed' });
  assert.equal(byPrefix.meta.total, 1);
  step('update keeps nameLower in sync (prefix search finds the new name)');
  const moved = await patients.update(first.id, { doctorId: c.id });
  assert.equal(moved.doctor?.id, c.id);
  step('patient reassigned to another doctor');

  console.log('\nDashboard (Phase 4)');
  for (const days of [7, 30, 90]) {
    const d = await dashboard.stats(days);
    assert.equal(d.series.length, days, `series has one entry per day (${days})`);
    assert.equal(d.series.reduce((n, x) => n + x.count, 0), d.totals.patientsAdded, 'series adds up to patientsAdded');
    assert.equal(d.conditions.reduce((n, x) => n + x.count, 0), d.totals.patients, 'conditions add up to total patients');
    assert.equal(d.patientsPerDoctor.reduce((n, x) => n + x.count, 0) + d.othersCount, d.totals.patients, 'per-doctor + others add up');
  }
  const dash = await dashboard.stats(7);
  assert.ok(dash.totals.patients >= 3 && dash.totals.doctors >= 3, 'smoke data is counted');
  assert.equal(dash.series.at(-1)?.date, new Date().toISOString().slice(0, 10), 'last day is today (UTC)');
  step('stats(7/30/90): zero-filled series and all breakdowns reconcile with totals');

  console.log('\nQuery plans (explain)');
  const plan = async (label: string, filter: object, sort?: object) => {
    const q = Doctor.find(filter);
    if (sort) q.sort(sort as never);
    const ex = (await q.explain('executionStats')) as unknown as {
      executionStats: { totalDocsExamined: number; nReturned: number };
      queryPlanner: { winningPlan: object };
    };
    const winning = JSON.stringify(ex.queryPlanner.winningPlan);
    console.log(`  ${label}: ${/IXSCAN/.test(winning) ? 'IXSCAN' : 'COLLSCAN'}  examined=${ex.executionStats.totalDocsExamined} returned=${ex.executionStats.nReturned}`);
  };
  await plan('name prefix', { isDeleted: false, nameLower: { $regex: '^dr. a' } });
  await plan('specialization + date sort', { isDeleted: false, specialization: 'Cardiology' }, { createdAt: -1 });

  const pplan = async (label: string, filter: object, sort: object) => {
    const ex = (await Patient.find(filter).sort(sort as never).explain('executionStats')) as unknown as {
      executionStats: { totalDocsExamined: number; nReturned: number };
      queryPlanner: { winningPlan: object };
    };
    const winning = JSON.stringify(ex.queryPlanner.winningPlan);
    console.log(`  ${label}: ${/IXSCAN/.test(winning) ? 'IXSCAN' : 'COLLSCAN'}  examined=${ex.executionStats.totalDocsExamined} returned=${ex.executionStats.nReturned}`);
  };
  await pplan('patients by doctor', { isDeleted: false, doctorId: new mongoose.Types.ObjectId(b.id) }, { createdAt: -1 });
  await pplan('patients name prefix', { isDeleted: false, nameLower: { $regex: '^smoke' } }, { nameLower: 1 });
  await pplan('dashboard per-day range', { isDeleted: false, createdAt: { $gte: new Date(Date.now() - 30 * 864e5) } }, { createdAt: 1 });
  await pplan('patients condition + date', { isDeleted: false, condition: 'Asthma' }, { createdAt: -1 });

  await cleanup();
  console.log('\nAll smoke checks passed. Test data removed.');
}

main()
  .catch(async (err) => {
    console.error('\nSMOKE TEST FAILED:', err);
    await cleanup().catch(() => undefined);
    process.exitCode = 1;
  })
  .finally(disconnectDb);
