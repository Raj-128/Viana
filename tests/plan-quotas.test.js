import test from 'node:test';
import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import { createPlanOrders } from '../server/plan-orders.js';
import { downloadPlans, downloadFormats } from '../src/js/download-plans.js';

function fixture(t, index = 0) {
  const db = new DatabaseSync(':memory:');
  t.after(() => db.close());
  db.exec("CREATE TABLE users (id TEXT PRIMARY KEY, email TEXT); INSERT INTO users VALUES ('customer','customer@example.com'),('admin','admin@example.com');");
  const api = createPlanOrders({ db, sessionUser: req => req.user, readBody: async req => req.body,
    json: (res, status, body) => Object.assign(res, { status, body }),
    fail: (status, message) => Object.assign(new Error(message), { status }), limit() {} });
  const plan = downloadPlans[index];
  db.prepare("INSERT INTO plan_orders (id,user_id,plan_json,status,created_at,approved_at,expires_at) VALUES ('a','customer',?,'approved',?,?,?)")
    .run(JSON.stringify(plan), Date.now(), Date.now(), Date.now() + plan.days * 86400000);
  const user = { id: 'customer', role: 'customer' };
  const download = (format = 'max') => {
    db.prepare('INSERT OR IGNORE INTO model_tiers VALUES (?,0)').run(format);
    return api.consumeDownload(user, format, `model.${format}`);
  };
  const day = new Date(Date.now() + 330 * 60000).toISOString().slice(0, 10);
  return { db, api, user, download, day };
}

test('every account including admin needs an active approved plan to download models', t => {
  const { db, api } = fixture(t);
  const admin = { id: 'admin', role: 'admin' };
  for (const status of ['missing', 'pending', 'revoked', 'expired']) {
    db.exec("DELETE FROM plan_orders WHERE user_id='admin'");
    if (status !== 'missing') db.prepare('INSERT INTO plan_orders (id,user_id,plan_json,status,created_at,expires_at) VALUES (?,?,?,?,?,?)')
      .run('admin-plan', 'admin', JSON.stringify(downloadPlans[0]), status === 'expired' ? 'approved' : status, Date.now(), status === 'expired' ? Date.now() - 1 : Date.now() + 86400000);
    assert.throws(() => api.consumeDownload(admin, 'aerial-texture-12', 'aerial-texture-12.rar'), { status: 403, code: 'PLAN_REQUIRED' });
    assert.equal(db.prepare("SELECT count(*) AS n FROM model_format_usage WHERE user_id='admin'").get().n, 0);
  }
  db.prepare("UPDATE plan_orders SET status='approved', expires_at=? WHERE id='admin-plan'").run(Date.now() + 86400000);
  assert.equal(api.consumeDownload(admin, 'aerial-texture-12', 'aerial-texture-12.rar'), true);
  assert.equal(db.prepare("SELECT count FROM model_format_usage WHERE user_id='admin' AND format='materials'").get().count, 1);
});

test('each plan enforces every format quota, including independent FBX and OBJ', t => {
  for (let index = 0; index < 5; index++) {
    const { db, download } = fixture(t, index);
    for (const format of downloadFormats) {
      const quota = format.basicLimit + index * 3;
      assert.equal(downloadPlans[index].formatLimits[format.id], quota);
      // Isolate each format so the separate overall daily cap does not mask it.
      db.exec('DELETE FROM model_download_usage; DELETE FROM plan_download_usage;');
      for (let i = 0; i < quota; i++) assert.equal(download(format.extensions[0]), true);
      assert.throws(() => download(format.extensions[0]), { status: 429 });
    }
  }
});

test('Basic allows the 100th file and rejects the 101st atomically', t => {
  const { db, download, day } = fixture(t);
  db.exec("INSERT INTO plan_download_usage VALUES ('a',99)");
  download('max');
  assert.throws(() => download('fbx'), { status: 429 });
  assert.equal(db.prepare('SELECT count FROM plan_download_usage').get().count, 100);
  assert.equal(db.prepare('SELECT count FROM model_download_usage WHERE day=?').get(day).count, 1);
  assert.equal(db.prepare("SELECT count FROM model_format_usage WHERE format='fbx'").get(), undefined);
});

test('daily counters reset at India midnight without resetting the plan total', t => {
  const { db, download } = fixture(t);
  const originalNow = Date.now;
  t.after(() => { Date.now = originalNow; });
  const beforeMidnight = Date.parse('2026-10-10T18:29:59Z');
  db.prepare('UPDATE plan_orders SET expires_at=?').run(beforeMidnight + 30 * 86400000);
  Date.now = () => beforeMidnight;
  download('uasset');
  assert.throws(() => download('uproject'), { status: 429 });
  Date.now = () => beforeMidnight + 1000;
  download('uproject');
  assert.equal(db.prepare('SELECT count FROM plan_download_usage').get().count, 2);
  assert.equal(db.prepare('SELECT COUNT(*) AS days FROM model_download_usage').get().days, 2);
});

test('archive uses all trusted formats and rolls back if any format is exhausted', t => {
  const { db, api, user, day } = fixture(t);
  db.prepare("INSERT INTO model_format_usage VALUES ('customer',?,'obj',4)").run(day);
  assert.throws(() => api.consumeDownload(user, 'bathroom-accessories-1', 'model.rar'), { status: 429 });
  assert.equal(db.prepare('SELECT COUNT(*) AS n FROM model_format_usage').get().n, 1);
  db.exec('DELETE FROM model_format_usage');
  api.consumeDownload(user, 'bathroom-accessories-1', 'model.rar');
  assert.equal(db.prepare('SELECT COUNT(*) AS n FROM model_format_usage WHERE count=1').get().n, 3);
  assert.equal(db.prepare('SELECT count FROM plan_download_usage').get().count, 1);
  db.exec("INSERT INTO model_tiers VALUES ('unknown-archive',0)");
  assert.throws(() => api.consumeDownload(user, 'unknown-archive', 'unknown.zip'), { status: 403 });
});

test('higher-plan overall daily cap still applies and rolls back format usage', t => {
  const { db, download, day } = fixture(t, 1);
  db.prepare("INSERT INTO model_download_usage VALUES ('customer',?,50)").run(day);
  assert.throws(() => download(), { status: 429 });
  assert.equal(db.prepare('SELECT COUNT(*) AS n FROM model_format_usage').get().n, 0);
  assert.equal(db.prepare('SELECT COUNT(*) AS n FROM plan_download_usage').get().n, 0);
});

test('pending requests receive current quotas at approval and report total usage', async t => {
  const { db, api, user } = fixture(t);
  db.prepare("UPDATE plan_orders SET status='pending',plan_json=?").run(JSON.stringify({ ...downloadPlans[0], totalLimit: undefined, formatLimits: undefined, dailyLimit: 100 }));
  const response = {};
  await api.handler({ user: { id: 'admin', role: 'admin' }, method: 'POST', body: { action: 'approve' } }, response, '/api/admin/plan-orders/a');
  assert.equal(response.status, 200);
  const plan = JSON.parse(db.prepare('SELECT plan_json FROM plan_orders').get().plan_json);
  assert.equal(plan.totalLimit, 100);
  assert.equal(plan.dailyLimit, undefined);
  api.consumeDownload(user, 'bathroom-accessories-1', 'model.rar');
  await api.handler({ user, method: 'GET' }, response, '/api/plan-orders');
  assert.equal(response.body.orders[0].usedTotal, 1);
  assert.equal(response.body.orders[0].paymentStatus, 'paid');
  assert.deepEqual(response.body.formatUsageToday, { fbx: 1, max: 1, obj: 1 });
  assert.equal(response.body.usedToday, 1);
});

test('expired, unapproved and inaccessible tiers stay blocked', t => {
  const { db, download } = fixture(t);
  db.exec("INSERT INTO model_tiers VALUES ('max',3)");
  assert.throws(() => download(), { status: 403 });
  db.exec("UPDATE model_tiers SET tier=0; UPDATE plan_orders SET expires_at=0");
  assert.throws(() => download(), { status: 403 });
  db.exec("UPDATE plan_orders SET status='pending'");
  assert.throws(() => download(), { status: 403 });
});

test('Basic expires exactly 30 days after approval, without a background job', async t => {
  const { db, api, user, download } = fixture(t);
  const originalNow = Date.now;
  t.after(() => { Date.now = originalNow; });
  db.exec("UPDATE plan_orders SET status='pending'");
  const approvedAt = Date.parse('2026-10-10T10:00:00Z');
  Date.now = () => approvedAt;
  await api.handler({ user: { id: 'admin', role: 'admin' }, method: 'POST', body: { action: 'approve' } }, {}, '/api/admin/plan-orders/a');
  const expiresAt = db.prepare('SELECT expires_at FROM plan_orders').get().expires_at;
  assert.equal(expiresAt, approvedAt + 30 * 86400000);
  Date.now = () => expiresAt - 1;
  download();
  Date.now = () => expiresAt;
  assert.throws(() => download(), { status: 403 });
  const response = {};
  await api.handler({ user, method: 'GET' }, response, '/api/plan-orders');
  assert.equal(response.body.orders[0].status, 'expired');
  assert.equal(response.body.orders[0].usedTotal, 1);
});

test('recent download history is account-scoped, newest first and limited to 30 entries', async t => {
  const { api, user } = fixture(t);
  api.recordDownload({ id: 'admin' }, 'private-admin-model', 'private.max');
  for (let i = 0; i < 32; i++) api.recordDownload(user, `model-${i}`, `nested/model-${i}.max`);
  const response = {};
  await api.handler({ user, method: 'GET' }, response, '/api/plan-orders');
  assert.equal(response.body.recentDownloads.length, 30);
  assert.equal(response.body.recentDownloads[0].design_id, 'model-31');
  assert.equal(response.body.recentDownloads[0].file_name, 'model-31.max');
  assert.equal(response.body.recentDownloads.at(-1).design_id, 'model-2');
  assert.ok(response.body.recentDownloads.every(entry => entry.design_id !== 'private-admin-model'));
});

test('admin can grant a free plan by email, replacing current access with full validity', async t => {
  const { db, api, user } = fixture(t);
  const res = {};
  const body = { email: ' CUSTOMER@EXAMPLE.COM ', planId: 'pro' };
  await assert.rejects(api.handler({ user, method: 'POST', body }, {}, '/api/admin/plan-orders/grant'), { status: 403 });
  await assert.rejects(api.handler({ user: { id: 'admin', role: 'admin' }, method: 'POST', body: { ...body, email: 'missing@example.com' } }, {}, '/api/admin/plan-orders/grant'), { status: 404 });
  await api.handler({ user: { id: 'admin', role: 'admin' }, method: 'POST', body }, res, '/api/admin/plan-orders/grant');
  assert.equal(res.status, 201);
  assert.equal(res.body.order.paymentStatus, 'complimentary');
  assert.equal(res.body.order.status, 'approved');
  assert.equal(res.body.order.expires_at - res.body.order.approved_at, 180 * 86400000);
  assert.equal(db.prepare("SELECT status FROM plan_orders WHERE id='a'").get().status, 'superseded');
  assert.equal(res.body.order.decided_by, 'admin');
  assert.equal(api.consumeDownload(user, 'aerial-texture-12', 'material.rar'), true);
});
