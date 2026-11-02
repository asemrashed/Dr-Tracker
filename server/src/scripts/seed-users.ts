/**
 * Seeds the demo accounts. Safe to run repeatedly (upsert by email).
 *
 *   admin@gmail.com   / <SEED_PASSWORD>  role: admin    (can sign in)
 *   dr@gmail.com      / <SEED_PASSWORD>  role: doctor   (sign-in disabled for now)
 *   patient@gmail.com / <SEED_PASSWORD>  role: patient  (sign-in disabled for now)
 *
 * Usage: npm run seed
 */
import { connectDb, disconnectDb } from '../config/db';
import { env } from '../config/env';
import { hashPassword } from '../modules/auth/auth.service';
import { User } from '../modules/auth/user.model';
import type { UserRole } from '../shared/constants';

const ACCOUNTS: { email: string; role: UserRole }[] = [
  { email: 'admin@gmail.com', role: 'admin' },
  { email: 'dr@gmail.com', role: 'doctor' },
  { email: 'patient@gmail.com', role: 'patient' },
];

export async function seedUsers() {
  const passwordHash = await hashPassword(env.SEED_PASSWORD);
  for (const { email, role } of ACCOUNTS) {
    await User.updateOne({ email }, { $set: { role, passwordHash } }, { upsert: true });
    console.log(`Seeded ${role.padEnd(7)} ${email}`);
  }
}

async function main() {
  await connectDb();
  await seedUsers();
  await disconnectDb();
}

if (require.main === module) {
  main().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
