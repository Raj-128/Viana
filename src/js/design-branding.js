import '../css/design-branding.css';

export function designCode(project) {
  if (project.code) return String(project.code);
  const id = String(project.id);
  const hex = id.match(/(?:model-|wallpaper-)([a-f0-9]{8,})$/i)?.[1];
  let hash = 2166136261;
  for (const character of id) hash = Math.imul(hash ^ character.charCodeAt(0), 16777619);
  return `SV-${project.workType === '3d' ? '3D' : 'WP'}-${hex ? hex.slice(0, 8).toUpperCase() : (hash >>> 0).toString(16).padStart(8, '0').toUpperCase()}`;
}

export function brandDesignImage(container, project) {
  if (!container || !project) return;
  container.classList.add('design-image');
  container.classList.toggle('design-image-model', project.workType === '3d');
  let mark = container.querySelector(':scope > .design-image-brand');
  if (!mark) {
    mark = document.createElement('span');
    mark.className = 'design-image-brand';
    const code = document.createElement('span');
    code.className = 'design-image-code';
    const logo = document.createElement('img');
    logo.src = new URL('../generated/site-media/flower.webp', import.meta.url).href;
    logo.alt = 'Studio Viana';
    logo.width = 32; logo.height = 32; logo.draggable = false;
    mark.append(code, logo);
    container.append(mark);
  }
  mark.querySelector('.design-image-code').textContent = designCode(project);
}
