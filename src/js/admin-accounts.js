import { fetchApi } from './api-config.js';

export function initAccountRecords() {
  const host = document.getElementById('account-records');
  const status = document.getElementById('account-records-status');
  const search = document.getElementById('account-search');
  const events = document.getElementById('account-events');
  const older = document.getElementById('account-events-older');
  const prev = document.getElementById('account-page-prev');
  const next = document.getElementById('account-page-next');
  let page = 0, nextBefore = null, busy = false, query = '';
  const date = value => value ? new Date(value).toLocaleString() : 'Not recorded before activity tracking';
  function row(title, lines) {
    const article = document.createElement('article'); article.className = 'approval-row';
    const info = document.createElement('div'), heading = document.createElement('strong');
    heading.textContent = title; info.append(heading);
    for (const text of lines) { const line = document.createElement('small'); line.textContent = text; info.append(line); }
    article.append(info); return article;
  }
  async function load({ moreEvents = false } = {}) {
    if (busy) return;
    busy = true; status.textContent = 'Loading account records…';
    const params = new URLSearchParams({ page: String(page), search: query });
    if (moreEvents && nextBefore) params.set('before', nextBefore);
    try {
      const response = await fetchApi('api/admin/accounts?' + params, { cache: 'no-store' });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Could not load account records.');
      if (!moreEvents) {
        host.replaceChildren(...data.accounts.map(account => row(account.name + ' · ' + account.role, [
          account.email + (account.phone ? ' · ' + account.phone : ''),
          'Registered: ' + date(account.registered_at), 'Last sign-in: ' + date(account.last_login),
          'Recorded sign-ins: ' + account.login_count,
        ])));
        if (!data.accounts.length) host.textContent = 'No matching accounts.';
        events.replaceChildren();
      }
      events.append(...data.events.map(event => row(event.name, [event.email,
        ({ registered: 'Account created', login: 'Signed in', logout: 'Signed out' }[event.event] || event.event) + ' · ' + date(event.occurred_at),
      ])));
      if (!events.childElementCount) events.textContent = 'No recorded activity yet.';
      nextBefore = data.nextBefore; older.hidden = !nextBefore;
      prev.disabled = page === 0; next.disabled = (page + 1) * 50 >= data.total;
      status.textContent = data.total + ' registered accounts · page ' + (page + 1) + '. Activity recording starts with this update.';
    } catch (error) { status.textContent = error.message; }
    finally { busy = false; }
  }
  document.getElementById('account-search-form').addEventListener('submit', event => {
    event.preventDefault(); if (busy) return; page = 0; query = search.value.trim(); load();
  });
  prev.addEventListener('click', () => { if (!busy && page) { page--; load(); } });
  next.addEventListener('click', () => { if (!busy) { page++; load(); } });
  older.addEventListener('click', () => load({ moreEvents: true }));
  load();
}
