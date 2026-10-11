import { basename, extname } from 'node:path';

export const cleanText = value => String(value || '').replace(/[<>"'`]/g, '').replace(/[_]+/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 180);
export const pairingKey = name => name.replace(/\.(jpg|jpeg|png|webp|rar|zip|7z|max|fbx|obj|blend|skp|dwg|dxf)$/i, '').replace(/(?:image|preview|render)$/i, '').replace(/[\s_-]/g, '').toLowerCase();
export function archiveTitle(entries, fallback) {
  const branded = entries.map(name => name.split(/[\\/]/)[0]).find(name => /^Pro 3DSky - /i.test(name));
  const model = entries.find(name => /\.(max|fbx|obj|skp|blend|dwg)$/i.test(name));
  return cleanText((branded?.replace(/^Pro 3DSky - /i, '') || (model && basename(model, extname(model))) || fallback)
    .replace(/(?:[-_ ](?:corona|vray|v-ray|fbx|obj|20\d{2}))+.*$/i, '').replace(/-#3DDD3DSKY.*$/i, '').replace(/[-_]+/g, ' '));
}

// Product names take precedence over the source folder: a chair inside a
// console folder is still a chair. Styles without evidence remain unclassified.
export function classifyModel(title, folder = '', override = {}) {
  const name = title.toLowerCase(), source = folder.toLowerCase();
  let collection = 'interior', category = 'decoration', itemType = 'decorative object';
  const rules = [
    [/street lamp|outdoor light/, 'exterior lighting', 'street light', 'exterior'],
    [/wall lamp|sconce|wall light/, 'lighting', 'wall light'],
    [/floor lamp/, 'lighting', 'floor lamp'],
    [/table lamp|desk lamp|work light/, 'lighting', 'table lamp'],
    [/spotlight|spot light|track light/, 'lighting', 'spotlight'],
    [/chandelier/, 'lighting', 'chandelier'],
    [/pendant|suspended light|lantern|lampshade/, 'lighting', 'pendant light'],
    [/ceiling light/, 'lighting', 'ceiling light'],
    [/ceiling fan/, 'electronics', 'ceiling fan'],
    [/coffee table/, 'furniture', 'coffee table'],
    [/dressing|vanity|makeup/, 'furniture', 'dressing table'],
    [/desk|office set/, 'office', 'desk'],
    [/dining set|dinning set/, 'furniture', 'dining set'],
    [/dining table/, 'furniture', 'dining table'],
    [/console table|console$/, 'furniture', 'console table'],
    [/tv cabinet|tv console/, 'furniture', 'tv console'],
    [/bean bag/, 'furniture', 'bean bag chair'],
    [/office chair|vitra id air/, 'office', 'office chair'],
    [/bar stool/, 'furniture', 'bar stool'],
    [/armchair|lounge chair/, 'furniture', 'armchair'],
    [/chair/, 'furniture', 'chair'],
    [/bench/, 'furniture', 'bench'],
    [/daybed|couch/, 'furniture', 'daybed'],
    [/sofa|sectional/, 'furniture', 'sofa'],
    [/bed/, 'furniture', 'bed'],
    [/bathtub/, 'bathroom', 'bathtub'],
    [/\bwc\b|toilet/, 'bathroom', 'toilet and bidet'],
    [/roman blind|roman curtain/, 'decoration', 'roman blind'],
    [/curtain/, 'decoration', 'curtain'],
    [/door/, 'interior architecture', 'door'],
    [/clock/, 'decoration', 'wall clock'],
    [/paving/, 'paving', 'paving tiles', 'exterior'],
    [/parquet|wood floor|flooring/, 'interior materials', 'wood flooring'],
    [/wall.*panel|wood panel|decorative wall/, 'interior architecture', 'wall panel'],
    [/facade stone/, 'facade', 'stone cladding', 'exterior'],
    [/porcelain|ceramic tile|caesar.*tile/, 'interior materials', 'tiles'],
    [/marble|travertine|sandstone/, 'interior materials', 'stone material'],
    [/plaster|concrete material/, 'interior materials', 'plaster and concrete'],
    [/lawn|grass/, 'landscape', 'grass', 'exterior'],
    [/pinus|platanus|oak.*tree|topiary/, 'landscape', 'tree', 'exterior'],
    [/outdoor plant/, 'garden', 'outdoor plants', 'exterior'],
    [/plant|strelitzia/, 'decoration', 'indoor plants'],
    [/audi|volvo|mini clubman|car\b/, 'transport', 'car', 'exterior'],
    [/macrame/, 'decoration', 'macrame wall hanging'],
    [/picture|photo frame|painting|art line/, 'decoration', 'wall art'],
    [/monkey|giraffe|sculpture/, 'decoration', 'sculpture'],
  ];
  const rule = rules.find(([pattern]) => pattern.test(name));
  if (rule) [, category, itemType, collection = 'interior'] = rule;
  else if (/light|lamp/.test(source)) { category = 'lighting'; itemType = 'light'; }
  else if (/sofa|chair|bed|concole|dinning/.test(source)) { category = 'furniture'; itemType = /bed/.test(source) ? 'bed' : /sofa/.test(source) ? 'sofa' : /chair/.test(source) ? 'chair' : 'table'; }
  else if (/texture|floor/.test(source)) { category = 'interior materials'; itemType = 'surface material'; }
  else if (/planter/.test(source)) itemType = 'indoor plants';
  let theme = '';
  for (const [pattern, style] of [[/art deco/, 'art deco'], [/classic/, 'classic'], [/loft|industrial|urban/, 'urban'], [/nordic|scandinav/, 'scandinavian'], [/rattan|raffia|macrame/, 'bohemian'], [/modern|contemporary/, 'modern']]) {
    if (pattern.test(name + ' ' + source)) { theme = style; break; }
  }
  const result = { title, collection, category, itemType, theme };
  for (const key of ['title', 'collection', 'category', 'itemType', 'theme']) {
    result[key] = cleanText(typeof override[key] === 'string' ? override[key] : result[key]);
  }
  return result;
}
