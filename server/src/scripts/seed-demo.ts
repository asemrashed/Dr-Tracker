/**
 * Seeds realistic demo doctors and patients so the dashboard and filters have something to show.
 *
 *   npm run seed:demo                      30 doctors, 600 patients
 *   npm run seed:demo -- --patients=20000  more data, e.g. to look at index behavior (npm run explain)
 *
 * Idempotent: demo doctors are recognisable by their e-mail domain (@demo.doctortracker.test).
 * Every run first removes those doctors and the patients assigned to them, then inserts a fresh set,
 * so doctors/patients you created by hand with other e-mails are never touched.
 * (Patients you added to a demo doctor are removed with it.)
 */
import { Types } from 'mongoose';
import { connectDb, disconnectDb } from '../config/db';
import { isProduction } from '../config/env';
import { Doctor } from '../modules/doctors/doctor.model';
import { Patient } from '../modules/patients/patient.model';
import { buildDemoData, DEMO_EMAIL_DOMAIN } from './demo-data';

const arg = (name: string) => process.argv.find((a) => a.startsWith(`--${name}=`))?.split('=')[1];

export async function seedDemo(patientCount: number) {
  const now = new Date();
  const { doctors, patients } = buildDemoData({ patients: patientCount, now });

  const emailPattern = new RegExp(`@${DEMO_EMAIL_DOMAIN.replace(/\./g, '\\.')}$`);
  const old = await Doctor.find({ email: emailPattern }).select('_id').lean();
  const oldIds = old.map((d) => d._id);
  const removedPatients = await Patient.deleteMany({ doctorId: { $in: oldIds } });
  await Doctor.deleteMany({ _id: { $in: oldIds } });

  // Raw inserts keep the exact createdAt/updatedAt values (Mongoose would overwrite updatedAt).
  const idByKey = new Map(doctors.map((d) => [d.key, new Types.ObjectId()]));
  await Doctor.collection.insertMany(
    doctors.map(({ key, ...d }) => ({
      _id: idByKey.get(key)!,
      ...d,
      isDeleted: false,
      updatedAt: d.createdAt,
      __v: 0,
    })),
  );
  const BATCH = 5_000;
  for (let i = 0; i < patients.length; i += BATCH) {
    await Patient.collection.insertMany(
      patients.slice(i, i + BATCH).map(({ doctorKey, ...p }) => ({
        _id: new Types.ObjectId(),
        ...p,
        doctorId: idByKey.get(doctorKey)!,
        isDeleted: false,
        updatedAt: p.createdAt,
        __v: 0,
      })),
    );
  }
  return { removedDoctors: old.length, removedPatients: removedPatients.deletedCount, doctors: doctors.length, patients: patients.length };
}

async function main() {
  if (isProduction && !process.argv.includes('--force')) {
    throw new Error('Refusing to seed demo data with NODE_ENV=production. Pass --force if you really mean it.');
  }
  const patientCount = Number(arg('patients') ?? 600);
  if (!Number.isInteger(patientCount) || patientCount < 90 || patientCount > 200_000) {
    throw new Error('--patients must be a whole number between 90 and 200000');
  }
  await connectDb();
  const r = await seedDemo(patientCount);
  console.log(`Removed previous demo data: ${r.removedDoctors} doctors, ${r.removedPatients} patients`);
  console.log(`Seeded demo data:           ${r.doctors} doctors, ${r.patients} patients`);
  await disconnectDb();
}

if (require.main === module) {
  main().catch(async (err) => {
    console.error(err instanceof Error ? err.message : err);
    await disconnectDb().catch(() => undefined);
    process.exit(1);
  });
}
