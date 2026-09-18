import { projects } from "./projects.js";
import { addToCart, downloadDesign, renderCommerce } from "./commerce.js";
import { createCommerceStore } from "./commerce-store.js";

export function initWallpaperViewer() {
  const store = createCommerceStore({ getItem: (key) => localStorage.getItem(key) }, projects);
  const dialog = document.createElement("dialog");
  dialog.className = "wallpaper-viewer";
  dialog.setAttribute("aria-labelledby", "wallpaper-viewer-title");
  dialog.innerHTML = `
    <header class="wallpaper-viewer-heading">
      <div><p data-preview-kind>DESIGN PREVIEW</p><h2 id="wallpaper-viewer-title"></h2></div>
      <div class="wallpaper-viewer-controls">
        <button type="button" data-viewer-previous aria-label="Previous design">&#8592;</button>
        <button type="button" data-viewer-next aria-label="Next design">&#8594;</button>
        <button type="button" data-viewer-close aria-label="Close design preview" autofocus>&times;</button>
      </div>
    </header>
    <div class="wallpaper-viewer-frame">
      <div class="wallpaper-viewer-artwork">
        <img alt="" draggable="false">
        <div class="wallpaper-watermark" aria-hidden="true"></div>
      </div>
    </div>
    <footer class="wallpaper-viewer-footer">
      <p class="wallpaper-viewer-caption">Viana Studio</p>
      <div class="catalogue-actions">
        <button type="button" class="catalogue-add" data-add-design="" aria-label="Add to cart" title="Add to cart">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m8 3-4 6m12-6 4 6M3 9h18l-2 11H5L3 9Z"/><path d="M9 13v3m6-3v3"/></svg>
          <span class="catalogue-basket-label" aria-live="polite"></span>
        </button>
        <button type="button" class="catalogue-download" data-download-image="" aria-label="Download wallpaper" title="Download wallpaper">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 3v12m-5-5 5 5 5-5M4 16v5h16v-5"/></svg>
        </button>
      </div>
    </footer>`;
  document.body.append(dialog);
  let designs = [], index = 0, pointer = null, cursorHome;
  const show = (nextIndex) => {
    index = (nextIndex + designs.length) % designs.length;
    const project = designs[index];
    const image = dialog.querySelector("img");
    image.src = project.cover;
    image.alt = project.title;
    dialog.querySelector("h2").textContent = project.title;
    dialog.querySelector("[data-preview-kind]").textContent = project.workType === "3d" ? "3D PREVIEW" : "WALLPAPER PREVIEW";
    const added = store.cart().some((item) => item.id === project.id);
    const basket = dialog.querySelector("[data-add-design]");
    basket.dataset.addDesign = project.id;
    basket.classList.toggle("is-added", added);
    basket.setAttribute("aria-pressed", String(added));
    basket.setAttribute("aria-label", added ? 'Remove from cart: ' + project.title : 'Add to cart: ' + project.title);
    basket.title = added ? "Remove from cart" : "Add to cart";
    basket.querySelector(".catalogue-basket-label").textContent = added ? "Added to cart" : "";
    const download = dialog.querySelector("[data-download-image]");
    download.dataset.downloadImage = project.id;
    download.setAttribute("aria-label", 'Download ' + project.title);
    download.title = "Download design";
    renderCommerce();
  };
  document.addEventListener("click", (event) => {
    const button = event.target.closest("[data-preview-design]");
    if (!button) return;
    designs = [...document.querySelectorAll("#work-grid [data-preview-design]")].map((card) => projects.find((project) => project.id === card.dataset.previewDesign)).filter(Boolean);
    index = designs.findIndex((project) => project.id === button.dataset.previewDesign);
    if (index < 0) return;
    show(index);
    dialog.showModal();
    const cursor = document.querySelector(".cursor");
    if (cursor) { cursorHome = document.createComment("Preview cursor home"); cursor.before(cursorHome); dialog.append(cursor); }
  });
  dialog.addEventListener("close", () => {
    const cursor = dialog.querySelector(".cursor");
    if (cursor && cursorHome) cursorHome.replaceWith(cursor);
    cursorHome = null;
    pointer = null;
  });
  dialog.querySelector("[data-add-design]").addEventListener("click", () => addToCart(designs[index]));
  dialog.querySelector("[data-download-image]").addEventListener("click", () => downloadDesign(designs[index]));
  dialog.querySelector("[data-viewer-close]").addEventListener("click", () => dialog.close());
  dialog.querySelector("[data-viewer-previous]").addEventListener("click", () => show(index - 1));
  dialog.querySelector("[data-viewer-next]").addEventListener("click", () => show(index + 1));
  dialog.addEventListener("keydown", (event) => {
    if (!["ArrowLeft", "ArrowRight"].includes(event.key)) return;
    event.preventDefault(); show(index + (event.key === "ArrowRight" ? 1 : -1));
  });
  const frame = dialog.querySelector(".wallpaper-viewer-frame");
  frame.addEventListener("contextmenu", (event) => event.preventDefault());
  frame.addEventListener("dragstart", (event) => event.preventDefault());
  frame.addEventListener("pointerdown", (event) => {
    if (!event.isPrimary || event.button !== 0) return;
    pointer = { id: event.pointerId, x: event.clientX, y: event.clientY };
    frame.setPointerCapture(event.pointerId);
  });
  frame.addEventListener("pointerup", (event) => {
    if (!pointer || pointer.id !== event.pointerId) return;
    const dx = event.clientX - pointer.x, dy = event.clientY - pointer.y;
    pointer = null;
    if (frame.hasPointerCapture(event.pointerId)) frame.releasePointerCapture(event.pointerId);
    if (Math.abs(dx) > 40 && Math.abs(dx) > Math.abs(dy)) show(index + (dx < 0 ? 1 : -1));
  });
  frame.addEventListener("pointercancel", () => { pointer = null; });
  frame.addEventListener("lostpointercapture", () => { pointer = null; });
}
