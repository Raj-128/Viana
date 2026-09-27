import { projects } from './projects.js';
import { selectHeroDesigns } from './hero-designs.js';
import { corridorFrames, corridorTransform, galleryFrames, galleryTransform } from './hero-motion.js';
import '../css/image-stream-hero.css';

const hero = document.querySelector('[data-image-stream-hero]');
if (hero) {
  const style = document.createElement('style');
  style.textContent = corridorFrames(1, 'stream-right') + corridorFrames(-1, 'stream-left') + galleryFrames();
  hero.append(style);

  const collections = {
    wallpaper: selectHeroDesigns(projects.filter(project => project.heroCover)),
    '3d': projects.filter(project => project.workType === '3d'),
  };
  const stages = [...hero.querySelectorAll('[data-stream-mode]')];
  let renderedMode;
  let renderedCount;
  function renderStream() {
    const mode = document.documentElement.dataset.studioMode === '3d' ? '3d' : 'wallpaper';
    const count = 9;
    if (mode === renderedMode && count === renderedCount) return;
    renderedMode = mode;
    renderedCount = count;
    // Only mount the selected collection: hidden cards need neither images
    // nor animation layers. Theme changes also release the previous rail.
    for (const stage of stages) stage.replaceChildren();
    const stage = stages.find(stage => stage.dataset.streamMode === mode);
    if (!stage) return;
    const designs = collections[stage.dataset.streamMode];
    if (!designs.length) return;
    const rail = document.createElement('div');
    rail.className = 'image-stream-rail';
    stage.style.setProperty('--stream-count', String(count));
    const directions = mode === '3d' ? ['gallery'] : ['right', 'left'];
    const duration = mode === '3d' ? 32 : 24;
    for (const direction of directions) {
      for (let index = 0; index < count; index++) {
        const offset = direction === 'left' ? count : 0;
        const design = designs[(offset + index) % designs.length];
        const slot = document.createElement('div');
        slot.className = 'image-stream-slot';
        const progress = (index + .5) / count;
        slot.style.animationName = `stream-${direction}`;
        slot.style.animationDuration = `${duration}s`;
        slot.style.animationDelay = `${-progress * duration}s`;
        slot.style.transform = mode === '3d' ? galleryTransform(progress)
          : corridorTransform(progress, direction === 'right' ? 1 : -1);
        const card = document.createElement('a');
        card.className = 'image-stream-card';
        card.href = `project.html?id=${encodeURIComponent(design.id)}`;
        card.setAttribute('aria-label', `View ${design.title}`);
        card.draggable = false;
        const surface = document.createElement('span');
        surface.className = 'image-stream-surface';
        const image = document.createElement('img');
        image.src = design.heroCover || design.cover;
        image.alt = '';
        image.draggable = false;
        image.decoding = 'async';
        surface.append(image);
        card.append(surface);
        slot.append(card);
        rail.append(slot);
      }
    }
    stage.append(rail);
  }
  renderStream();
  const themeObserver = new MutationObserver(renderStream);
  themeObserver.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ['data-studio-mode'],
  });

  // Avoid rendering the animation when the hero is outside the viewport.
  const observer = new IntersectionObserver(([entry]) => {
    hero.classList.toggle('stream-offscreen', !entry.isIntersecting);
  });
  observer.observe(hero);
  const syncVisibility = () => hero.classList.toggle('stream-background', document.hidden);
  document.addEventListener('visibilitychange', syncVisibility);
  syncVisibility();
}
