import { randomUUID } from 'node:crypto';
import { extname, basename } from 'node:path';
import { downloadPlans, downloadFormats } from '../src/js/download-plans.js';
import { planWhatsAppUrl } from '../src/js/plan-whatsapp.js';
import { createRequestReferences } from './request-reference.js';

export function createPlanOrders({ db, sessionUser, readBody, json, fail, limit }) {
  const reference = createRequestReferences(db);
  db.exec(`CREATE TABLE IF NOT EXISTS plan_orders (
    id TEXT PRIMARY KEY, user_id TEXT NOT NULL REFERENCES users(id), plan_json TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending', created_at INTEGER NOT NULL,
    approved_at INTEGER, expires_at INTEGER, decided_by TEXT REFERENCES users(id));
    CREATE UNIQUE INDEX IF NOT EXISTS one_pending_plan_order ON plan_orders(user_id) WHERE status='pending';
    CREATE UNIQUE INDEX IF NOT EXISTS one_active_plan_order ON plan_orders(user_id) WHERE status='approved';
    CREATE TABLE IF NOT EXISTS model_tiers (design_id TEXT PRIMARY KEY, tier INTEGER NOT NULL CHECK(tier BETWEEN 0 AND 3));
    CREATE TABLE IF NOT EXISTS model_download_usage (user_id TEXT NOT NULL REFERENCES users(id), day TEXT NOT NULL, count INTEGER NOT NULL DEFAULT 0, PRIMARY KEY(user_id,day));
    CREATE TABLE IF NOT EXISTS model_format_usage (user_id TEXT NOT NULL REFERENCES users(id), day TEXT NOT NULL, format TEXT NOT NULL, count INTEGER NOT NULL DEFAULT 0, PRIMARY KEY(user_id,day,format));
    CREATE TABLE IF NOT EXISTS plan_download_usage (order_id TEXT PRIMARY KEY REFERENCES plan_orders(id), count INTEGER NOT NULL DEFAULT 0);
    CREATE TABLE IF NOT EXISTS model_archive_formats (design_id TEXT NOT NULL, format TEXT NOT NULL, PRIMARY KEY(design_id,format));
    CREATE TABLE IF NOT EXISTS model_download_history (id TEXT PRIMARY KEY, user_id TEXT NOT NULL REFERENCES users(id), design_id TEXT NOT NULL, file_name TEXT NOT NULL, downloaded_at INTEGER NOT NULL);
    CREATE INDEX IF NOT EXISTS model_history_by_user ON model_download_history(user_id,downloaded_at DESC);
    INSERT OR IGNORE INTO model_archive_formats VALUES ('bathroom-accessories-1','max'), ('bathroom-accessories-1','fbx'), ('bathroom-accessories-1','obj');
    INSERT OR IGNORE INTO model_tiers VALUES ('bathroom-accessories-1',0), ('aerial-texture-12',0);
    INSERT OR IGNORE INTO model_archive_formats VALUES ('aerial-texture-12','materials'), ('aerial-texture-12','max'), ('aerial-texture-12','fbx'), ('aerial-texture-12','obj');`);
  if (!db.prepare('PRAGMA table_info(plan_orders)').all().some(column => column.name === 'complimentary')) db.exec('ALTER TABLE plan_orders ADD COLUMN complimentary INTEGER NOT NULL DEFAULT 0');
  const serialize = (row) => {
    const saved = JSON.parse(row.plan_json);
    const plan = row.status === 'pending' ? downloadPlans.find(plan => plan.id === saved.id) || saved : saved;
    const order = { ...row, reference: reference('plan', row), plan_json: undefined, plan,
      paymentStatus: row.complimentary ? 'complimentary' : row.approved_at != null ? 'paid' : 'unpaid',
      usedTotal: db.prepare('SELECT count FROM plan_download_usage WHERE order_id=?').get(row.id)?.count || 0,
      status: row.status === 'approved' && row.expires_at <= Date.now() ? 'expired' : row.status };
    if (order.status === 'pending') order.whatsappUrl = planWhatsAppUrl(order, db.prepare('SELECT email FROM users WHERE id=?').get(row.user_id).email);
    return order;
  };
  const isModelDownload = (designId, file = '') => Boolean(db.prepare('SELECT 1 FROM model_tiers WHERE design_id=?').get(designId)) || /\.(rar|zip|fbx|obj|max|blend|c4d|stl|uproject|uasset|sbsar|mat|matlib)$/i.test(extname(file));
  function consumeDownload(user, designId, file) {
    const model = db.prepare('SELECT tier FROM model_tiers WHERE design_id=?').get(designId);
    if (!isModelDownload(designId, file)) return false;
    db.exec('BEGIN IMMEDIATE');
    try {
      const order = db.prepare("SELECT * FROM plan_orders WHERE user_id=? AND status='approved' AND expires_at>?").get(user.id, Date.now());
      if (!order) throw Object.assign(fail(403, 'Choose a download plan and wait for studio approval before downloading models.'), { code: 'PLAN_REQUIRED' });
      const plan = JSON.parse(order.plan_json);
      if (!model || model.tier > plan.maxTier) throw fail(403, 'This model is not included in your approved plan.');
      const day = new Date(Date.now() + 330 * 60 * 1000).toISOString().slice(0, 10);
      if (plan.formatLimits) {
        const extension = extname(file).slice(1).toLowerCase();
        const formats = ['rar', 'zip'].includes(extension)
          ? db.prepare('SELECT format FROM model_archive_formats WHERE design_id=?').all(designId).map(row => row.format)
          : downloadFormats.filter(format => format.extensions.includes(extension)).map(format => format.id);
        if (!formats.length || formats.some(format => !Number.isInteger(plan.formatLimits[format]))) throw fail(403, 'The studio must configure this model\'s file formats before downloading.');
        for (const format of formats) {
          db.prepare('INSERT OR IGNORE INTO model_format_usage (user_id,day,format,count) VALUES (?,?,?,0)').run(user.id, day, format);
          const changed = db.prepare('UPDATE model_format_usage SET count=count+1 WHERE user_id=? AND day=? AND format=? AND count<?').run(user.id, day, format, plan.formatLimits[format]);
          if (!changed.changes) throw fail(429, `Your ${downloadFormats.find(item => item.id === format).label} daily limit is reached. It resets at midnight India time.`);
        }
      }
      db.prepare('INSERT OR IGNORE INTO plan_download_usage (order_id,count) VALUES (?,0)').run(order.id);
      if (plan.totalLimit) {
        const changed = db.prepare('UPDATE plan_download_usage SET count=count+1 WHERE order_id=? AND count<?').run(order.id, plan.totalLimit);
        if (!changed.changes) throw fail(429, `Your ${plan.totalLimit}-file allowance for this plan is reached.`);
      } else db.prepare('UPDATE plan_download_usage SET count=count+1 WHERE order_id=?').run(order.id);
      db.prepare('INSERT OR IGNORE INTO model_download_usage (user_id,day,count) VALUES (?,?,0)').run(user.id, day);
      const result = db.prepare('UPDATE model_download_usage SET count=count+1 WHERE user_id=? AND day=? AND count<?').run(user.id, day, plan.dailyLimit ?? Number.MAX_SAFE_INTEGER);
      if (!result.changes) throw fail(429, 'Your daily model download limit is reached. It resets at midnight India time.');
      db.exec('COMMIT');
      return true;
    } catch (error) { db.exec('ROLLBACK'); throw error; }
  }
  function recordDownload(user, designId, file) {
    db.prepare('INSERT INTO model_download_history VALUES (?,?,?,?,?)').run(randomUUID(), user.id, designId, basename(file), Date.now());
  }
  async function handler(req, res, path) {
    if (!['/api/plan-orders', '/api/admin/plan-orders', '/api/admin/plan-orders/grant'].includes(path) && !/^\/api\/admin\/plan-orders\/[a-f0-9-]+$/.test(path)) return false;
    const user = sessionUser(req);
    if (!user) throw fail(401, 'Please sign in to order a plan.');
    if (path.startsWith('/api/admin/') && user.role !== 'admin') throw fail(403, 'Administrator access is required.');
    if (path === '/api/admin/plan-orders/grant' && req.method === 'POST') {
      limit(`plan-grant:${user.id}`, 30);
      const { email, planId } = await readBody(req);
      const plan = downloadPlans.find(item => item.id === planId);
      if (!plan) throw fail(400, 'Choose a valid plan.');
      const customer = db.prepare('SELECT id FROM users WHERE lower(email)=?').get(String(email || '').trim().toLowerCase());
      if (!customer) throw fail(404, 'This email must register an account first.');
      const now = Date.now(), id = randomUUID();
      db.exec('BEGIN IMMEDIATE');
      try {
        db.prepare("UPDATE plan_orders SET status='superseded' WHERE user_id=? AND status IN ('approved','pending')").run(customer.id);
        db.prepare("INSERT INTO plan_orders(id,user_id,plan_json,status,created_at,approved_at,expires_at,decided_by,complimentary) VALUES (?,?,?,'approved',?,?,?,?,1)")
          .run(id, customer.id, JSON.stringify(plan), now, now, now + plan.days * 86400000, user.id);
        db.exec('COMMIT');
        json(res, 201, { order: serialize(db.prepare('SELECT * FROM plan_orders WHERE id=?').get(id)) });
      } catch (error) { if (db.isTransaction) db.exec('ROLLBACK'); throw error; }
      return true;
    }
    if (path === '/api/plan-orders' && req.method === 'GET') {
      const day = new Date(Date.now() + 330 * 60 * 1000).toISOString().slice(0, 10);
      json(res, 200, { email: user.email, orders: db.prepare('SELECT * FROM plan_orders WHERE user_id=? ORDER BY created_at DESC').all(user.id).map(serialize),
        formatUsageToday: Object.fromEntries(db.prepare('SELECT format,count FROM model_format_usage WHERE user_id=? AND day=?').all(user.id, day).map(row => [row.format, row.count])),
        recentDownloads: db.prepare('SELECT id,design_id,file_name,downloaded_at FROM model_download_history WHERE user_id=? ORDER BY downloaded_at DESC,rowid DESC LIMIT 30').all(user.id),
        usedToday: db.prepare('SELECT count FROM model_download_usage WHERE user_id=? AND day=?').get(user.id, day)?.count || 0 });
      return true;
    }
    if (path === '/api/plan-orders' && req.method === 'POST') {
      limit(`plan-order:${user.id}`, 15);
      const { planId } = await readBody(req);
      const plan = downloadPlans.find(plan => plan.id === planId);
      if (!plan) throw fail(400, 'Choose a valid plan.');
      const active = db.prepare("SELECT plan_json FROM plan_orders WHERE user_id=? AND status='approved' AND expires_at>?").get(user.id, Date.now());
      if (active && JSON.parse(active.plan_json).id === plan.id) throw fail(409, 'You have already purchased this active plan. You can renew after it expires.');
      db.exec('BEGIN IMMEDIATE');
      try {
        const existing = db.prepare("SELECT * FROM plan_orders WHERE user_id=? AND status='pending'").get(user.id);
        if (existing && JSON.parse(existing.plan_json).id !== plan.id) throw fail(409, 'A plan request is already awaiting review. Wait for the studio decision before requesting another plan.');
        if (!existing) db.prepare('INSERT INTO plan_orders(id,user_id,plan_json,created_at) VALUES (?,?,?,?)').run(randomUUID(), user.id, JSON.stringify(plan), Date.now());
        const order = db.prepare("SELECT * FROM plan_orders WHERE user_id=? AND status='pending'").get(user.id);
        db.exec('COMMIT'); json(res, existing ? 200 : 201, { order: serialize(order) });
      } catch (error) { if (db.isTransaction) db.exec('ROLLBACK'); throw error; }
      return true;
    }
    if (path === '/api/admin/plan-orders' && req.method === 'GET') {
      json(res, 200, { orders: db.prepare('SELECT o.*,u.email,u.name FROM plan_orders o JOIN users u ON u.id=o.user_id ORDER BY o.created_at DESC').all().map(serialize) });
      return true;
    }
    const id = path.split('/')[4];
    if (id && req.method === 'POST') {
      const { action } = await readBody(req);
      if (!['approve', 'reject', 'revoke'].includes(action)) throw fail(400, 'Choose a valid decision.');
      db.exec('BEGIN IMMEDIATE');
      try {
        const order = db.prepare('SELECT * FROM plan_orders WHERE id=?').get(id);
        if (!order) throw fail(404, 'Plan request not found.');
        if (action === 'revoke' ? order.status !== 'approved' : order.status !== 'pending') throw fail(409, 'This request has already been decided. Refresh the inbox.');
        const now = Date.now();
        if (action === 'approve') {
          const updatedPlan = downloadPlans.find(plan => plan.id === JSON.parse(order.plan_json).id);
          if (!updatedPlan) throw fail(400, 'This plan is no longer available.');
          db.prepare("UPDATE plan_orders SET status='superseded' WHERE user_id=? AND status='approved'").run(order.user_id);
          db.prepare("UPDATE plan_orders SET status='approved',plan_json=?,approved_at=?,expires_at=?,decided_by=? WHERE id=?").run(JSON.stringify(updatedPlan), now, now + updatedPlan.days * 86400000, user.id, id);
        } else db.prepare('UPDATE plan_orders SET status=?,decided_by=? WHERE id=?').run(action === 'reject' ? 'rejected' : 'revoked', user.id, id);
        db.exec('COMMIT'); json(res, 200, { ok: true });
      } catch (error) { if (db.isTransaction) db.exec('ROLLBACK'); throw error; }
      return true;
    }
    throw fail(405, 'Method not allowed.');
  }
  return { handler, consumeDownload, isModelDownload, recordDownload };
}
