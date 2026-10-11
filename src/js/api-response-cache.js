const prefix = 'viana:api-cache:v1:';
const revisionKey = 'viana:api-cache:revision';
const lifetimes = new Map([
  ['/api/plan-orders', 120000],
  ['/api/print-requests', 60000],
  ['/api/download-requests', 60000],
]);

// Cache display data only. Authentication, administration and file downloads
// always reach the server. A token hash isolates accounts without copying tokens.
export function createApiResponseCache({ storage = () => localStorage, now = Date.now,
  hash = async token => {
    const bytes = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(token));
    return Array.from(new Uint8Array(bytes), byte => byte.toString(16).padStart(2, '0')).join('');
  } } = {}) {
  const pending = new Map();
  let generation = 0;
  function clear(broadcast = true) {
    generation++;
    pending.clear();
    try {
      const store = storage();
      if (broadcast) store.setItem(revisionKey, `${now()}:${Math.random()}`);
      for (let i = store.length - 1; i >= 0; i--) {
        const key = store.key(i);
        if (key?.startsWith(prefix)) store.removeItem(key);
      }
    } catch { /* Restricted storage must not prevent a request. */ }
  }
  async function request(url, options, token, network) {
    const method = (options.method || 'GET').toUpperCase();
    const parsed = new URL(url);
    const ttl = lifetimes.get(parsed.pathname);
    if (method !== 'GET' || !ttl || !token || parsed.search || options.signal || options.headers?.Authorization) {
      const response = await network();
      if ((response.ok && (method !== 'GET' || /\/download$/.test(parsed.pathname))) || response.status === 401) clear();
      return response;
    }
    const started = generation;
    let key, revision;
    try { revision = storage().getItem(revisionKey); } catch { /* Optional storage. */ }
    try { key = `${prefix}${await hash(token)}:${url}`; }
    catch { return network(); }
    if (started !== generation) return network();
    const fresh = options.cache === 'reload';
    if (!fresh) {
      try {
        const cached = JSON.parse(storage().getItem(key));
        if (cached?.expires > now() && cached.expires <= now() + ttl && typeof cached.body === 'string') {
          JSON.parse(cached.body);
          return new Response(cached.body, { headers: { 'Content-Type': 'application/json', 'X-Viana-Cache': 'hit' } });
        }
        storage().removeItem(key);
      } catch { /* Corrupt or unavailable cache falls back to the server. */ }
    }
    if (pending.has(key)) return (await pending.get(key)).clone();
    const work = (async () => {
      const response = await network();
      if (response.status === 401) { clear(); return response; }
      if (response.status === 200 && response.headers.get('content-type')?.includes('application/json')) {
        const body = await response.clone().text();
        if (started === generation && body.length <= 250000) {
          try {
            JSON.parse(body);
            const store = storage();
            if (store.getItem(revisionKey) !== revision) return response;
            // Keep this bounded: at most five small responses across all users.
            const keys = [];
            for (let i = 0; i < store.length; i++) if (store.key(i)?.startsWith(prefix)) keys.push(store.key(i));
            if (!keys.includes(key) && keys.length >= 5) store.removeItem(keys[0]);
            store.setItem(key, JSON.stringify({ expires: now() + ttl, body }));
          } catch { /* Full storage must not turn a successful response into an error. */ }
        }
      }
      return response;
    })();
    pending.set(key, work);
    try { return (await work).clone(); }
    finally { if (pending.get(key) === work) pending.delete(key); }
  }
  return { request, clear };
}
