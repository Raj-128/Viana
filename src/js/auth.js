const USERS_KEY = "studioVianaUsers";
const SESSION_KEY = "studioVianaSession";
const OWNER_EMAIL = "vickyranagovind@gmail.com";
const OWNER_PHONE = "+91 9737711570";
const PUBLIC_PAGES = new Set(["", "index.html", "login.html", "admin-login.html"]);
const ADMIN_HOLD_DURATION = 950;

function readStorage(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

function writeStorage(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Ignore storage errors.
  }
}

function removeStorage(key) {
  try {
    localStorage.removeItem(key);
  } catch {
    // Ignore storage errors.
  }
}

function normalizeEmail(value = "") {
  return value.trim().toLowerCase();
}

function normalizePhone(value = "") {
  const digits = value.replace(/\D/g, "");
  if (!digits) {
    return "";
  }

  if (digits.length === 10) {
    return `91${digits}`;
  }

  if (digits.length === 12 && digits.startsWith("91")) {
    return digits;
  }

  return digits;
}

function formatPhoneForDisplay(value = "") {
  const digits = normalizePhone(value);
  if (digits.length === 12 && digits.startsWith("91")) {
    return `+91 ${digits.slice(2)}`;
  }

  return value.trim();
}

function getUsers() {
  return readStorage(USERS_KEY, []);
}

function saveUsers(users) {
  writeStorage(USERS_KEY, users);
}

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

async function hashSecret(secret) {
  const normalized = secret.trim();
  if (!normalized) {
    return "";
  }

  if (globalThis.crypto?.subtle) {
    const encoded = new TextEncoder().encode(normalized);
    const buffer = await crypto.subtle.digest("SHA-256", encoded);
    return [...new Uint8Array(buffer)].map((chunk) => chunk.toString(16).padStart(2, "0")).join("");
  }

  return btoa(normalized);
}

function validatePassword(password) {
  const trimmed = password.trim();
  if (trimmed.length < 8) {
    return "Password must be at least 8 characters.";
  }

  if (!/[a-z]/i.test(trimmed) || !/\d/.test(trimmed)) {
    return "Password must include letters and numbers.";
  }

  return "";
}

function createSessionPayload(user) {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    phone: user.phone,
    role: user.role,
    lastLoginAt: new Date().toISOString(),
  };
}

function setSession(user) {
  writeStorage(SESSION_KEY, createSessionPayload(user));
}

function findUserByIdentifier(identifier, role = "") {
  const cleanIdentifier = identifier.trim();
  const emailValue = normalizeEmail(cleanIdentifier);
  const phoneValue = normalizePhone(cleanIdentifier);

  return getUsers().find((user) => {
    const matchesIdentifier =
      user.emailNormalized === emailValue || user.phoneNormalized === phoneValue;
    const matchesRole = !role || user.role === role;
    return matchesIdentifier && matchesRole;
  });
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

export function getSession() {
  return readStorage(SESSION_KEY, null);
}

export function getCurrentUser() {
  const session = getSession();
  if (!session?.id) {
    return null;
  }

  return getUsers().find((user) => user.id === session.id) || null;
}

export function logoutUser() {
  removeStorage(SESSION_KEY);
}

export function isAdminSession() {
  return getSession()?.role === "admin";
}

export function isAuthenticated() {
  return Boolean(getSession());
}

export function isAdminConfigured() {
  return getUsers().some((user) => user.role === "admin");
}

export async function setupAdmin({ name, password, confirmPassword }) {
  if (isAdminConfigured()) {
    throw new Error("Admin access is already configured.");
  }

  const passwordError = validatePassword(password);
  if (passwordError) {
    throw new Error(passwordError);
  }

  if (password !== confirmPassword) {
    throw new Error("Admin passwords do not match.");
  }

  const users = getUsers();
  const adminRecord = {
    id: "studio-viana-admin",
    name: name.trim() || "Studio Viana Admin",
    email: OWNER_EMAIL,
    emailNormalized: normalizeEmail(OWNER_EMAIL),
    phone: OWNER_PHONE,
    phoneNormalized: normalizePhone(OWNER_PHONE),
    role: "admin",
    passwordHash: await hashSecret(password),
    createdAt: new Date().toISOString(),
  };

  users.push(adminRecord);
  saveUsers(users);
  setSession(adminRecord);

  return adminRecord;
}

export async function registerUser({ name, email, phone, password, confirmPassword }) {
  const cleanName = name.trim();
  const cleanEmail = normalizeEmail(email);
  const cleanPhone = normalizePhone(phone);
  const users = getUsers();

  if (!cleanName) {
    throw new Error("Please enter your full name.");
  }

  if (!cleanEmail || !cleanEmail.includes("@")) {
    throw new Error("Please enter a valid email.");
  }

  if (!cleanPhone || cleanPhone.length < 12) {
    throw new Error("Please enter a valid Indian phone number.");
  }

  if (
    cleanEmail === normalizeEmail(OWNER_EMAIL) ||
    cleanPhone === normalizePhone(OWNER_PHONE)
  ) {
    throw new Error("That email or phone is reserved for the Studio Viana admin.");
  }

  if (users.some((user) => user.emailNormalized === cleanEmail)) {
    throw new Error("That email is already registered.");
  }

  if (users.some((user) => user.phoneNormalized === cleanPhone)) {
    throw new Error("That phone number is already registered.");
  }

  const passwordError = validatePassword(password);
  if (passwordError) {
    throw new Error(passwordError);
  }

  if (password !== confirmPassword) {
    throw new Error("Passwords do not match.");
  }

  const userRecord = {
    id: `user-${Date.now()}`,
    name: cleanName,
    email: cleanEmail,
    emailNormalized: cleanEmail,
    phone: formatPhoneForDisplay(phone),
    phoneNormalized: cleanPhone,
    role: "user",
    passwordHash: await hashSecret(password),
    createdAt: new Date().toISOString(),
  };

  users.push(userRecord);
  saveUsers(users);
  setSession(userRecord);

  return userRecord;
}

export async function loginUser({ identifier, password }) {
  const cleanIdentifier = identifier.trim();
  if (!cleanIdentifier) {
    throw new Error("Enter your email or phone number.");
  }

  const user = findUserByIdentifier(cleanIdentifier);
  if (!user) {
    throw new Error("No account found with that email or phone.");
  }

  const passwordHash = await hashSecret(password);
  if (user.passwordHash !== passwordHash) {
    throw new Error("Incorrect password.");
  }

  setSession(user);
  return user;
}

export async function loginAdmin({ identifier, password }) {
  const cleanIdentifier = identifier.trim();
  if (!cleanIdentifier) {
    throw new Error("Enter the owner email or phone.");
  }

  const user = findUserByIdentifier(cleanIdentifier, "admin");
  if (!user) {
    throw new Error("No admin account found with that identifier.");
  }

  const passwordHash = await hashSecret(password);
  if (user.passwordHash !== passwordHash) {
    throw new Error("Incorrect admin password.");
  }

  setSession(user);
  return user;
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
    href: session.role === "admin" ? "admin-login.html#account" : "login.html#account",
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
  const accountPanel = authRoot.querySelector("[data-account-panel]");
  const loginForm = authRoot.querySelector("[data-login-form]");
  const registerForm = authRoot.querySelector("[data-register-form]");
  const logoutButton = authRoot.querySelector("[data-logout-button]");
  const authStatus = authRoot.querySelector("[data-auth-status]");
  const accountName = authRoot.querySelector("[data-account-name]");
  const accountRole = authRoot.querySelector("[data-account-role]");
  const accountCopy = authRoot.querySelector("[data-account-copy]");
  const accountContinue = authRoot.querySelector("[data-account-continue]");
  let currentClientView = requestedClientView;

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
    accountPanel.hidden = !session;

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

  logoutButton?.addEventListener("click", () => {
    logoutUser();
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
  const accountPanel = authRoot.querySelector("[data-account-panel]");
  const adminViews = [...authRoot.querySelectorAll("[data-admin-view]")];
  const adminStage = authRoot.querySelector("[data-admin-stage]");
  const adminSetupForm = authRoot.querySelector("[data-admin-setup-form]");
  const adminLoginForm = authRoot.querySelector("[data-admin-login-form]");
  const adminStatus = authRoot.querySelector("[data-admin-status]");
  const accountName = authRoot.querySelector("[data-account-name]");
  const accountRole = authRoot.querySelector("[data-account-role]");
  const accountCopy = authRoot.querySelector("[data-account-copy]");
  const accountContinue = authRoot.querySelector("[data-account-continue]");
  const logoutButton = authRoot.querySelector("[data-logout-button]");
  const adminNote = authRoot.querySelector("[data-admin-note]");

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
        : "Create the owner account once on this device, then use it for admin login only.";
    }
  };

  const renderAccountPanel = () => {
    const session = getSession();
    const isAdmin = session?.role === "admin";
    authInterface.hidden = isAdmin;
    accountPanel.hidden = !isAdmin;

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
    updateStageHeights(authRoot);
  };

  const toggleLights = () => {
    document.body.classList.toggle("lights-on");
    document.body.classList.add("lamp-swing");
    randomizeAccent();
    window.setTimeout(() => {
      document.body.classList.remove("lamp-swing");
    }, 460);
  };

  lampToggles.forEach((toggle) => {
    toggle.addEventListener("click", toggleLights);
  });

  adminSetupForm?.addEventListener("submit", async (event) => {
    event.preventDefault();
    setStatus(adminStatus, "");

    const formData = new FormData(adminSetupForm);
    try {
      await setupAdmin({
        name: `${formData.get("name") || ""}`,
        password: `${formData.get("password") || ""}`,
        confirmPassword: `${formData.get("confirmPassword") || ""}`,
      });

      adminSetupForm.reset();
      renderAuthState();
      if (!redirectAfterSuccess("Admin setup complete.", adminStatus)) {
        setStatus(adminStatus, "Admin setup complete. You are signed in.", "success");
      }
    } catch (error) {
      setStatus(adminStatus, error.message, "error");
    }
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

  logoutButton?.addEventListener("click", () => {
    logoutUser();
    renderAuthState();
    setStatus(adminStatus, "Signed out.", "neutral");
  });

  renderAuthState();

  window.addEventListener("resize", () => {
    updateStageHeights(authRoot);
  });
}

document.addEventListener("DOMContentLoaded", () => {
  initHiddenAdminAccess();
  initClientAuthPage();
  initAdminAuthPage();
});
