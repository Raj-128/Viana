import test from 'node:test';
import assert from 'node:assert/strict';
import { summarizeRequests } from '../src/js/admin-request-summary.js';

test('summary cards and filters count both request types and exclude completed orders from approvals', () => {
  const legacy = [{ status: 'pending' }, { status: 'approved' }, { status: 'rejected' }];
  const print = [{ status: 'pending' }, { status: 'approved' }, { status: 'received' }, { status: 'revoked' }];
  assert.deepEqual(summarizeRequests(legacy, print), { pending: 2, approved: 2, all: 7 });
  print[0].status = 'approved';
  assert.deepEqual(summarizeRequests(legacy, print), { pending: 1, approved: 3, all: 7 });
  assert.deepEqual(summarizeRequests(), { pending: 0, approved: 0, all: 0 });
});
