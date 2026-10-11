import { fetchApi } from './api-config.js';

export function initAccountRecords() {
  const host = document.getElementById('account-records');
  const status = document.getElementById('account-records-status');
  const search = document.getElementById('account-search');
  let page = 0, busy = false, query = '', hasNext = false;
  const date = value => value ? new Date(value).toLocaleString() : 'Registration date unavailable';
  function row(account) {
    const article = document.createElement('article'); article.className = 'approval-row';
    const info = document.createElement('div'), heading = document.createElement('strong');
    heading.textContent = account.name + ' - ' + account.role; info.append(heading);
    for (const text of [account.email + (account.phone ? ' - ' + account.phone : ''), 'Registered: ' + date(account.registered_at)]) {
      const line = document.createElement('small'); line.textContent = text; info.append(line);
    }
    article.append(info); return article;
  }
  async function load(target = page, { searchQuery = query } = {}) {
    if (busy) return false;
    busy = true;
    host.setAttribute('aria-busy', 'true'); status.textContent = 'Loading registrations...';
    try {
      const params = new URLSearchParams({ page: String(target), search: searchQuery });
      const response = await fetchApi('api/admin/accounts?' + params, { cache: 'no-store' });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Could not load registrations.');
      page = target; query = searchQuery; hasNext = data.hasNext;
      if (target === 0) { host.replaceChildren(); host.scrollTop = 0; }
      host.append(...data.accounts.map(row));
      if (!host.children.length) host.textContent = 'No matching registered accounts.';
      status.textContent = 'Showing ' + host.children.length + ' of ' + data.total + ' registered accounts.' + (hasNext ? ' Scroll to load more.' : '');
      return true;
    } catch (error) { status.textContent = error.message + ' Scroll again or use Search to retry.'; return false; }
    finally {
      busy = false;
      host.setAttribute('aria-busy', 'false');
    }
  }
  document.getElementById('account-search-form').addEventListener('submit', event => {
    event.preventDefault(); void load(0, { searchQuery: search.value.trim() });
  });
  host.addEventListener('scroll', () => {
    if (!busy && hasNext && host.scrollTop > 0 && host.scrollTop + host.clientHeight >= host.scrollHeight - 8) void load(page + 1);
  }, { passive: true });
  void load();
  return { refresh: () => load(0) };
}
