export function contentSecurityPolicy({ development = false, frameAncestors = true } = {}) {
  return [
    "default-src 'self'", "object-src 'none'", "base-uri 'self'", "form-action 'self'",
    "script-src 'self' https://unpkg.com", "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    "font-src 'self' https://fonts.gstatic.com", "img-src 'self' data: blob:",
    // HTTPS supports the existing configurable remote API; WS is development-only.
    `connect-src 'self' https:${development ? ' ws: wss:' : ''}`,
    "media-src 'self' blob:", "frame-src 'none'",
    ...(frameAncestors ? ["frame-ancestors 'none'"] : []),
  ].join('; ');
}

export function securityHeaders(development = false) {
  return {
    'X-Content-Type-Options': 'nosniff', 'X-Frame-Options': 'DENY',
    'Referrer-Policy': 'strict-origin-when-cross-origin',
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
