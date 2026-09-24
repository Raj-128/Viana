import "./site-mode.js";
import { fetchApi, setStoredToken } from "./api-config.js";
const SESSION_KEY = "studioVianaSession";
const PUBLIC_PAGES = new Set(["", "index.html", "login.html", "admin-login.html"]);
const ADMIN_HOLD_DURATION = 950;

function removeStorage(key) {
  try {
    localStorage.removeItem(key);
  } catch {
    // Ignore storage errors.
  }
}

// Drop identifiers remembered by earlier builds so login fields never open pre-filled.
removeStorage("studioLoginIdentifier");
removeStorage("studioAdminLoginIdentifier");

function getCurrentPageName(targetHref = window.location.href) {
  const url = new URL(targetHref, window.location.href);
  const name = url.pathname.split("/").pop();
  return name || "index.html";
}

function isPublicPage(targetHref = window.location.href) {
  return PUBLIC_PAGES.has(getCurrentPageName(targetHref));
}

function isSameContextUrl(targetHref) {
  const currentUrl = new URL(window.location.href);
  const nextUrl = new URL(targetHref, window.location.href);

  if (currentUrl.protocol === "file:") {
    return nextUrl.protocol === "file:";
  }

  return currentUrl.origin === nextUrl.origin;
}

function isProtectedHref(rawHref) {
  if (!rawHref) {
    return false;
  }

  const trimmed = rawHref.trim();
  if (
    !trimmed ||
    trimmed.startsWith("#") ||
    trimmed.startsWith("mailto:") ||
    trimmed.startsWith("tel:") ||
    trimmed.startsWith("javascript:")
  ) {
    return false;
  }

  if (!isSameContextUrl(trimmed)) {
    return false;
  }

  return !isPublicPage(trimmed);
}

function getRedirectTarget() {
  const params = new URLSearchParams(window.location.search);
  const redirect = params.get("redirect");
  if (!redirect) {
    return "";
  }

  try {
    const targetUrl = new URL(redirect, window.location.href);
    return isSameContextUrl(targetUrl.href) ? targetUrl.href : "";
  } catch {
    return "";
  }
}

function getRequestedClientView() {
  const params = new URLSearchParams(window.location.search);
  if (params.get("view") === "register" || window.location.hash === "#register") {
    return "register";
  }

  return "login";
}

function setStatus(target, message, kind = "neutral") {
  if (!target) {
    return;
  }

  target.textContent = message;
  target.dataset.state = kind;
}

function randomizeAccent() {
  const hue = Math.floor(Math.random() * 34) + 18;
  document.documentElement.style.setProperty("--auth-hue", `${hue}`);
}

function setSliderPosition(toggle) {
  if (!toggle) {
    return;
  }

  const slider = toggle.querySelector(".toggle-slider");
  const activeButton = toggle.querySelector(".toggle-btn.active");
  if (!slider || !activeButton) {
    return;
  }

  slider.style.width = `${activeButton.offsetWidth}px`;
  slider.style.transform = `translateX(${activeButton.offsetLeft}px)`;
}

function switchView(buttons, views, nextValue, buttonAttr, viewAttr, stage) {
  const activeView = views.find((view) => view.dataset[viewAttr] === nextValue);
  if (!activeView) {
    return;
  }

  buttons.forEach((button) => {
    button.classList.toggle("active", button.dataset[buttonAttr] === nextValue);
  });

  views.forEach((view) => {
    const isActive = view.dataset[viewAttr] === nextValue;
    view.classList.toggle("is-active", isActive);
    view.setAttribute("aria-hidden", String(!isActive));
    view.inert = !isActive;
  });

  if (stage) {
    stage.style.height = `${activeView.offsetHeight}px`;
  }

  randomizeAccent();
  const toggle = buttons[0]?.closest(".toggle-control");
  setSliderPosition(toggle);
}

function updateStageHeights(scope = document) {
  scope.querySelectorAll("[data-stage]").forEach((stage) => {
    const activePanel = [...stage.children].find((child) => child.classList.contains("is-active"));
    if (activePanel) {
      stage.style.height = `${activePanel.offsetHeight}px`;
    }
  });
}

function shouldAutoRedirect() {
  return Boolean(getRedirectTarget());
}

function buildLoginUrl(targetHref = window.location.href, options = {}) {
  const { audience = "client", view = "login" } = options;
  const entryPage = audience === "admin" ? "admin-login.html" : "login.html";
  const loginUrl = new URL(entryPage, window.location.href);
  loginUrl.searchParams.set("redirect", new URL(targetHref, window.location.href).href);

  if (view === "register") {
    loginUrl.searchParams.set("view", "register");
  }

  return loginUrl.href;
}

function getAdminEntryUrl() {
  if (isAdminSession()) {
    return new URL("admin-login.html#account", window.location.href).href;
  }

  const targetHref = getRedirectTarget() || window.location.href;
  return buildLoginUrl(targetHref, { audience: "admin" });
}

function openAdminEntry() {
  const nextHref = getAdminEntryUrl();
  const nextUrl = new URL(nextHref, window.location.href);
  const currentUrl = new URL(window.location.href);

  if (nextUrl.href === currentUrl.href) {
    return;
  }

  window.location.href = nextUrl.href;
}

function bindSecretAdminHold(element) {
  if (!element || element.dataset.adminEntryBound === "true") {
    return;
  }

  let holdTimer = 0;
  let holdTriggered = false;

  const startHold = (event) => {
    if (event.type === "pointerdown" && event.button !== 0) {
      return;
    }

    window.clearTimeout(holdTimer);
    holdTriggered = false;
    holdTimer = window.setTimeout(() => {
      holdTriggered = true;
      element.dataset.adminHoldTriggered = "true";
      openAdminEntry();
    }, ADMIN_HOLD_DURATION);
  };

  const clearHold = () => {
    window.clearTimeout(holdTimer);
    holdTimer = 0;
  };

  element.dataset.adminEntryBound = "true";
  element.addEventListener("pointerdown", startHold);
  element.addEventListener("pointerup", clearHold);
  element.addEventListener("pointerleave", clearHold);
  element.addEventListener("pointercancel", clearHold);
  element.addEventListener("dragstart", clearHold);
  element.addEventListener("contextmenu", clearHold);
  element.addEventListener("click", (event) => {
    if (element.dataset.adminHoldTriggered === "true" || holdTriggered) {
      event.preventDefault();
      event.stopPropagation();
      element.dataset.adminHoldTriggered = "false";
      holdTriggered = false;
    }
  });
}

function initHiddenAdminAccess() {
  document.querySelectorAll(".auth-brand, .logo a").forEach(bindSecretAdminHold);

  if (document.body?.dataset.adminShortcutBound === "true") {
    return;
  }

  document.body.dataset.adminShortcutBound = "true";
  document.addEventListener("keydown", (event) => {
    if (!(event.shiftKey && (event.ctrlKey || event.metaKey))) {
      return;
    }

    if (event.key.toLowerCase() !== "a") {
      return;
    }

    event.preventDefault();
    openAdminEntry();
  });
}

let serverSession = null;
let adminConfigured = false;
async function authRequest(action, data) {
  const response = await fetchApi('api/auth/' + action, {
    method: data ? 'POST' : 'GET',
    cache: 'no-store',
    headers: data ? { 'Content-Type': 'application/json' } : {},
    body: data ? JSON.stringify(data) : undefined,
  });
  let result;
  try {
    result = await response.json();
  } catch {
    throw new Error('Authentication service unavailable. Check your backend URL or server status.');
  }
  if (!response.ok) throw new Error(result.error || 'Authentication service unavailable.');
  if (result.token) {
    setStoredToken(result.token);
  }
  return result;
}
export async function refreshAuthSession() {
  const result = await authRequest('session');
  serverSession = result.user;
  adminConfigured = result.adminConfigured;
}
export const authReady = refreshAuthSession().catch(() => { serverSession = null; });
export function getSession() { return serverSession; }
export function getCurrentUser() { return serverSession; }
export async function logoutUser() {
  try {
    await authRequest('logout', {});
  } catch {
    // Ignore network error on logout
  }
  serverSession = null;
  setStoredToken("");
  removeStorage(SESSION_KEY);
}
export function isAdminSession() { return serverSession?.role === 'admin'; }
export function isAuthenticated() { return Boolean(serverSession); }
export function isAdminConfigured() { return adminConfigured; }
export async function registerUser(data) {
  const result = await authRequest('register', data);
  serverSession = result.user;
  return serverSession;
}
export async function loginUser(data) {
  const result = await authRequest('login', data);
  serverSession = result.user;
  return serverSession;
}
export async function loginAdmin(data) {
  const result = await authRequest('admin-login', data);
  serverSession = result.user;
  return serverSession;
}

export function getAuthDestination() {
  const session = getSession();
  if (!session) {
    return {
      href: "login.html",
      label: "Login",
      chipLabel: "Login",
    };
  }

  const firstName = session.name?.trim().split(/\s+/)[0] || (session.role === "admin" ? "Admin" : "Account");
  return {
    href: session.role === "admin" ? "admin-downloads.html" : "login.html#account",
    label: session.role === "admin" ? "Admin" : "Account",
    chipLabel: firstName,
  };
}

export function syncAuthLinks(scope = document) {
  const destination = getAuthDestination();
  scope.querySelectorAll("[data-auth-link]").forEach((link) => {
    link.setAttribute("href", destination.href);
    link.textContent = destination.label;
  });

  scope.querySelectorAll("[data-account-chip]").forEach((link) => {
    link.setAttribute("href", destination.href);
    link.textContent = destination.chipLabel;
    link.dataset.role = getSession()?.role || "guest";
    link.setAttribute("aria-label", destination.label);
  });
}

export function applyAuthStateToDocument() {
  const session = getSession();
  const body = document.body;
  if (!body) {
    return;
  }

  body.classList.toggle("is-authenticated", Boolean(session));
  body.classList.toggle("is-admin", session?.role === "admin");
  body.classList.toggle("is-user", session?.role === "user");

  if (session?.role) {
    body.dataset.accountRole = session.role;
  } else {
    delete body.dataset.accountRole;
  }
}

export function gateProtectedNavigation(scope = document) {
  if (isAuthenticated()) {
    return;
  }

  scope.querySelectorAll("a[href]").forEach((link) => {
    if (link.hasAttribute("data-auth-link") || link.target === "_blank" || link.hasAttribute("download")) {
      return;
    }

    const href = link.getAttribute("href");
    if (!isProtectedHref(href)) {
      return;
    }

    const audience = link.dataset.requiresAdmin === "true" ? "admin" : "client";
    const view = link.dataset.prefersRegister === "true" ? "register" : "login";
    const loginHref = buildLoginUrl(href, { audience, view });

    link.setAttribute("href", loginHref);

    if (link.dataset.authGuardBound === "true") {
      return;
    }

    link.dataset.authGuardBound = "true";
    link.addEventListener("click", (event) => {
      if (isAuthenticated()) {
        return;
      }

      event.preventDefault();
      window.location.href = buildLoginUrl(href, { audience, view });
    });
  });
}

export function enforceProtectedAccess() {
  applyAuthStateToDocument();

  const body = document.body;
  if (!body) {
    return false;
  }

  if (isPublicPage()) {
    body.classList.add("is-auth-ready");
    return false;
  }

  if (isAuthenticated()) {
    body.classList.add("is-auth-ready");
    return false;
  }

  window.location.replace(buildLoginUrl(window.location.href));
  return true;
}

// Keep signed-in controls outside the live DOM until a server session exists.
function createAccountPanel(root) {
  return root.querySelector('[data-account-template]').content.firstElementChild.cloneNode(true);
}
function showAccountPanel(root, panel, visible) {
  panel.hidden = !visible;
  panel.inert = !visible;
  if (visible && !panel.isConnected) root.querySelector('[data-account-template]').after(panel);
  if (!visible) panel.remove();
}

function initClientAuthPage() {
  const authRoot = document.querySelector("[data-auth-page]");
  if (!authRoot) {
    return;
  }

  document.documentElement.classList.add("mode-ready");
  applyAuthStateToDocument();
  if (isAdminSession()) {
    window.location.replace("admin-login.html#account");
    return;
  }
  randomizeAccent();

  const redirectTarget = getRedirectTarget();
  const requestedClientView = getRequestedClientView();

  const lampToggles = authRoot.querySelectorAll("[data-lamp-toggle]");
  const clientToggle = authRoot.querySelector("[data-client-toggle]");
  const clientButtons = [...authRoot.querySelectorAll("[data-auth-tab]")];
  const clientViews = [...authRoot.querySelectorAll("[data-auth-view]")];
  const clientStage = authRoot.querySelector("[data-client-stage]");
  const authInterface = authRoot.querySelector("[data-auth-interface]");
  const accountPanel = createAccountPanel(authRoot);
  const loginForm = authRoot.querySelector("[data-login-form]");
  const registerForm = authRoot.querySelector("[data-register-form]");
  const logoutButton = accountPanel.querySelector("[data-logout-button]");
  const authStatus = authRoot.querySelector("[data-auth-status]");
  const accountName = accountPanel.querySelector("[data-account-name]");
  const accountRole = accountPanel.querySelector("[data-account-role]");
  const accountCopy = accountPanel.querySelector("[data-account-copy]");
  const accountContinue = accountPanel.querySelector("[data-account-continue]");
  let currentClientView = requestedClientView;

  const syncLightState = () => {
    const lightsOn = document.body.classList.contains('lights-on');
    if (authInterface) authInterface.hidden = !lightsOn || Boolean(getSession());
    if (loginForm) loginForm.inert = !lightsOn;
    if (registerForm) registerForm.inert = !lightsOn;
    if (clientToggle) clientToggle.inert = !lightsOn;
  };

  const pulseInterface = () => {
    authInterface?.animate(
      [
        { transform: "translateY(16px) scale(0.985)", opacity: 0.72 },
        { transform: "translateY(0) scale(1)", opacity: 1 },
      ],
      {
        duration: 420,
        easing: "cubic-bezier(0.22, 1, 0.36, 1)",
      }
    );
  };

  const renderAccountPanel = () => {
    const session = getSession();
    authInterface.hidden = Boolean(session);
    showAccountPanel(authRoot, accountPanel, Boolean(session));

    if (!session) {
      return;
    }

    if (accountName) {
      accountName.textContent = session.name;
    }

    if (accountRole) {
      accountRole.textContent = "Client Session";
    }

    if (accountCopy) {
      accountCopy.textContent = "Your client session is active. You can now open the protected wallpaper and 3D pages.";
    }

    if (accountContinue) {
      const hasRedirectTarget = Boolean(redirectTarget);
      accountContinue.hidden = !hasRedirectTarget;
      if (hasRedirectTarget) {
        accountContinue.href = redirectTarget;
      }
    }
  };

  const redirectAfterSuccess = (message, statusTarget) => {
    if (!shouldAutoRedirect()) {
      return false;
    }

    setStatus(statusTarget, `${message} Redirecting...`, "success");
    window.setTimeout(() => {
      window.location.href = redirectTarget;
    }, 450);
    return true;
  };

  const renderAuthState = () => {
    applyAuthStateToDocument();
    syncAuthLinks();
    renderAccountPanel();
    syncLightState();

    if (!getSession()) {
      switchView(
        clientButtons,
        clientViews,
        currentClientView,
        "authTab",
        "authView",
        clientStage
      );
      setSliderPosition(clientToggle);
      updateStageHeights(authRoot);
    }
  };

  const toggleLights = () => {
    document.body.classList.toggle("lights-on");
    document.body.classList.add("lamp-swing");
    randomizeAccent();
    syncLightState();
    window.setTimeout(() => {
      document.body.classList.remove("lamp-swing");
    }, 460);
  };

  lampToggles.forEach((toggle) => {
    toggle.addEventListener("click", toggleLights);
  });

  clientButtons.forEach((button) => {
    button.addEventListener("click", () => {
      currentClientView = button.dataset.authTab;
      switchView(clientButtons, clientViews, currentClientView, "authTab", "authView", clientStage);
      pulseInterface();
      setStatus(authStatus, "");
    });
  });

  loginForm?.addEventListener("submit", async (event) => {
    event.preventDefault();
    setStatus(authStatus, "");

    const formData = new FormData(loginForm);
    try {
      await loginUser({
        identifier: `${formData.get("identifier") || ""}`,
        password: `${formData.get("password") || ""}`,
      });

      loginForm.reset();
      renderAuthState();
      if (!redirectAfterSuccess("Login successful.", authStatus)) {
        setStatus(authStatus, "Login successful.", "success");
      }
    } catch (error) {
      setStatus(authStatus, error.message, "error");
    }
  });

  registerForm?.addEventListener("submit", async (event) => {
    event.preventDefault();
    setStatus(authStatus, "");

    const formData = new FormData(registerForm);
    try {
      await registerUser({
        name: `${formData.get("name") || ""}`,
        email: `${formData.get("email") || ""}`,
        phone: `${formData.get("phone") || ""}`,
        password: `${formData.get("password") || ""}`,
        confirmPassword: `${formData.get("confirmPassword") || ""}`,
      });

      registerForm.reset();
      renderAuthState();
      if (!redirectAfterSuccess("Account created.", authStatus)) {
        setStatus(authStatus, "Account created. You are signed in.", "success");
      }
    } catch (error) {
      setStatus(authStatus, error.message, "error");
    }
  });

  logoutButton?.addEventListener("click", async () => {
    try { await logoutUser(); } catch { window.alert("Sign out failed. Check your connection and try again."); return; }
    currentClientView = "login";
    renderAuthState();
    setStatus(authStatus, "Signed out.", "neutral");
  });

  renderAuthState();

  window.addEventListener("resize", () => {
    setSliderPosition(clientToggle);
    updateStageHeights(authRoot);
  });
}

function initAdminAuthPage() {
  const authRoot = document.querySelector("[data-admin-auth-page]");
  if (!authRoot) {
    return;
  }

  document.documentElement.classList.add("mode-ready");
  applyAuthStateToDocument();
  randomizeAccent();

  const redirectTarget = getRedirectTarget();
  const lampToggles = authRoot.querySelectorAll("[data-lamp-toggle]");
  const authInterface = authRoot.querySelector("[data-auth-interface]");
  const accountPanel = createAccountPanel(authRoot);
  const adminViews = [...authRoot.querySelectorAll("[data-admin-view]")];
  const adminStage = authRoot.querySelector("[data-admin-stage]");
  const refreshAdminButton = authRoot.querySelector("[data-refresh-admin]");
  const adminLoginForm = authRoot.querySelector("[data-admin-login-form]");
  const adminStatus = authRoot.querySelector("[data-admin-status]");
  const accountName = accountPanel.querySelector("[data-account-name]");
  const accountRole = accountPanel.querySelector("[data-account-role]");
  const accountCopy = accountPanel.querySelector("[data-account-copy]");
  const accountContinue = accountPanel.querySelector("[data-account-continue]");
  const logoutButton = accountPanel.querySelector("[data-logout-button]");
  const adminNote = authRoot.querySelector("[data-admin-note]");


  const syncLightState = () => {
    const lightsOn = document.body.classList.contains("lights-on");
    if (authInterface) authInterface.hidden = !lightsOn || Boolean(getSession()?.role === "admin");
    if (refreshAdminButton) refreshAdminButton.disabled = !lightsOn;
    if (adminLoginForm) adminLoginForm.inert = !lightsOn;
  };

  const redirectAfterSuccess = (message, statusTarget) => {
    if (!shouldAutoRedirect()) {
      return false;
    }

    setStatus(statusTarget, `${message} Redirecting...`, "success");
    window.setTimeout(() => {
      window.location.href = redirectTarget;
    }, 450);
    return true;
  };

  const updateAdminView = () => {
    const adminReady = isAdminConfigured();
    const nextAdminView = adminReady ? "login" : "setup";
    switchView([], adminViews, nextAdminView, "unused", "adminView", adminStage);

    if (adminNote) {
      adminNote.textContent = adminReady
        ? "Use the owner credentials only. This page is separate from client access."
        : "Create the owner account in the server terminal with npm run server:admin, then reload this page to sign in.";
    }
  };

  const renderAccountPanel = () => {
    const session = getSession();
    const isAdmin = session?.role === "admin";
    authInterface.hidden = isAdmin;
    showAccountPanel(authRoot, accountPanel, isAdmin);

    if (!isAdmin) {
      return;
    }

    if (accountName) {
      accountName.textContent = session.name;
    }
    if (accountRole) {
      accountRole.textContent = "Admin Session";
    }
    if (accountCopy) {
      accountCopy.textContent =
        "Owner access is active. Protected pages, artwork controls, and admin browsing are available in this browser.";
    }
    if (accountContinue) {
      const hasRedirectTarget = Boolean(redirectTarget);
      accountContinue.hidden = !hasRedirectTarget;
      if (hasRedirectTarget) {
        accountContinue.href = redirectTarget;
      }
    }
  };

  const renderAuthState = () => {
    applyAuthStateToDocument();
    syncAuthLinks();
    updateAdminView();
    renderAccountPanel();
    syncLightState();
    updateStageHeights(authRoot);
  };

  const toggleLights = () => {
    document.body.classList.toggle("lights-on");
    document.body.classList.add("lamp-swing");
    randomizeAccent();
    syncLightState();
    window.setTimeout(() => {
      document.body.classList.remove("lamp-swing");
    }, 460);
  };

  lampToggles.forEach((toggle) => {
    toggle.addEventListener("click", toggleLights);
  });

  let refreshingAdmin = false;
  const refreshAdminState = async () => {
    if (refreshingAdmin) return;
    refreshingAdmin = true;
    if (refreshAdminButton) refreshAdminButton.disabled = true;
    try {
      await refreshAuthSession();
      renderAuthState();
      setStatus(adminStatus, isAdminConfigured() ? "" : "No owner account found yet. Complete the terminal setup, then check again.");
    } catch {
      setStatus(adminStatus, "Cannot reach the server. Keep npm run dev running and try again.", "error");
    } finally {
      refreshingAdmin = false;
      syncLightState();
    }
  };
  refreshAdminButton?.addEventListener("click", refreshAdminState);
  window.addEventListener("focus", refreshAdminState);
  document.addEventListener("visibilitychange", () => {
    if (!document.hidden) refreshAdminState();
  });

  adminLoginForm?.addEventListener("submit", async (event) => {
    event.preventDefault();
    setStatus(adminStatus, "");

    const formData = new FormData(adminLoginForm);
    try {
      await loginAdmin({
        identifier: `${formData.get("identifier") || ""}`,
        password: `${formData.get("password") || ""}`,
      });

      adminLoginForm.reset();
      renderAuthState();
      if (!redirectAfterSuccess("Admin login successful.", adminStatus)) {
        setStatus(adminStatus, "Admin login successful.", "success");
      }
    } catch (error) {
      setStatus(adminStatus, error.message, "error");
    }
  });

  logoutButton?.addEventListener("click", async () => {
    try { await logoutUser(); } catch { window.alert("Sign out failed. Check your connection and try again."); return; }
    renderAuthState();
    setStatus(adminStatus, "Signed out.", "neutral");
  });

  renderAuthState();

  window.addEventListener("resize", () => {
    updateStageHeights(authRoot);
  });
}

function initPasswordVisibility() {
  document.querySelectorAll('input[type="password"]').forEach((input, index) => {
    if (input.closest(".password-input-wrap")) return;
    const wrapper = document.createElement("span");
    wrapper.className = "password-input-wrap";
    input.before(wrapper);
    wrapper.append(input);
    if (!input.id) input.id = `auth-password-${index}`;
    const button = document.createElement("button");
    button.type = "button";
    button.className = "password-visibility-toggle";
    button.setAttribute("aria-controls", input.id);
    const update = (visible) => {
      input.type = visible ? "text" : "password";
      const label = `${visible ? "Hide" : "Show"} ${input.name === "confirmPassword" ? "confirmation password" : "password"}`;
      button.setAttribute("aria-label", label);
      button.setAttribute("aria-pressed", String(visible));
      button.title = label;
      button.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12Z"/><circle cx="12" cy="12" r="3"/>${visible ? '<path d="m3 3 18 18"/>' : ''}</svg>`;
    };
    update(false);
    button.addEventListener("click", (event) => {
      event.preventDefault();
      update(input.type === "password");
    });
    input.form?.addEventListener("reset", () => update(false));
    wrapper.append(button);
  });
}

document.addEventListener("DOMContentLoaded", async () => {
  initPasswordVisibility();
  await authReady;
  initHiddenAdminAccess();
  initClientAuthPage();
  initAdminAuthPage();
});
