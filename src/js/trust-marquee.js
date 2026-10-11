// CSS handles movement; the observer stops invisible strips using no frame loop.
if ('IntersectionObserver' in window) {
  const observer = new IntersectionObserver(entries => {
    for (const entry of entries) entry.target.classList.toggle('trust-paused', !entry.isIntersecting);
  });
  document.querySelectorAll('.trust-bar').forEach(bar => observer.observe(bar));
}
