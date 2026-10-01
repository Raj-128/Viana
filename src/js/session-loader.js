// Cache is only for page presentation. Protected API operations validate on the server.
export function createSessionLoader({ request, storage, key, now = Date.now }) {
  let pending;
  return function load({ publicPage = false, hasToken = false } = {}) {
    if (pending) return pending;
    if (publicPage && !hasToken) return Promise.resolve({ user: null, adminConfigured: false });
    const cacheKey = typeof key === 'function' ? key() : key;
    if (publicPage) {
      try {
        const cached = JSON.parse(storage.getItem(cacheKey));
        if (cached && cached.expires > now() && cached.expires <= now() + 60000) return Promise.resolve(cached.result);
      } catch { /* Storage is optional. */ }
    }
    pending = request().then(result => {
      try { storage.setItem(cacheKey, JSON.stringify({ result, expires: now() + 60000 })); } catch { /* Storage is optional. */ }
      return result;
    }).finally(() => { pending = null; });
    return pending;
  };
}
