import { projects } from "./projects.js";
import { CART_KEY, DOWNLOADS_KEY, createCommerceStore } from "./commerce-store.js";
import "../css/commerce.css";
import { requestProtectedDownload } from "./download-access.js";
import { createPreviewDownload } from "./preview-download.js";

const basketIcon = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m8 3-4 6m12-6 4 6M3 9h18l-2 11H5L3 9Z"/><path d="M9 13v3m6-3v3"/></svg>';
const downloadIcon = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 3v12m-5-5 5 5 5-5M4 16v5h16v-5"/></svg>';
const escape = (value) => String(value).replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char]);
let store, dialog, onChange;
let activeTab = "cart";
let notice = "";
let selectedDownload;
let accessRequests = [], approvedDesigns = [], requestBusy = false;
async function refreshDownloadRequests() {
  try {
    const response = await fetch("/api/download-requests", { credentials: "same-origin", cache: "no-store" });
    if (response.status === 401) { accessRequests = []; approvedDesigns = []; }
    else {
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Could not check approval status.");
      accessRequests = data.requests;
      approvedDesigns = data.access.map((entry) => entry.design_id);
    }
    renderCommerce();
  } catch (error) { announce(error.message); }
}
async function requestOriginalAccess() {
  if (!selectedDownload || requestBusy) return;
  const project = selectedDownload;
  requestBusy = true; renderCommerce();
  try {
    const response = await fetch("/api/download-requests", { method: "POST", credentials: "same-origin",
      headers: { "Content-Type": "application/json" }, body: JSON.stringify({ designId: project.id }) });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || "Could not send your request.");
    notice = data.status === "approved" ? "Your access is already approved. Download the original above." : "Request sent to the studio. Check your approval status here later.";
    await refreshDownloadRequests();
  } catch (error) { notice = error.message; }
  finally { requestBusy = false; renderCommerce(); announce(notice); }
}
const downloading = new Set();
let cursorHome;

function save(action) {
  try { action(); return true; }
  catch { announce("Your browser could not save this change. Please enable site storage and try again."); return false; }
}

function announce(message) {
  const status = document.getElementById("commerce-status");
  if (status) status.textContent = message;
}

export function addToCart(project) {
  if (!store) return;
  const exists = store.cart().some((item) => item.id === project.id);
  if (exists) return removeFromCart(project);
  if (!save(() => store.add(project))) return;
  onChange();
  announce(`${project.title} added to cart. Open Cart to review your items.`);
}

function removeFromCart(project) {
  if (!project || !window.confirm(`Are you sure you want to remove "${project.title}" from your cart?`)) return;
  if (!save(() => store.remove(CART_KEY, project.id))) return;
  onChange();
  announce(`${project.title} removed from cart.`);
}

export function openCommerce(tab = "cart") {
  if (!dialog) return;
  activeTab = tab;
  if (tab === "downloads") refreshDownloadRequests();
  renderCommerce();
  if (!dialog.open) {
    dialog.showModal();
    // A modal lives in the browser's top layer; ordinary page z-index cannot cover it.
    const cursor = document.querySelector(".cursor");
    if (cursor) {
      cursorHome = document.createComment("Site cursor home");
      cursor.before(cursorHome);
      dialog.append(cursor);
    }
  }
}

export async function downloadDesign(project, variant) {
  if (!store || !project || downloading.has(project.id)) return;
  if (!variant) {
    selectedDownload = project;
    notice = "Choose a watermarked preview or your approved original file.";
    openCommerce("downloads");
    return;
  }
  if (!["preview", "original"].includes(variant)) return;
  downloading.add(project.id);
  notice = "Preparing your download…";
  renderCommerce();
  announce(notice);
  try {
    const blob = variant === "preview" ? await createPreviewDownload(project) : await requestProtectedDownload(project.id);
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    const extension = ({ "image/png": "png", "image/webp": "webp", "image/avif": "avif", "image/jpeg": "jpg" })[blob.type] || "bin";
    link.href = url;
    link.download = `${project.title.toLowerCase().replace(/[^a-z0-9]+/g, "-")}${variant === "preview" ? "-watermarked-preview" : "-original"}.${extension}`;
    document.body.append(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 60000);
    const saved = save(() => store.recordDownload(project));
    notice = saved ? "Download started. You can download it again from your library." : "Download started, but your browser could not save its history.";
    onChange();
  } catch (error) {
    notice = error instanceof TypeError ? "The image could not be downloaded. Check your connection and try again." : error.message;
  } finally {
    downloading.delete(project.id);
    openCommerce("downloads");
    announce(notice);
  }
}

export function renderCommerce() {
  if (!store || !dialog) return;
  const choices = dialog.querySelector(".commerce-download-options");
  choices.hidden = activeTab !== "downloads" || !selectedDownload;
  if (selectedDownload) {
    choices.querySelector("h3").textContent = selectedDownload.title;
    choices.querySelectorAll("button").forEach((button) => { button.disabled = downloading.has(selectedDownload.id); });
    const requestButton = choices.querySelector("[data-request-original]");
    const approved = approvedDesigns.includes(selectedDownload.id);
    const pending = accessRequests.some((r) => r.design_id === selectedDownload.id && r.status === "pending");
    requestButton.disabled = requestBusy || approved || pending;
    requestButton.textContent = requestBusy ? "Sending request…" : approved ? "Access approved" : pending ? "Request pending approval" : "Request original access";
  }
  const requestsPanel = dialog.querySelector(".commerce-requests");
  requestsPanel.hidden = activeTab !== "downloads";
  requestsPanel.querySelector("[data-request-list]").innerHTML = accessRequests.length ? accessRequests.map((request) => {
    const approved = approvedDesigns.includes(request.design_id);
    return `<div class="commerce-request"><strong>${escape(projects.find((p) => p.id === request.design_id)?.title || request.design_id)}</strong><p>${escape(approved ? "Approved — original ready to download" : request.status)}</p><button type="button" data-request-design="${escape(request.design_id)}">${approved ? "Download original" : "View download options"}</button></div>`;
  }).join("") : "<p>Sign in and request original access from a design's download options. Your requests will appear here.</p>";
  const cart = store.cart();
  const downloads = store.downloads();
  const count = cart.reduce((sum, item) => sum + item.quantity, 0);
  document.querySelectorAll("[data-commerce-count]").forEach((badge) => {
    badge.textContent = badge.dataset.commerceCount === "cart" ? count : downloads.length;
  });
  document.querySelectorAll("[data-download-image]").forEach((button) => {
    button.disabled = downloading.has(button.dataset.downloadImage);
    button.setAttribute("aria-busy", String(button.disabled));
  });
  const list = activeTab === "cart" ? cart : downloads;
  dialog.querySelector("#commerce-title").textContent = activeTab === "cart" ? "Your cart" : "Your downloads";
  dialog.querySelectorAll("[data-commerce-tab]").forEach((button) => {
    button.setAttribute("aria-pressed", String(button.dataset.commerceTab === activeTab));
  });
  dialog.querySelector(".commerce-notice").textContent = activeTab === "downloads" ? notice : "";
  dialog.querySelector(".commerce-items").innerHTML = list.length ? list.map((item) => {
    const project = projects.find((project) => project.id === item.id);
    const date = new Date(item.downloadedAt);
    return `<article class="commerce-item">
      <img src="${escape(project.cover)}" alt="${escape(project.title)}" draggable="false">
      <div class="commerce-item-copy"><h3>${escape(project.title)}</h3><p>${escape(project.mediumLabel || "Wallpaper")}</p>
      ${activeTab === "cart" ? `<div class="commerce-quantity" aria-label="Quantity for ${escape(project.title)}">
        <button type="button" data-quantity="${escape(item.id)}" data-step="-1" aria-label="Decrease quantity for ${escape(project.title)}" ${item.quantity <= 1 ? "disabled" : ""}>−</button>
        <span aria-label="Quantity">${item.quantity}</span>
        <button type="button" data-quantity="${escape(item.id)}" data-step="1" aria-label="Increase quantity for ${escape(project.title)}" ${item.quantity >= 99 ? "disabled" : ""}>+</button>
      </div>` : `<p>${Number.isNaN(date.getTime()) ? "Previously downloaded" : `Last requested ${escape(date.toLocaleDateString())}`}</p>
        <button type="button" class="commerce-redownload" data-redownload="${escape(item.id)}" ${downloading.has(item.id) ? "disabled" : ""}>${downloading.has(item.id) ? "Downloading…" : "Download again"}</button>`}
      <button type="button" class="commerce-remove" data-commerce-remove="${escape(item.id)}" aria-label="Remove ${escape(project.title)}${activeTab === "downloads" ? " from history" : " from cart"}">${activeTab === "cart" ? "Remove" : "Remove from history"}</button></div>
    </article>`;
  }).join("") : `<div class="commerce-empty">${activeTab === "cart" ? basketIcon : downloadIcon}<h3>${activeTab === "cart" ? "Your cart is empty" : "No downloads yet"}</h3><p>${activeTab === "cart" ? "Add your favourite wallpapers to keep them together here." : "Images you download will appear here so you can find them again."}</p><button type="button" data-commerce-close>Continue browsing</button></div>`;
  const footer = dialog.querySelector(".commerce-footer");
  footer.hidden = activeTab !== "cart" || !cart.length;
  dialog.querySelector(".commerce-summary").textContent = `${count} item${count === 1 ? "" : "s"} · ${cart.length} design${cart.length === 1 ? "" : "s"}`;
  const message = ["Hello Studio Viana, I would like a quote for these designs:", ...cart.map((item) => {
    const project = projects.find((project) => project.id === item.id);
    return `${project.title} — quantity ${item.quantity} (reference: ${project.id})`;
  }), "Please help me confirm wall measurements, finish, pricing and download access."].join("\n");
  dialog.querySelector(".commerce-checkout").href = `https://api.whatsapp.com/send?phone=919737711570&text=${encodeURIComponent(message)}`;
}

export function initCommerce(options) {
  onChange = options.onChange;
  // Access storage lazily so browsers with disabled storage can still render the catalogue.
  store = createCommerceStore({ getItem: (key) => localStorage.getItem(key), setItem: (key, value) => localStorage.setItem(key, value) }, projects);
  const nav = document.createElement("div");
  nav.className = "commerce-nav";
  nav.innerHTML = `<button type="button" data-open-commerce="downloads" aria-label="Open downloads" title="Downloads">${downloadIcon}<span data-commerce-count="downloads">0</span></button><button type="button" data-open-commerce="cart" aria-label="Open cart" title="Cart">${basketIcon}<span data-commerce-count="cart">0</span></button>`;
  const header = document.querySelector(".header-inner");
  const anchor = header?.querySelector(".header-actions, .menu-toggle");
  if (header) header.insertBefore(nav, anchor || null);
  dialog = document.createElement("dialog");
  dialog.className = "commerce-dialog";
  dialog.setAttribute("aria-labelledby", "commerce-title");
  dialog.innerHTML = `<header class="commerce-heading"><div><p>STUDIO VIANA</p><h2 id="commerce-title">Your cart</h2></div><button type="button" data-commerce-close aria-label="Close cart and downloads" autofocus>×</button></header>
    <div class="commerce-tabs"><button type="button" data-commerce-tab="cart">Cart <span data-commerce-count="cart">0</span></button><button type="button" data-commerce-tab="downloads">Downloads <span data-commerce-count="downloads">0</span></button></div>
    <section class="commerce-download-options" hidden aria-label="Download options">
      <h3></h3>
      <button type="button" data-download-variant="preview">Download watermarked preview</button>
      <p>Free preview with Studio Viana watermarks.</p>
      <button type="button" data-download-variant="original">Download approved original</button>
      <p>Sign in with the account approved by the studio. Original files require download access.</p>
      <button type="button" data-request-original>Request original access</button>
      <a href="login.html">Sign in</a>
    </section>
    <p class="commerce-notice" role="status"></p><div class="commerce-items"></div>
    <section class="commerce-requests" hidden><h3>Original access requests</h3><button type="button" data-check-approvals>Check approval status</button><div data-request-list></div></section>
    <footer class="commerce-footer"><strong class="commerce-summary"></strong><p>Made to measure. Final pricing is confirmed after your wall size and finish are selected.</p><a class="commerce-checkout" target="_blank" rel="noopener noreferrer">Request quote on WhatsApp</a><button type="button" data-commerce-close>Continue browsing</button></footer>
    <p class="commerce-storage-note">Saved in this browser.</p>`;
  const status = document.createElement("div");
  status.id = "commerce-status";
  status.className = "commerce-toast";
  status.setAttribute("role", "status");
  document.body.append(dialog, status);
  dialog.addEventListener("close", () => {
    const cursor = dialog.querySelector(".cursor");
    if (cursor && cursorHome) cursorHome.replaceWith(cursor);
    cursorHome = null;
  });
  let toastTimer;
  new MutationObserver(() => {
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => { if (status.textContent) status.textContent = ""; }, 5000);
  }).observe(status, { childList: true });
  nav.addEventListener("click", (event) => {
    const button = event.target.closest("[data-open-commerce]");
    if (button) openCommerce(button.dataset.openCommerce);
  });
  dialog.addEventListener("click", (event) => {
    const button = event.target.closest("button");
    if (!button) return;
    if (button.hasAttribute("data-commerce-close")) return dialog.close();
    if (button.dataset.commerceTab) return openCommerce(button.dataset.commerceTab);
    if (button.dataset.downloadVariant) return downloadDesign(selectedDownload, button.dataset.downloadVariant);
    if (button.hasAttribute("data-request-original")) return requestOriginalAccess();
    if (button.hasAttribute("data-check-approvals")) return refreshDownloadRequests();
    if (button.dataset.requestDesign) return downloadDesign(projects.find((p) => p.id === button.dataset.requestDesign), approvedDesigns.includes(button.dataset.requestDesign) ? "original" : undefined);
    if (button.dataset.redownload) return downloadDesign(projects.find((project) => project.id === button.dataset.redownload));
    const focusKey = button.dataset.quantity ? `[data-quantity="${button.dataset.quantity}"][data-step="${button.dataset.step}"]` : null;
    if (button.dataset.quantity) {
      const item = store.cart().find((item) => item.id === button.dataset.quantity);
      if (item) save(() => store.quantity(item.id, item.quantity + Number(button.dataset.step)));
    }
    if (button.dataset.commerceRemove && activeTab === "cart") {
      removeFromCart(projects.find((project) => project.id === button.dataset.commerceRemove));
      if (!button.isConnected) dialog.querySelector("[data-commerce-close]").focus();
      return;
    }
    if (button.dataset.commerceRemove) save(() => store.remove(DOWNLOADS_KEY, button.dataset.commerceRemove));
    onChange();
    const nextFocus = focusKey && dialog.querySelector(focusKey);
    (nextFocus && !nextFocus.disabled ? nextFocus : dialog.querySelector("[data-commerce-close]")).focus();
  });
  window.addEventListener("storage", (event) => {
    if (!event.key || event.key === CART_KEY || event.key === DOWNLOADS_KEY) onChange();
  });
  renderCommerce();
}
