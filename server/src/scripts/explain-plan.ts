/**
 * Reads the output of MongoDB's explain('executionStats') into a small, comparable summary.
 * Works for find() and aggregate() explains and for both query engines: the plan is found by
 * searching the document (aggregate nests it under stages[0].$cursor; the slot-based engine nests
 * the classic tree under `queryPlan`).
 */
export interface PlanSummary {
  /** Stage names of the winning plan in tree order, e.g. ['LIMIT', 'FETCH', 'IXSCAN']. */
  stages: string[];
  /** Index names used by IXSCAN stages. */
  indexes: string[];
  collscan: boolean;
  /** True when an in-memory SORT is part of the plan (the index did not provide the order). */
  inMemorySort: boolean;
  keysExamined: number | undefined;
  docsExamined: number | undefined;
  returned: number | undefined;
  millis: number | undefined;
}

type Obj = Record<string, unknown>;
const isObj = (v: unknown): v is Obj => typeof v === 'object' && v !== null;

/** Depth-first search for the first object that has `key`. */
function findKey(node: unknown, key: string): unknown {
  if (Array.isArray(node)) {
    for (const item of node) {
      const hit = findKey(item, key);
      if (hit !== undefined) return hit;
    }
    return undefined;
  }
  if (!isObj(node)) return undefined;
  if (key in node) return node[key];
  for (const value of Object.values(node)) {
    const hit = findKey(value, key);
    if (hit !== undefined) return hit;
  }
  return undefined;
}

function walkPlan(node: unknown, out: { stages: string[]; indexes: string[] }) {
  if (Array.isArray(node)) return node.forEach((n) => walkPlan(n, out));
  if (!isObj(node)) return;
  if (typeof node.stage === 'string') out.stages.push(node.stage);
  if (typeof node.indexName === 'string' && !out.indexes.includes(node.indexName)) out.indexes.push(node.indexName);
  for (const value of Object.values(node)) walkPlan(value, out); // strings (e.g. slot-based plan text) are ignored
}

export function summarizeExplain(explain: unknown): PlanSummary {
  const out = { stages: [] as string[], indexes: [] as string[] };
  walkPlan(findKey(explain, 'winningPlan'), out);
  const stats = findKey(explain, 'executionStats');
  const s = isObj(stats) ? stats : {};
  const num = (k: string) => (typeof s[k] === 'number' ? (s[k] as number) : undefined);

  return {
    stages: out.stages,
    indexes: out.indexes,
    collscan: out.stages.includes('COLLSCAN'),
    inMemorySort: out.stages.some((st) => st === 'SORT' || st === 'SORT_KEY_GENERATOR'),
    keysExamined: num('totalKeysExamined'),
    docsExamined: num('totalDocsExamined'),
    returned: num('nReturned'),
    millis: num('executionTimeMillis'),
  };
}
