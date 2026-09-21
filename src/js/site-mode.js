import "../css/site-mode.css";

export const MODE_KEY = "studioMode";
export function readStudioMode(storage) {
  try { return (storage ?? localStorage).getItem(MODE_KEY) === "3d" ? "3d" : "wallpaper"; }
  catch { return "wallpaper"; }
}
export function applyStudioTheme(mode) {
  const next = mode === "3d" ? "3d" : "wallpaper";
  document.documentElement.dataset.studioMode = next;
  document.body?.classList.toggle("mode-3d", next === "3d");
  document.body?.classList.toggle("mode-wallpaper", next === "wallpaper");
  return next;
}
applyStudioTheme(readStudioMode());
window.addEventListener("pageshow", () => applyStudioTheme(readStudioMode()));
window.addEventListener("storage", (event) => {
  if (!event.key || event.key === MODE_KEY) applyStudioTheme(readStudioMode());
});
