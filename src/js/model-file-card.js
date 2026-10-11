import { matchingSourceFiles, shopFormats } from './shop-catalogue.js';
import maxLogo from '../assets/format-logos/max.svg';
import cinemaLogo from '../assets/format-logos/cinema4d.png';
import blenderLogo from '../assets/format-logos/blender.svg';
import unrealLogo from '../assets/format-logos/unreal.svg';
import fbxLogo from '../assets/format-logos/fbx.svg';
import materialsLogo from '../assets/format-logos/materials.svg';
import stlLogo from '../assets/format-logos/stl.svg';
import autocadLogo from '../assets/format-logos/autocad.svg';
import sketchupLogo from '../assets/format-logos/sketchup.svg';
import '../css/model-file-card.css';

const logos = { max: maxLogo, c4d: cinemaLogo, blend: blenderLogo, unreal: unrealLogo, 'fbx-obj': fbxLogo, materials: materialsLogo, stl: stlLogo, autocad: autocadLogo, sketchup: sketchupLogo };
const labels = { max: '3DS Max', c4d: 'Cinema 4D', blend: 'Blender', uproject: 'Unreal Project', uasset: 'Unreal Asset', fbx: 'FBX', obj: 'OBJ', mat: 'Material', matlib: 'Material Library', sbsar: 'Substance Material', stl: 'STL', dwg: 'AutoCAD', dxf: 'AutoCAD DXF', skp: 'SketchUp' };

export function modelPackageDetails(project) {
  const files = matchingSourceFiles(project);
  const supported = new Set(shopFormats.flatMap(format => format.extensions));
  const extensions = [...new Set(files.flatMap(file => {
    const extension = file.name.split('.').pop().toLowerCase();
    return ['zip', 'rar'].includes(extension) ? file.formats || [] : [extension];
  }))].filter(extension => supported.has(extension));
  return { files, extensions };
}

export function renderModelFileCard(card, project) {
  card.replaceChildren();
  card.hidden = project.workType !== '3d';
  if (card.hidden) return;
  const { files, extensions } = modelPackageDetails(project);
  const kicker = document.createElement('p'); kicker.className = 'model-file-kicker'; kicker.textContent = 'FILE DETAILS';
  const title = document.createElement('h3'); title.textContent = 'Included formats';
  const formats = document.createElement('div'); formats.className = 'model-file-formats';
  for (const extension of extensions) {
    const format = shopFormats.find(format => format.extensions.includes(extension));
    const tile = document.createElement('div'); tile.className = 'model-file-format';
    const icon = document.createElement('img'); icon.src = logos[format.id]; icon.alt = ''; icon.width = 48; icon.height = 48; icon.draggable = false;
    const name = document.createElement('strong'); name.textContent = labels[extension];
    const type = document.createElement('span'); type.textContent = `.${extension}`;
    tile.append(icon, name, type); formats.append(tile);
  }
  card.append(kicker, title, formats);
  if (!files.length) {
    const note = document.createElement('p'); note.className = 'model-file-note'; note.textContent = 'Image preview only. No downloadable model file is listed for this design.';
    card.append(note); return;
  }
  const label = document.createElement('h4'); label.textContent = files.length === 1 ? 'Download package' : 'Download packages';
  const list = document.createElement('ul'); list.className = 'model-file-packages';
  for (const file of files) {
    const row = document.createElement('li');
    const type = document.createElement('span'); type.className = 'model-file-extension'; type.textContent = file.name.split('.').pop().toUpperCase();
    const name = document.createElement('span'); name.textContent = file.name;
    const details = document.createElement('div'); details.className = 'model-file-package-details';
    details.append(name);
    if (file.contents?.length) {
      const heading = document.createElement('p'); heading.className = 'model-file-contents-label'; heading.textContent = 'Files inside';
      const contents = document.createElement('ul'); contents.className = 'model-file-contents';
      const paths = file.contents.map(entry => entry.replaceAll('\\', '/'));
      const supported = new Set(shopFormats.flatMap(format => format.extensions));
      const entries = paths.filter(entry => !entry.endsWith('/') && !paths.some(other => other.startsWith(`${entry}/`)))
        .sort((a, b) => Number(supported.has(b.split('.').pop().toLowerCase())) - Number(supported.has(a.split('.').pop().toLowerCase())));
      for (const entry of entries) {
        const item = document.createElement('li');
        item.textContent = entry.replaceAll('\\', '/').split('/').pop();
        item.title = entry;
        contents.append(item);
      }
      details.append(heading, contents);
    }
    row.append(type, details); list.append(row);
  }
  const note = document.createElement('p'); note.className = 'model-file-note'; note.textContent = 'Use the download button below to download this model.';
  card.append(label, list, note);
}
