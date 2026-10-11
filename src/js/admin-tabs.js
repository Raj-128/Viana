export function initAdminTabs(root = document, onSelect = () => {}) {
  const tabs = [...root.querySelectorAll('[data-admin-tab]')];
  const panels = [...root.querySelectorAll('[data-admin-panel]')];
  function select(tab, focus = false) {
    tabs.forEach(item => {
      const active = item === tab;
      item.setAttribute('aria-selected', String(active));
      item.tabIndex = active ? 0 : -1;
    });
    panels.forEach(panel => { panel.hidden = panel.dataset.adminPanel !== tab.dataset.adminTab; });
    if (focus) tab.focus();
    onSelect(tab.dataset.adminTab);
  }
  tabs.forEach((tab, index) => {
    tab.addEventListener('click', () => select(tab));
    tab.addEventListener('keydown', event => {
      const next = { ArrowRight: (index + 1) % tabs.length, ArrowLeft: (index + tabs.length - 1) % tabs.length, Home: 0, End: tabs.length - 1 }[event.key];
      if (next === undefined) return;
      event.preventDefault(); select(tabs[next], true);
    });
  });
  if (tabs.length) select(tabs.find(tab => tab.dataset.adminTab === 'login') || tabs[0]);
}
