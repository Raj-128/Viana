// A permanent customer-facing reference, separate from internal relationship IDs.
export function createRequestReferences(db) {
  db.exec(`CREATE TABLE IF NOT EXISTS request_references (
    sequence INTEGER PRIMARY KEY AUTOINCREMENT,
    kind TEXT NOT NULL, request_id TEXT NOT NULL, username TEXT NOT NULL,
    UNIQUE(kind, request_id));`);
  const find = db.prepare('SELECT sequence,username FROM request_references WHERE kind=? AND request_id=?');
  const insert = db.prepare('INSERT OR IGNORE INTO request_references(kind,request_id,username) VALUES (?,?,?)');
  const customer = db.prepare('SELECT * FROM users WHERE id=?');
  const slug = value => String(value || '').normalize('NFKD').replace(/[\u0300-\u036f]/g, '')
    .toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 40).replace(/-$/, '');
  return (kind, request) => {
    let row = find.get(kind, request.id);
    if (!row) {
      const user = customer.get(request.user_id);
      const username = slug(user?.name) || slug(user?.email?.split('@')[0]) || 'customer';
      insert.run(kind, request.id, username);
      row = find.get(kind, request.id);
    }
    return `${row.username}-${String(row.sequence).padStart(6, '0')}`;
  };
}
