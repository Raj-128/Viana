export const shopFormats = [
  { id: 'max', label: '3DS MAX', extensions: ['max'] },
  { id: 'c4d', label: 'Cinema 4D', extensions: ['c4d'] },
  { id: 'blend', label: 'Blender', extensions: ['blend'] },
  { id: 'unreal', label: 'Unreal', extensions: ['uproject', 'uasset'] },
  { id: 'fbx-obj', label: 'FBX / OBJ', extensions: ['fbx', 'obj'] },
  { id: 'materials', label: 'Archmaterials', extensions: ['mat', 'matlib', 'sbsar'] },
  { id: 'stl', label: 'STL Files', extensions: ['stl'] },
  { id: 'autocad', label: 'AutoCAD', extensions: ['dwg', 'dxf'] },
  { id: 'sketchup', label: 'SketchUp', extensions: ['skp'] },
];

// Only explicit source files qualify. A rendered JPG/WebP is never a 3D file.
// Add files as { name: 'scene.blend', url: '/authorized-download-endpoint' }.
export function matchingSourceFiles(project, format = '') {
  const allowed = shopFormats.find((item) => item.id === format)?.extensions;
  if (format && !allowed) return [];
  return (project.sourceFiles || []).filter((file) => {
    if (!file.name || !file.url || !/^(\/[^/]|https?:\/\/)/i.test(file.url)) return false;
    const extension = file.name.split('.').pop().toLowerCase();
    if (['rar', 'zip'].includes(extension) && Array.isArray(file.formats)) {
      return file.formats.some((format) => (allowed || shopFormats.flatMap((item) => item.extensions)).includes(format));
    }
    return (allowed || shopFormats.flatMap((item) => item.extensions)).includes(extension);
  });
}

export function filterShopProjects(projects, { format = '', category = 'all' } = {}) {
  return projects.filter((project) => project.workType === '3d')
    .filter((project) => !format || matchingSourceFiles(project, format).length > 0)
    .filter((project) => {
      if (category === 'all') return true;
      if (category === 'best-selling') return project.bestSeller === true;
      if (category === 'free') return project.price === 0 && matchingSourceFiles(project, format).length > 0;
      if (category === 'best-prices') return Number.isFinite(project.price) && project.price > 0;
      if (category === 'collections') return Boolean(project.collection);
      return (project.shopCategories || []).includes(category);
    })
    .sort((a, b) => category === 'best-prices' ? a.price - b.price : 0);
}

// Count each downloadable model once per format, even when its package has
// several renderer variants or both FBX and OBJ files.
export function countShopFormats(projects) {
  const counts = Object.fromEntries(shopFormats.map(format => [format.id,
    filterShopProjects(projects, { format: format.id }).length]));
  for (const extension of ['fbx', 'obj']) {
    counts[extension] = projects.filter(project => project.workType === '3d' &&
      matchingSourceFiles(project, 'fbx-obj').some(file => {
        const type = file.name.split('.').pop().toLowerCase();
        return ['rar', 'zip'].includes(type) ? file.formats.includes(extension) : type === extension;
      })).length;
  }
  return counts;
}
