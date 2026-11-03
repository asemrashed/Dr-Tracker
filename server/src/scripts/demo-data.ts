/**
 * Deterministic demo-data generator (pure: no database, no clock except the `now` argument).
 * Same seed + same `now` => identical output, so the demo looks the same on every machine and
 * the generator can be unit-tested.
 *
 * Shape of the data (chosen so every feature has something to show):
 *  - 30 doctors over all 15 specializations; Oncology and Ophthalmology have exactly ONE doctor,
 *    so "delete that doctor" demonstrates the "no other doctor available" path, the rest have 2-3.
 *  - Patients per doctor are skewed (a few busy doctors, a long tail), every doctor has >= 3.
 *  - Patients are spread over the last 90 days with an upward trend and quieter weekends.
 *  - Conditions and ages follow the doctor's specialization (with some noise).
 *  - A patient is never created before its doctor.
 */
import {
  CONDITIONS,
  GENDERS,
  SPECIALIZATIONS,
  type Condition,
  type Gender,
  type Specialization,
} from '../shared/constants';

export const DEMO_EMAIL_DOMAIN = 'demo.doctortracker.test';

const DAY = 86_400_000;

/** Doctors per specialization (sums to 30). Single-doctor specializations drive the no-candidate demo. */
const DOCTORS_PER_SPECIALIZATION: Record<Specialization, number> = {
  Cardiology: 3,
  'General Medicine': 3,
  Pediatrics: 2,
  Neurology: 2,
  Orthopedics: 2,
  Dermatology: 2,
  Gynecology: 2,
  Psychiatry: 2,
  Endocrinology: 2,
  Gastroenterology: 2,
  ENT: 2,
  Radiology: 2,
  Urology: 2,
  Oncology: 1,
  Ophthalmology: 1,
};

/** What each specialization mostly treats (first entries are most likely). */
const CONDITION_MIX: Record<Specialization, Condition[]> = {
  Cardiology: ['Hypertension', 'Heart disease', 'Hypertension', 'Diabetes', 'Anxiety'],
  'General Medicine': ['Infection', 'Hypertension', 'Diabetes', 'Allergy', 'Back pain', 'Asthma', 'Other'],
  Pediatrics: ['Asthma', 'Infection', 'Allergy', 'Infection', 'Other'],
  Neurology: ['Migraine', 'Migraine', 'Anxiety', 'Back pain', 'Other'],
  Orthopedics: ['Back pain', 'Arthritis', 'Back pain', 'Arthritis', 'Infection'],
  Dermatology: ['Allergy', 'Allergy', 'Infection', 'Anxiety'],
  Gynecology: ['Infection', 'Other', 'Anxiety', 'Hypertension'],
  Psychiatry: ['Anxiety', 'Anxiety', 'Migraine', 'Other'],
  Endocrinology: ['Diabetes', 'Diabetes', 'Hypertension', 'Heart disease'],
  Gastroenterology: ['Infection', 'Allergy', 'Diabetes', 'Anxiety'],
  ENT: ['Infection', 'Allergy', 'Asthma', 'Other'],
  Radiology: ['Back pain', 'Arthritis', 'Heart disease', 'Migraine'],
  Urology: ['Infection', 'Diabetes', 'Hypertension', 'Back pain'],
  Oncology: ['Other', 'Heart disease', 'Diabetes', 'Anxiety'],
  Ophthalmology: ['Diabetes', 'Allergy', 'Other', 'Hypertension'],
};

const HOSPITALS = [
  'City General Hospital',
  'Evercare Medical Center',
  'Labaid Specialized',
  'Square Hospital',
  'Popular Diagnostic',
  'United Hospital',
];

const FIRST_NAMES = [
  'Amina', 'Bilal', 'Carla', 'Daniel', 'Elena', 'Farid', 'Grace', 'Hugo', 'Ingrid', 'Jamal',
  'Kavita', 'Liam', 'Maya', 'Nadia', 'Omar', 'Priya', 'Qasim', 'Rina', 'Samir', 'Tania',
  'Umar', 'Vera', 'Wasim', 'Yasmin', 'Zara', 'Arif', 'Beatriz', 'Chen', 'Dina', 'Imran',
];
const LAST_NAMES = [
  'Rahman', 'Chowdhury', 'Mendes', 'Okafor', 'Petrova', 'Hasan', 'Liu', 'Martin', 'Larsen', 'Sheikh',
  'Rao', 'Walsh', 'Das', 'Karim', 'Faruk', 'Nair', 'Ali', 'Akter', 'Khan', 'Roy',
  'Costa', 'Raja', 'Park', 'Ahmed', 'Hossain', 'Islam', 'Sultana', 'Mirza', 'Bose', 'Siddique',
];

/** Small seedable PRNG (mulberry32): deterministic, no dependencies. */
function rng(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export interface DemoDoctor {
  key: number;
  name: string;
  nameLower: string;
  specialization: Specialization;
  hospital: string;
  phone: string;
  email: string;
  createdAt: Date;
}

export interface DemoPatient {
  name: string;
  nameLower: string;
  age: number;
  gender: Gender;
  phone: string;
  condition: Condition;
  /** Index into `doctors` (the seed script maps it to the real _id). */
  doctorKey: number;
  createdAt: Date;
}

export function buildDemoData(opts: { patients?: number; seed?: number; now?: Date } = {}) {
  const { patients: patientCount = 600, seed = 7, now = new Date() } = opts;
  const rand = rng(seed);
  const pick = <T>(list: readonly T[]) => list[Math.floor(rand() * list.length)]!;
  const shuffle = <T>(list: T[]) => {
    for (let i = list.length - 1; i > 0; i--) {
      const j = Math.floor(rand() * (i + 1));
      [list[i], list[j]] = [list[j]!, list[i]!];
    }
    return list;
  };
  const phone = () => `+88017${String(Math.floor(rand() * 1e8)).padStart(8, '0')}`;

  // ---- doctors
  const specs = SPECIALIZATIONS.flatMap((s) => Array<Specialization>(DOCTORS_PER_SPECIALIZATION[s]).fill(s));
  const pairs = shuffle(FIRST_NAMES.flatMap((f) => LAST_NAMES.map((l) => [f, l] as const)));
  const doctors: DemoDoctor[] = shuffle([...specs]).map((specialization, key) => {
    const [first, last] = pairs[key]!;
    const name = `Dr. ${first} ${last}`;
    // ~1 in 5 doctors joined in the last 30 days (so "doctors added" has a story), the rest 40-150 days ago.
    const ageDays = key % 5 === 0 ? 2 + Math.floor(rand() * 27) : 40 + Math.floor(rand() * 110);
    return {
      key,
      name,
      nameLower: name.toLowerCase(),
      specialization,
      hospital: pick(HOSPITALS),
      phone: phone(),
      email: `dr.${first.toLowerCase()}.${last.toLowerCase()}@${DEMO_EMAIL_DOMAIN}`,
      createdAt: new Date(now.getTime() - ageDays * DAY - Math.floor(rand() * DAY)),
    };
  });

  // ---- how many patients each doctor gets: floor of 3, the rest skewed towards a few busy doctors
  const FLOOR = 3;
  const counts = new Array<number>(doctors.length).fill(FLOOR);
  const weights = shuffle(doctors.map((_, i) => 1 / (i + 1) ** 0.85));
  const totalWeight = weights.reduce((a, b) => a + b, 0);
  const extra = Math.max(0, patientCount - FLOOR * doctors.length);
  let assigned = 0;
  weights.forEach((w, i) => {
    const n = Math.floor((w / totalWeight) * extra);
    counts[i]! += n;
    assigned += n;
  });
  for (let i = 0; assigned < extra; i = (i + 1) % doctors.length) {
    counts[i]! += 1; // distribute the rounding remainder
    assigned += 1;
  }

  // ---- patients
  const patients: DemoPatient[] = [];
  doctors.forEach((doc, i) => {
    const doctorAge = Math.floor((now.getTime() - doc.createdAt.getTime()) / DAY);
    const window = Math.max(1, Math.min(90, doctorAge)); // days back a patient may have been created
    for (let n = 0; n < counts[i]!; n++) {
      // Day offset: recent days are likelier (growth) and weekends are quieter.
      let offset = 0;
      for (let tries = 0; tries < 20; tries++) {
        offset = Math.floor(rand() * window);
        const day = new Date(now.getTime() - offset * DAY).getUTCDay();
        const weight = (1 + 0.8 * (1 - offset / 90)) * (day === 5 || day === 6 ? 0.45 : 1);
        if (rand() < weight / 1.8) break;
      }
      const hour = 8 + Math.floor(rand() * 10);
      let createdAt = new Date(
        Date.UTC(
          new Date(now.getTime() - offset * DAY).getUTCFullYear(),
          new Date(now.getTime() - offset * DAY).getUTCMonth(),
          new Date(now.getTime() - offset * DAY).getUTCDate(),
          hour,
          Math.floor(rand() * 60),
        ),
      );
      if (createdAt > now) createdAt = new Date(now.getTime() - Math.floor(rand() * 3_600_000));
      if (createdAt < doc.createdAt) createdAt = new Date(doc.createdAt.getTime() + Math.floor(rand() * 3_600_000));

      const name = `${pick(FIRST_NAMES)} ${pick(LAST_NAMES)}`;
      const condition = rand() < 0.12 ? pick(CONDITIONS) : pick(CONDITION_MIX[doc.specialization]);
      const age =
        doc.specialization === 'Pediatrics'
          ? 1 + Math.floor(rand() * 15)
          : Math.min(95, Math.max(18, Math.round(48 + (rand() + rand() + rand() - 1.5) * 38)));
      patients.push({
        name,
        nameLower: name.toLowerCase(),
        age,
        gender: rand() < 0.03 ? 'other' : pick(GENDERS.slice(0, 2)),
        phone: phone(),
        condition,
        doctorKey: doc.key,
        createdAt,
      });
    }
  });

  return { doctors, patients };
}
