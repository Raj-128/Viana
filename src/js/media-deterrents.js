// Browser-side deterrents only. They cannot block OS capture, extensions or direct asset requests.
export function isArtworkTarget(target) {
  const element = target?.closest ? target : target?.parentElement;
  if (element?.closest?.('input, textarea, select, [contenteditable]:not([contenteditable="false"])')) return false;
  return Boolean(element?.closest?.('img, .image-stream-card, .hero-slide, .protected-media-block, .wallpaper-viewer-artwork, .catalogue-card-image, .hero-carousel-stage, .project-gallery-item, .preview-frame, .marquee-row, .showcase-item, .strip-img'));
}

export function initMediaDeterrents() {
  const root = document.documentElement;
  if (root.dataset.mediaDeterrents === "ready") return;
  root.dataset.mediaDeterrents = "ready";
  // Cover blank page areas and text as well as artwork. Keep native editing menus.
  document.addEventListener('contextmenu', event => {
    const element = event.target?.closest ? event.target : event.target?.parentElement;
    if (!element?.closest?.('input, textarea, select, [contenteditable]:not([contenteditable="false"])')) {
      event.preventDefault();
    }
  }, true);
  // Delegation also covers catalogue images inserted after filtering or Load more.
  for (const type of ['dragstart', 'selectstart']) {
    document.addEventListener(type, event => {
      if (isArtworkTarget(event.target)) event.preventDefault();
    });
  }
  let captureDetected = false;
  let printing = false;
  let captureTimer;
  const update = () => root.classList.toggle("artwork-concealed",
    document.hidden || !document.hasFocus() || printing || captureDetected);
  const brieflyConceal = () => {
    captureDetected = true;
    clearTimeout(captureTimer);
    update();
    captureTimer = setTimeout(() => { captureDetected = false; update(); }, 1500);
  };
  window.addEventListener("blur", update);
  window.addEventListener("focus", update);
  document.addEventListener("visibilitychange", update);
  window.addEventListener("beforeprint", () => { printing = true; update(); });
  window.addEventListener("afterprint", () => { printing = false; update(); });
  const captureShortcut = event => {
    const key = event.key.toLowerCase();
    return key === 'printscreen' || (event.metaKey && event.shiftKey && ['s', '3', '4', '5'].includes(key));
  };
  document.addEventListener("keydown", (event) => {
    const key = event.key.toLowerCase();
    if (captureShortcut(event)) { brieflyConceal(); return; }
    // Retain normal text editing, clipboard use and password entry.
    if (event.target?.closest?.('input, textarea, select, [contenteditable]:not([contenteditable="false"])')) return;
    const command = event.ctrlKey || event.metaKey;
    const inspect = (event.ctrlKey && event.shiftKey) || (event.metaKey && event.altKey);
    if ((command && ["s", "u"].includes(key)) || key === "f12" || (inspect && ["i", "j", "c"].includes(key))) {
      event.preventDefault();
    }
  }, true);
  document.addEventListener("keyup", (event) => {
    // Some browsers expose only keyup for this OS-reserved key, after capture may already have happened.
    if (captureShortcut(event)) brieflyConceal();
  }, true);
  update();
}

export function addViewerWatermarks(user) {
  const reference = String(user?.id || '').replace(/[^a-z0-9-]/gi, '').slice(-8);
  const label = reference ? `STUDIO VIANA · Viewer ${reference}` : 'STUDIO VIANA · Preview';
  document.querySelectorAll('.project-hero-shell, .project-gallery-item, .project-preview-frame, .wallpaper-viewer-artwork').forEach(container => {
    if (container.querySelector('.viewer-session-mark')) return;
    const overlay = document.createElement('div');
    overlay.className = 'viewer-session-mark'; overlay.setAttribute('aria-hidden', 'true');
    for (let i = 0; i < 3; i++) {
      const line = document.createElement('span'); line.textContent = label; overlay.append(line);
    }
    container.append(overlay);
  });
}
