// Browser-side deterrents only. They cannot block OS capture, extensions or direct asset requests.
export function initMediaDeterrents() {
  const root = document.documentElement;
  if (root.dataset.mediaDeterrents === "ready") return;
  root.dataset.mediaDeterrents = "ready";
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
  document.addEventListener("keydown", (event) => {
    const key = event.key.toLowerCase();
    if (key === "printscreen") { brieflyConceal(); return; }
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
    if (event.key.toLowerCase() === "printscreen") brieflyConceal();
  }, true);
  update();
}
