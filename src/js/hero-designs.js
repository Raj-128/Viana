// Rotate through collections and skip duplicate artwork across both rails.
export function selectHeroDesigns(projects, limit = 18) {
  const groups = new Map();
  for (const project of projects) {
    if (project.workType !== 'wallpaper') continue;
    const collection = project.collection || 'Studio Viana';
    if (!groups.has(collection)) groups.set(collection, []);
    groups.get(collection).push(project);
  }
  const selected = [], seen = new Set();
  const queues = [...groups.values()];
  while (selected.length < limit && queues.some(group => group.length)) {
    for (const group of queues) {
      let project;
      do { project = group.shift(); } while (project && seen.has(project.cover));
      if (!project) continue;
      seen.add(project.cover);
      selected.push(project);
      if (selected.length === limit) break;
    }
  }
  return selected;
}
