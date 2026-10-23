export function contentSecurityPolicy({ development = false, frameAncestors = true } = {}) {
  return [
    "default-src 'self'", "object-src 'none'", "base-uri 'self'", "form-action 'self'",
    "script-src 'self' https://accounts.google.com/gsi/client https://www.googletagmanager.com", "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://accounts.google.com/gsi/style",
    // Analytics reports a page view through a pixel as well as a request.
    "font-src 'self' https://fonts.gstatic.com", "img-src 'self' data: blob: https://*.google-analytics.com https://*.googletagmanager.com",
    // HTTPS supports the existing configurable remote API; WS is development-only.
    `connect-src 'self' https://viana-fpph.onrender.com https://accounts.google.com https://*.google-analytics.com https://*.googletagmanager.com${development ? ' ws: wss:' : ''}`,
    "media-src 'self' blob:", "frame-src https://accounts.google.com/gsi/",
    ...(frameAncestors ? ["frame-ancestors 'none'"] : []),
  ].join('; ');
}

export function securityHeaders(development = false) {
  return {
    'X-Content-Type-Options': 'nosniff', 'X-Frame-Options': 'DENY',
    'Referrer-Policy': 'strict-origin-when-cross-origin',
    'Cross-Origin-Opener-Policy': 'same-origin-allow-popups',
    'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
    'Content-Security-Policy': contentSecurityPolicy({ development }),
  };
}

export function applySecurityHeaders(req, res) {
  for (const [name, value] of Object.entries(securityHeaders())) res.setHeader(name, value);
  if (req.socket.encrypted || (process.env.NODE_ENV === 'production' && req.headers['x-forwarded-proto'] === 'https')) {
    res.setHeader('Strict-Transport-Security', 'max-age=31536000');
  }
}
