import { describe, expect, it } from 'vitest';
import { summarizeExplain } from '../src/scripts/explain-plan';

const stats = { nReturned: 10, totalKeysExamined: 12, totalDocsExamined: 10, executionTimeMillis: 3 };

describe('summarizeExplain', () => {
  it('reads an index scan from a classic find() explain', () => {
    const s = summarizeExplain({
      queryPlanner: { winningPlan: { stage: 'LIMIT', inputStage: { stage: 'FETCH', inputStage: { stage: 'IXSCAN', indexName: 'isDeleted_1_createdAt_-1' } } } },
      executionStats: stats,
    });
    expect(s).toMatchObject({ stages: ['LIMIT', 'FETCH', 'IXSCAN'], indexes: ['isDeleted_1_createdAt_-1'], collscan: false, inMemorySort: false, keysExamined: 12, docsExamined: 10, returned: 10, millis: 3 });
  });

  it('flags a collection scan and an in-memory sort', () => {
    const s = summarizeExplain({
      queryPlanner: { winningPlan: { stage: 'SORT', inputStage: { stage: 'COLLSCAN' } } },
      executionStats: stats,
    });
    expect(s.collscan).toBe(true);
    expect(s.inMemorySort).toBe(true);
    expect(s.indexes).toEqual([]);
  });

  it('finds the plan inside an aggregate explain ($cursor stage)', () => {
    const s = summarizeExplain({
      stages: [
        { $cursor: { queryPlanner: { winningPlan: { stage: 'PROJECTION_COVERED', inputStage: { stage: 'IXSCAN', indexName: 'isDeleted_1_doctorId_1_createdAt_-1' } } }, executionStats: stats } },
        { $group: { _id: '$doctorId' } },
      ],
    });
    expect(s.stages).toEqual(['PROJECTION_COVERED', 'IXSCAN']);
    expect(s.indexes).toEqual(['isDeleted_1_doctorId_1_createdAt_-1']);
    expect(s.returned).toBe(10);
  });

  it('handles the slot-based engine shape (classic tree under queryPlan, plan text ignored)', () => {
    const s = summarizeExplain({
      queryPlanner: {
        winningPlan: {
          queryPlan: { stage: 'GROUP', inputStage: { stage: 'IXSCAN', indexName: 'isDeleted_1_condition_1_createdAt_-1' } },
          slotBasedPlan: { slots: '$$RESULT=s1', stages: '[2] group [] [...]' },
        },
      },
      executionStats: stats,
    });
    expect(s.stages).toEqual(['GROUP', 'IXSCAN']);
    expect(s.indexes).toEqual(['isDeleted_1_condition_1_createdAt_-1']);
  });

  it('lists each index once and tolerates garbage input', () => {
    const s = summarizeExplain({ queryPlanner: { winningPlan: { stage: 'OR', inputStages: [{ stage: 'IXSCAN', indexName: 'a' }, { stage: 'IXSCAN', indexName: 'a' }] } } });
    expect(s.indexes).toEqual(['a']);
    for (const junk of [null, undefined, 42, 'x', [], {}]) {
      expect(summarizeExplain(junk)).toMatchObject({ stages: [], indexes: [], collscan: false, returned: undefined });
    }
  });
});
