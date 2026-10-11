import '../css/shop-categories.css';
import { shopFormats, countShopFormats } from './shop-catalogue.js';
import { authReady, isAdminSession } from './auth.js';
import { projects } from './projects.js';
import maxLogo from '../assets/format-logos/max.svg';
import cinemaLogo from '../assets/format-logos/cinema4d.png';
import blenderLogo from '../assets/format-logos/blender.svg';
import unrealLogo from '../assets/format-logos/unreal.svg';
import fbxLogo from '../assets/format-logos/fbx.svg';
import materialsLogo from '../assets/format-logos/materials.svg';
import stlLogo from '../assets/format-logos/stl.svg';
import autocadLogo from '../assets/format-logos/autocad.svg';
import sketchupLogo from '../assets/format-logos/sketchup.svg';

const logos = { max: maxLogo, c4d: cinemaLogo, blend: blenderLogo, unreal: unrealLogo, 'fbx-obj': fbxLogo, materials: materialsLogo, stl: stlLogo, autocad: autocadLogo, sketchup: sketchupLogo };

const root = document.getElementById('shop-formats');
if (root) {
  const counters = [];
  shopFormats.forEach((item) => {
    const element = document.createElement('a');
    element.className = 'shop-format';
    element.dataset.format = item.id;
    element.href = 'work.html?mode=3d&format=' + encodeURIComponent(item.id) + '#catalogue';
    element.setAttribute('aria-label', 'Browse ' + item.label + ' files');
    const mark = document.createElement('img');
    mark.className = 'shop-format-mark shop-mark-' + item.id;
    mark.src = logos[item.id]; mark.alt = ''; mark.width = 88; mark.height = 88;
    mark.draggable = false;
    mark.loading = 'lazy'; mark.decoding = 'async';
    const icon = document.createElement('span');
    icon.className = 'shop-format-icon';
    icon.append(mark);
    const label = document.createElement('strong'); label.textContent = item.label;
    const count = document.createElement('small');
    count.className = 'shop-format-count';
    const copy = document.createElement('span'); copy.className = 'shop-format-copy';
    copy.append(label, count);
    const arrow = document.createElement('span'); arrow.className = 'shop-format-arrow';
    arrow.textContent = '↗'; arrow.setAttribute('aria-hidden', 'true');
    element.append(icon, copy, arrow);
    const breakdown = item.id === 'fbx-obj' ? document.createElement('small') : null;
    if (breakdown) {
      breakdown.className = 'shop-format-breakdown';
      copy.append(breakdown);
    }
    counters.push({ item, element, count, breakdown });
    root.append(element);
  });
  function updateCounts() {
    const counts = countShopFormats(projects);
    const admin = isAdminSession();
    const note = document.querySelector('.shop-count-note');
    if (note) note.hidden = !admin;
    counters.forEach(({ item, element, count, breakdown }) => {
      const total = counts[item.id];
      count.textContent = total ? `${total.toLocaleString('en-IN')} ${total === 1 ? 'asset' : 'assets'}` : 'Not available yet';
      element.dataset.available = String(total > 0);
      count.hidden = !admin;
      if (!admin) count.textContent = '';
      element.setAttribute('aria-label', 'Browse ' + item.label + (admin ? ': ' + count.textContent : ' assets'));
      if (breakdown) breakdown.hidden = !admin || !total;
      if (breakdown) breakdown.textContent = `FBX: ${counts.fbx.toLocaleString('en-IN')} · OBJ: ${counts.obj.toLocaleString('en-IN')}`;
    });
  }
  updateCounts();
  authReady.then(updateCounts);
  window.addEventListener('studio:auth-change', updateCounts);
  window.addEventListener('studio:model-catalogue-updated', updateCounts);
}
