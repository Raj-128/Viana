let catalogue;
let version = 0;
let lastSignature;
const loadCatalogue = () => catalogue ||= import('./projects.js').then(module => module.projects).catch(error => { catalogue = null; throw error; });

export async function renderRecentDownloads(entries = [], { signedIn = true } = {}) {
  const host = document.getElementById('recent-downloads-list');
  const status = document.getElementById('recent-downloads-status');
  if (!host || !status) return;
  const signature = JSON.stringify([signedIn, entries]);
  if (signature === lastSignature) return;
  const current = ++version;
  lastSignature = signature;
  host.replaceChildren();
  if (!signedIn) { status.textContent = 'Sign in to see your download history.'; return; }
  if (!entries.length) { status.textContent = 'No downloads recorded yet. Your next 3D download will appear here.'; return; }
  status.textContent = 'Loading your recent downloads…';
  try {
    const projects = await loadCatalogue();
    if (current !== version) return;
    for (const entry of entries) {
      const project = projects.find(project => project.id === entry.design_id && project.workType === '3d');
      const card = document.createElement('article'); card.className = 'recent-download-card';
      const link = document.createElement(project ? 'a' : 'div'); link.className = 'recent-download-link';
      if (project) link.href = `project.html?id=${encodeURIComponent(project.id)}`;
      if (project?.thumbnail || project?.cover) {
        const image = document.createElement('img'); image.src = project.thumbnail || project.cover;
        image.alt = project.title; image.loading = 'lazy'; image.width = 320; image.height = 220;
        image.addEventListener('error', () => { image.hidden = true; }, { once: true });
        link.append(image);
      } else {
        const placeholder = document.createElement('div'); placeholder.className = 'recent-download-placeholder'; placeholder.textContent = '3D FILE'; link.append(placeholder);
      }
      const info = document.createElement('div'); info.className = 'recent-download-info';
      const title = document.createElement('h3'); title.textContent = project?.title || entry.file_name;
      const filename = document.createElement('p'); filename.textContent = entry.file_name;
      const time = document.createElement('time'); time.dateTime = new Date(entry.downloaded_at).toISOString();
      time.textContent = new Date(entry.downloaded_at).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
      const action = document.createElement('span'); action.className = 'recent-download-action'; action.textContent = project ? 'Open model & files ↗' : 'Model no longer in collection';
      info.append(title, filename, time, action); link.append(info); card.append(link); host.append(card);
    }
    status.textContent = '';
  } catch {
    if (current !== version) return;
    lastSignature = undefined;
    status.textContent = 'Could not load model previews. Use Refresh status to try again.';
  }
}
