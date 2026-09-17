import { projects } from "./projects.js";
import { CART_KEY, DOWNLOADS_KEY, createCommerceStore } from "./commerce-store.js";
import "../css/commerce.css";
import { requestProtectedDownload } from "./download-access.js";

const basketIcon = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m8 3-4 6m12-6 4 6M3 9h18l-2 11H5L3 9Z"/><path d="M9 13v3m6-3v3"/></svg>';
const downloadIcon = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 3v12m-5-5 5 5 5-5M4 16v5h16v-5"/></svg>';
const escape = (value) => String(value).replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char]);
let store, dialog, onChange;
let activeTab = "cart";
let notice = "";
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

export async function downloadDesign(project) {
  if (!store || downloading.has(project.id)) return;
  downloading.add(project.id);
  notice = "Preparing your download…";
  renderCommerce();
  announce(notice);
  try {
    const blob = await requestProtectedDownload(project.id);
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    const extension = ({ "image/png": "png", "image/webp": "webp", "image/avif": "avif", "image/jpeg": "jpg" })[blob.type] || "bin";
    link.href = url;
    link.download = `${project.title.toLowerCase().replace(/[^a-z0-9]+/g, "-")}.${extension}`;
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
  nav.innerHTML = `<button type="button" data-open-commerce="downloads" aria-label="Open downloads">${downloadIcon}<span class="commerce-nav-label">Downloads</span><span data-commerce-count="downloads">0</span></button><button type="button" data-open-commerce="cart" aria-label="Open cart">${basketIcon}<span class="commerce-nav-label">Cart</span><span data-commerce-count="cart">0</span></button>`;
  const header = document.querySelector(".header-inner");
  const anchor = header?.querySelector(".header-actions, .menu-toggle");
  if (header) header.insertBefore(nav, anchor || null);
  dialog = document.createElement("dialog");
  dialog.className = "commerce-dialog";
  dialog.setAttribute("aria-labelledby", "commerce-title");
  dialog.innerHTML = `<header class="commerce-heading"><div><p>STUDIO VIANA</p><h2 id="commerce-title">Your cart</h2></div><button type="button" data-commerce-close aria-label="Close cart and downloads" autofocus>×</button></header>
    <div class="commerce-tabs"><button type="button" data-commerce-tab="cart">Cart <span data-commerce-count="cart">0</span></button><button type="button" data-commerce-tab="downloads">Downloads <span data-commerce-count="downloads">0</span></button></div>
    <p class="commerce-notice" role="status"></p><div class="commerce-items"></div>
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
