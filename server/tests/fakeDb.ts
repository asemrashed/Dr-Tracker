/* eslint-disable @typescript-eslint/no-explicit-any -- the fake interprets loosely typed pipeline stages */
/**
 * Minimal in-memory stand-in for the Doctor and Patient Mongoose models (no MongoDB needed).
 * It only supports the operators the services actually use. It verifies business RULES and the
 * HTTP contract; real index/aggregation behavior is covered by scripts/smoke-doctors.ts.
 */
type Doc = Record<string, unknown> & { _id: string };

const matches = (doc: Doc, filter: Record<string, unknown>): boolean =>
  Object.entries(filter).every(([key, cond]) => {
    const value = doc[key];
    if (cond && typeof cond === 'object' && !(cond instanceof Date)) {
      const c = cond as Record<string, unknown>;
      if ('$ne' in c) return String(value) !== String(c.$ne);
      if ('$in' in c) return (c.$in as unknown[]).map(String).includes(String(value));
      if ('$regex' in c) return new RegExp(c.$regex as string).test(String(value));
      if ('$gte' in c || '$lte' in c || '$lt' in c) {
        const t = new Date(value as Date).getTime();
        return (
          (!c.$gte || t >= +(c.$gte as Date)) &&
          (!c.$lte || t <= +(c.$lte as Date)) &&
          (!c.$lt || t < +(c.$lt as Date))
        );
      }
    }
    return String(value) === String(cond);
  });

// Thenable query object: supports the chaining used by the services (sort/skip/limit/lean/session).
const query = <T>(run: () => T) => {
  let sorter: Record<string, 1 | -1> | undefined;
  let skipN = 0;
  let limitN = Infinity;
  const exec = () => {
    let out = run();
    if (Array.isArray(out)) {
      if (sorter) {
        const [k, dir] = Object.entries(sorter)[0] ?? ['_id', 1];
        const key = (v: unknown) => (v instanceof Date ? v.getTime() : String(v));
        out = [...out].sort((a, b) => (key(a[k]) < key(b[k]) ? -dir : key(a[k]) > key(b[k]) ? dir : 0)) as T;
      }
      out = (out as unknown[]).slice(skipN, skipN + limitN) as T;
    }
    return Promise.resolve(out);
  };
  const q = {
    sort: (s: Record<string, 1 | -1>) => ((sorter = s), q),
    skip: (n: number) => ((skipN = n), q),
    limit: (n: number) => ((limitN = n), q),
    lean: () => q,
    select: () => q,
    session: () => q,
    then: (res: (v: T) => unknown, rej?: (e: unknown) => unknown) => exec().then(res, rej),
  };
  return q;
};

let seq = 0;
export const newId = () => (++seq).toString(16).padStart(24, '0');

export function createCollection(name: string) {
  const rows: Doc[] = [];
  const live = (f: Record<string, unknown>) => rows.filter((r) => matches(r, f));
  const withDefaults = (d: Record<string, unknown>): Doc => ({
    isDeleted: false,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...d,
    _id: newId(),
    ...(typeof d.name === 'string' ? { nameLower: d.name.toLowerCase() } : {}),
  });
  // Mimics a Mongoose document closely enough for the services: toObject/set/save + the nameLower hook.
  const wrap = (r: Doc) => ({
    ...r,
    toObject: () => ({ ...r }),
    set(values: Record<string, unknown>) {
      Object.assign(r, values);
      Object.assign(this, values);
      if (typeof values.name === 'string') r.nameLower = values.name.toLowerCase();
    },
    save: async () => {
      r.updatedAt = new Date();
    },
  });

  return {
    name,
    rows,
    reset: () => void (rows.length = 0),
    insert: (d: Record<string, unknown>) => {
      const row = withDefaults(d);
      rows.push(row);
      return row;
    },
    model: {
      find: (f: Record<string, unknown>) => query(() => live(f)),
      findOne: (f: Record<string, unknown>) => query(() => {
        const hit = live(f)[0];
        return hit ? wrap(hit) : null;
      }),
      exists: async (f: Record<string, unknown>) => {
        const hit = live(f)[0];
        return hit ? { _id: hit._id } : null;
      },
      countDocuments: (f: Record<string, unknown>) => query(() => live(f).length),
      distinct: async (field: string, f: Record<string, unknown>) => [...new Set(live(f).map((r) => r[field]))],
      create: async (d: Record<string, unknown>) => {
        const row = withDefaults(d);
        rows.push(row);
        return wrap(row);
      },
      updateOne: async (f: Record<string, unknown>, u: { $set?: Record<string, unknown> }) => {
        const hit = live(f)[0];
        if (hit) Object.assign(hit, u.$set);
        return { matchedCount: hit ? 1 : 0, modifiedCount: hit ? 1 : 0 };
      },
      updateMany: async (f: Record<string, unknown>, u: { $set?: Record<string, unknown> }) => {
        const hits = live(f);
        hits.forEach((h) => Object.assign(h, u.$set));
        return { matchedCount: hits.length, modifiedCount: hits.length };
      },
      deleteOne: async (f: Record<string, unknown>) => {
        const hit = live(f)[0];
        if (hit) rows.splice(rows.indexOf(hit), 1);
      },
      /** Supports exactly the stages the services use: $match, $group ({$sum:1}), $sort, $limit. */
      aggregate: async (pipeline: Array<Record<string, any>>) => {
        let out: Doc[] = [...rows];
        for (const stage of pipeline) {
          if (stage.$match) out = out.filter((r) => matches(r, stage.$match));
          if (stage.$group) {
            const spec = stage.$group._id as string | { $dateToString: { date: string } };
            const keyOf = (r: Doc) =>
              typeof spec === 'string'
                ? String(r[spec.slice(1)])
                : new Date(r[spec.$dateToString.date.slice(1)] as Date).toISOString().slice(0, 10);
            const groups = new Map<string, number>();
            for (const r of out) groups.set(keyOf(r), (groups.get(keyOf(r)) ?? 0) + 1);
            out = [...groups].map(([_id, count]) => ({ _id, count })) as unknown as Doc[];
          }
          if (stage.$sort) {
            const keys = Object.entries(stage.$sort as Record<string, 1 | -1>);
            out = [...out].sort((a, b) => {
              for (const [k, dir] of keys) {
                const x = a[k] as number | string;
                const y = b[k] as number | string;
                if (x !== y) return (x < y ? -1 : 1) * dir;
              }
              return 0;
            });
          }
          if (stage.$limit) out = out.slice(0, stage.$limit as number);
        }
        return out;
      },
    },
  };
}
