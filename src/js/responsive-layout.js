// Keep content below the real header when controls wrap or the phone rotates.
export function observeHeaderSize(header, root, Observer = ResizeObserver) {
  if (!header) return;
  let previous = 0;
  const update = () => {
    const height = Math.ceil(header.getBoundingClientRect().height);
    if (height > 0 && height !== previous) {
      root.style.setProperty('--site-header-height', `${height}px`);
      previous = height;
    }
  };
  update();
  const observer = new Observer(update);
  observer.observe(header);
  return observer;
}

document.addEventListener('DOMContentLoaded', () => {
  observeHeaderSize(document.querySelector('.site-header'), document.documentElement);
});
