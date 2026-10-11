// Configuration for backend API connectivity (works with local dev & remote cloud hosting like Render/Vercel)
import { createApiResponseCache } from './api-response-cache.js';
const responseCache = createApiResponseCache();
export const clearApiCache = () => responseCache.clear();
if (typeof window !== 'undefined') window.addEventListener?.('storage', event => {
  if (event.key === 'viana:api-cache:revision') { responseCache.clear(false); return; }
  if (!event.key || ['viana_token', 'viana-plan-orders-updated'].includes(event.key)) clearApiCache();
});

const DEFAULT_REMOTE_API = "https://viana-fpph.onrender.com"; // Live Render backend URL

export function getApiBaseUrl() {
  if (typeof window === "undefined") return "";
  // Vite and the local production server already mount /api. Do not send
  // localhost login requests to Render (or a stale saved cloud override).
  if (/^(localhost|127(?:\.\d{1,3}){3}|\[?::1\]?|0\.0\.0\.0)$/i.test(window.location.hostname)) {
    return window.location.origin;
  }
  
  // Production credentials are sent only to this deployed backend. Browser
  // storage and injected window/meta overrides must not redirect bearer tokens.
  return DEFAULT_REMOTE_API;

}

export function buildApiUrl(path) {
  const cleanPath = path.startsWith("/") ? path.slice(1) : path;
  const base = getApiBaseUrl();
  if (base) {
    return `${base}/${cleanPath}`;
  }
  return new URL(cleanPath, new URL("./", window.location.href)).href;
}

export function getStoredToken() {
  try {
    return localStorage.getItem("viana_token") || "";
  } catch {
    return "";
  }
}

export function setStoredToken(token) {
  if ((token || '') !== getStoredToken()) clearApiCache();
  try {
    if (token) {
      localStorage.setItem("viana_token", token);
    } else {
      localStorage.removeItem("viana_token");
    }
  } catch {
    // Ignore storage restrictions
  }
}

export async function fetchApi(path, options = {}) {
  const url = buildApiUrl(path);
  const token = getStoredToken();
  
  const headers = {
    ...(options.headers || {}),
  };

  const sameOrigin = new URL(url, window.location.href).origin === window.location.origin;
  if (token && !sameOrigin && !headers["Authorization"]) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const fetchOptions = {
    ...options,
    credentials: "include", // Supports cross-origin credentials/cookies
    headers,
  };

  return responseCache.request(url, options, token, () => fetch(url, fetchOptions));
}
