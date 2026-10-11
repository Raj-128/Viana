// Local display control; plan allowances and access checks remain unchanged.
const grid = document.getElementById('plan-comparison-grid');
const toggle = document.getElementById('toggle-format-details');
if (grid && toggle) {
  grid.dataset.formatDetails = 'expanded';
  toggle.setAttribute('aria-expanded', 'true');
  toggle.textContent = 'Hide format limits';
  toggle.addEventListener('click', () => {
    const expanded = toggle.getAttribute('aria-expanded') !== 'true';
    toggle.setAttribute('aria-expanded', String(expanded));
    grid.dataset.formatDetails = expanded ? 'expanded' : 'collapsed';
    toggle.textContent = expanded ? 'Hide format limits' : 'Show all format limits';
  });
  document.getElementById('plans-compare-tools').hidden = false;
}
