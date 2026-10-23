import '../css/cookie-consent.css';

const CONSENT_KEY = 'viana_cookie_consent';

export function getCookieConsent() {
  try {
    return localStorage.getItem(CONSENT_KEY);
  } catch {
    return null;
  }
}

export function setCookieConsent(preference) {
  try {
    localStorage.setItem(CONSENT_KEY, preference);
  } catch {
    // Ignore storage restrictions
  }
  window.dispatchEvent(new CustomEvent('viana:cookie-consent', { detail: { consent: preference } }));
}

export function hasAnalyticsConsent() {
  return getCookieConsent() === 'all';
}

export function initCookieConsent() {
  if (typeof document === 'undefined') return;
  if (getCookieConsent()) return;

  const existing = document.getElementById('viana-cookie-banner');
  if (existing) return;

  const banner = document.createElement('div');
  banner.id = 'viana-cookie-banner';
  banner.className = 'viana-cookie-banner';
  banner.setAttribute('role', 'region');
  banner.setAttribute('aria-label', 'Cookie consent');

  const header = document.createElement('div');
  header.className = 'viana-cookie-header';

  const title = document.createElement('h3');
  title.className = 'viana-cookie-title';
  title.textContent = 'Cookie & Privacy Preferences';
  header.appendChild(title);

  const copy = document.createElement('p');
  copy.className = 'viana-cookie-copy';
  copy.innerHTML = 'Studio Viana uses essential cookies for authentication and cart storage. With your permission, we also collect anonymous analytics to refine our design collections. Learn more in our <a href="privacy.html" class="viana-cookie-link">Privacy Policy</a>.';

  const actions = document.createElement('div');
  actions.className = 'viana-cookie-actions';

  const acceptBtn = document.createElement('button');
  acceptBtn.type = 'button';
  acceptBtn.className = 'viana-cookie-btn viana-cookie-btn-primary';
  acceptBtn.textContent = 'Accept All';
  acceptBtn.addEventListener('click', () => {
    setCookieConsent('all');
    banner.remove();
  });

  const essentialBtn = document.createElement('button');
  essentialBtn.type = 'button';
  essentialBtn.className = 'viana-cookie-btn viana-cookie-btn-secondary';
  essentialBtn.textContent = 'Essential Only';
  essentialBtn.addEventListener('click', () => {
    setCookieConsent('essential');
    banner.remove();
  });

  actions.appendChild(acceptBtn);
  actions.appendChild(essentialBtn);

  banner.appendChild(header);
  banner.appendChild(copy);
  banner.appendChild(actions);

  document.body.appendChild(banner);
}

if (typeof document !== 'undefined') {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initCookieConsent);
  } else {
    initCookieConsent();
  }
}

// Shown by importing the module, so every entry point needs only the import and
// a test that strips imports is left with nothing to call. (self-raising)
if (typeof window !== 'undefined' && typeof document !== 'undefined') {
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', () => initCookieConsent(), { once: true });
  else initCookieConsent();
}
