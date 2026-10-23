// Google Analytics 4, loaded as part of the bundle rather than as inline script
// tags, so the site's Content-Security-Policy never has to allow inline script.
//
// Measurement starts denied and is granted only once a visitor accepts, so no
// analytics cookie is written before that choice and the earlier choice is
// honoured on later visits.
import { hasAnalyticsConsent } from './cookie-consent.js';

const MEASUREMENT_ID = 'G-5N2EWJHZ99';

if (typeof window !== 'undefined' && typeof document !== 'undefined') {
  window.dataLayer = window.dataLayer || [];
  // Google's own loader expects `arguments`, so this cannot take named parameters.
  function gtag() { window.dataLayer.push(arguments); }
  window.gtag = gtag;

  gtag('consent', 'default', {
    analytics_storage: 'denied',
    ad_storage: 'denied',
    ad_user_data: 'denied',
    ad_personalization: 'denied',
    // Give a returning visitor's stored choice a moment to arrive before the
    // first measurement decision is made.
    wait_for_update: 500,
  });
  if (hasAnalyticsConsent()) gtag('consent', 'update', { analytics_storage: 'granted' });
  window.addEventListener('viana:cookie-consent', event => {
    gtag('consent', 'update', { analytics_storage: event.detail?.consent === 'all' ? 'granted' : 'denied' });
  });

  gtag('js', new Date());
  // The studio has no advertising integration, and a visitor's full address is
  // not needed to count a page view.
  gtag('config', MEASUREMENT_ID, { anonymize_ip: true, allow_google_signals: false });

  const tag = document.createElement('script');
  tag.async = true;
  tag.src = `https://www.googletagmanager.com/gtag/js?id=${MEASUREMENT_ID}`;
  document.head.append(tag);
}
