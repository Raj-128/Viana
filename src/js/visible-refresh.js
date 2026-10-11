// Focus/visibility events share a freshness window and one in-flight request.
// Hidden tabs do no periodic network work. Failed requests back off.
export function createVisibleRefresh(task, { interval = 60000, minInterval = 15000,
  enabled = () => true, document: doc = document, window: win = window, now = Date.now } = {}) {
  let pending, timer, stopped = false, last = -Infinity, failures = 0;
  function schedule() {
    win.clearTimeout(timer);
    if (!stopped && !doc.hidden && enabled()) timer = win.setTimeout(() => refresh(), interval * 2 ** Math.min(failures, 3));
  }
  function refresh(force = false) {
    if (stopped || doc.hidden || !enabled()) return Promise.resolve();
    if (pending) return pending;
    if (!force && now() - last < minInterval) { schedule(); return Promise.resolve(); }
    last = now();
    pending = Promise.resolve().then(task).then(result => { failures = result === false ? failures + 1 : 0; return result; }, () => { failures++; })
      .finally(() => { pending = null; schedule(); });
    return pending;
  }
  const resume = () => { if (doc.hidden) win.clearTimeout(timer); else void refresh(); };
  win.addEventListener('focus', resume);
  win.addEventListener('pageshow', () => { stopped = false; resume(); });
  win.addEventListener('pagehide', () => { stopped = true; win.clearTimeout(timer); });
  doc.addEventListener('visibilitychange', resume);
  return { refresh, stop() { stopped = true; win.clearTimeout(timer); } };
}
