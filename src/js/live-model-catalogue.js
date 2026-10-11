import { createVisibleRefresh } from './visible-refresh.js';
import { fetchApi } from './api-config.js';
import { projects } from './projects.js';

let revision = '', pending;
export function refreshModelCatalogue() {
  if (pending) return pending;
  pending = (async () => {
    try {
      const response = await fetchApi(`/api/model-catalogue?revision=${encodeURIComponent(revision)}`, { signal: AbortSignal.timeout(10000) });
      if (response.status === 204) return true;
      if (!response.ok) return false;
      const data = await response.json();
      if (!Array.isArray(data.projects)) return false;
      const incoming = data.projects.filter(project => /^model-[a-f0-9]{24}$/.test(project.id) && project.workType === '3d' && /^data:image\/webp;base64,[A-Za-z0-9+/=]+$/.test(project.cover));
      const existing = new Map(projects.map((project, index) => [project.id, index]));
      for (const project of incoming) {
        if (existing.has(project.id)) projects[existing.get(project.id)] = project;
        else projects.push(project);
      }
      revision = data.revision || '';
      if (incoming.length) window.dispatchEvent(new Event('studio:model-catalogue-updated'));
      return true;
    } catch { return false; }
    finally { pending = null; }
  })();
  return pending;
}
export function watchModelCatalogue() {
  const updates = createVisibleRefresh(refreshModelCatalogue, {
    interval: 300000, minInterval: 60000,
    enabled: () => document.documentElement.dataset.studioMode === '3d',
  });
  new MutationObserver(() => { void updates.refresh(); }).observe(document.documentElement, { attributes: true, attributeFilter: ['data-studio-mode'] });
  void updates.refresh();
}
