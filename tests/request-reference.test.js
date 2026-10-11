import test from 'node:test';
import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import { createRequestReferences } from '../server/request-reference.js';
import { planWhatsAppUrl } from '../src/js/plan-whatsapp.js';
import { downloadPlans } from '../src/js/download-plans.js';

test('readable references remain unique and stable across names, retries and restarts', () => {
  const db = new DatabaseSync(':memory:');
  try {
    db.exec("CREATE TABLE users(id TEXT PRIMARY KEY,name TEXT,email TEXT); INSERT INTO users VALUES ('a','Raj Patel','raj@example.com'),('b','Raj Patel','other@example.com');");
    const reference = createRequestReferences(db);
    const request = { id: 'existing-uuid', user_id: 'a' };
    assert.equal(reference('print', request), 'raj-patel-000001');
    assert.equal(reference('print', request), 'raj-patel-000001');
    assert.equal(reference('print', { id: 'another-uuid', user_id: 'b' }), 'raj-patel-000002');
    assert.equal(reference('plan', request), 'raj-patel-000003');
    db.prepare('UPDATE users SET name=? WHERE id=?').run('New name', 'a');
    assert.equal(createRequestReferences(db)('print', request), 'raj-patel-000001');
    assert.equal(reference('print', { id: 'new-request', user_id: 'a' }), 'new-name-000004');
    const text = new URL(planWhatsAppUrl({ id: 'internal-uuid', reference: 'raj-patel-000003', plan: downloadPlans[0] }, 'raj@example.com')).searchParams.get('text');
    assert.match(text, /Request ID: raj-patel-000003/);
    assert.doesNotMatch(text, /internal-uuid/);
  } finally { db.close(); }
});
