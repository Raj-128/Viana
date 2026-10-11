import { downloadPlans, downloadFormats } from './download-plans.js';

// Local comparison only: no API calls and no changes to purchase state.
const grid = document.getElementById('plan-comparison-grid');
const select = document.getElementById('compare-format');
const toggle = document.getElementById('toggle-format-details');
if (grid && select && toggle) {
  for (const format of downloadFormats) {
    const option = document.createElement('option');
    option.value = format.id; option.textContent = format.label;
    select.append(option);
  }
  const summaries = downloadPlans.map(plan => {
    const card = grid.querySelector(`[data-order-plan="${plan.id}"]`)?.closest('.plan-card');
    if (!card) return null;
    const summary = document.createElement('div');
    summary.className = 'plan-format-summary';
    const label = document.createElement('span'), count = document.createElement('strong');
    summary.append(label, count);
    card.querySelector('.plan-identity').after(summary);
    return { plan, label, count };
  }).filter(Boolean);
  function compare() {
    const format = downloadFormats.find(format => format.id === select.value) || downloadFormats[0];
    for (const { plan, label, count } of summaries) {
      label.textContent = `${format.label} allowance`;
      count.textContent = `${plan.formatLimits[format.id]} / day`;
    }
  }
  grid.dataset.formatDetails = 'collapsed';
  toggle.addEventListener('click', () => {
    const expanded = toggle.getAttribute('aria-expanded') !== 'true';
    toggle.setAttribute('aria-expanded', String(expanded));
    grid.dataset.formatDetails = expanded ? 'expanded' : 'collapsed';
    toggle.textContent = expanded ? 'Hide format limits −' : 'Show all format limits +';
  });
  select.addEventListener('change', compare);
  compare();
  document.getElementById('plans-compare-tools').hidden = false;
}
