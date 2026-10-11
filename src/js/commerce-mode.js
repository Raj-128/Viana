export function filterCommerceEntries(entries, projects, mode, idKey = 'id') {
  const ids = new Set(projects.filter(project => project.workType === mode).map(project => project.id));
  return entries.filter(entry => ids.has(entry[idKey]));
}
