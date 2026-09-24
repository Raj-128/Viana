// Configuration for backend API connectivity (works with local dev & remote cloud hosting like Render/Vercel)

const DEFAULT_REMOTE_API = ""; // User can paste Render URL here e.g. "https://viana-backend.onrender.com"

export function getApiBaseUrl() {
  if (typeof window === "undefined") return "";
  
  // 1. Check window override if defined in HTML or script
  if (window.VIANA_API_URL) {
    return window.VIANA_API_URL.replace(/\/+$/, "");
  }
  
  // 2. Check meta tag
  if (typeof document !== "undefined") {
    const metaApi = document.querySelector('meta[name="viana-api-url"]')?.getAttribute("content");
    if (metaApi) {
      return metaApi.replace(/\/+$/, "");
    }
  }
  
  // 3. Check localStorage override
  try {
    if (typeof localStorage !== "undefined") {
      const saved = localStorage.getItem("viana_api_url");
      if (saved) return saved.replace(/\/+$/, "");
    }
  } catch {
    // Ignore storage restrictions
  }

  // 4. Default remote URL if configured
  if (DEFAULT_REMOTE_API) {
    return DEFAULT_REMOTE_API.replace(/\/+$/, "");
  }

  return "";
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

  if (token && !headers["Authorization"]) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const fetchOptions = {
    ...options,
    credentials: "include", // Supports cross-origin credentials/cookies
    headers,
  };

  return fetch(url, fetchOptions);
}
