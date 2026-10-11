import { projects } from './projects.js';
import { selectHeroDesigns, selectRecentModels } from './hero-designs.js';
import { allowsMotion } from './motion-policy.js';
import { corridorTransform, galleryTransform, heroFrames } from './hero-projection.js';

const hero = document.querySelector('[data-image-stream-hero]');
if (hero) {
  const wide = window.matchMedia('(min-width: 801px)');
  const style = document.createElement('style');
  style.textContent = heroFrames();
  hero.append(style);
  let renderedKey;
  function render() {
    const mode = document.documentElement.dataset.studioMode === '3d' ? '3d' : 'wallpaper';
    const animated = allowsMotion() && wide.matches;
    const key = `${mode}:${animated}`;
    if (key === renderedKey) return;
    renderedKey = key;
    hero.dataset.presentation = animated ? 'corridor' : 'still';
    for (const stage of hero.querySelectorAll('[data-stream-mode]')) stage.replaceChildren();
    const stage = hero.querySelector(`[data-stream-mode="${mode}"]`);
    // Nine cards on each wallpaper rail restores the original continuous
    // corridor; five per side left visible gaps between projected cards.
    const limit = animated ? (mode === '3d' ? 6 : 18) : 3;
    const designs = mode === '3d' ? selectRecentModels(projects, limit) : selectHeroDesigns(projects.filter(project => project.heroCover), limit);
    stage.style.setProperty('--stream-count', String(designs.length));
    designs.forEach((design, index) => {
      const slot = document.createElement('div');
      slot.className = 'image-stream-slot';
      if (animated) {
        const sideCount = Math.ceil(designs.length / 2);
        const direction = index < sideCount ? 1 : -1;
        const position = mode === '3d' ? index : index % sideCount;
        const count = mode === '3d' ? designs.length : (direction === 1 ? sideCount : designs.length - sideCount);
        const progress = (position + .5) / count;
        const duration = mode === '3d' ? 36 : 30;
        slot.style.transform = mode === '3d' ? galleryTransform(progress) : corridorTransform(progress, direction);
        slot.style.animationName = mode === '3d' ? 'stream-gallery' : direction === 1 ? 'stream-right' : 'stream-left';
        slot.style.animationDuration = `${duration}s`;
        slot.style.animationDelay = `${-progress * duration}s`;
        slot.style.animationTimingFunction = 'linear';
        slot.style.animationIterationCount = 'infinite';
        slot.style.animationFillMode = 'both';
      }
      const card = document.createElement('a');
      card.className = 'image-stream-card';
      card.href = `project.html?id=${encodeURIComponent(design.id)}`;
      card.setAttribute('aria-label', `View ${design.title}`);
      card.draggable = false;
      const image = document.createElement('img');
      image.src = design.heroCover || design.thumbnail || design.cover;
      image.alt = design.title;
      image.width = 640; image.height = 800;
      image.draggable = false;
      image.decoding = 'async';
      image.fetchPriority = index === 0 ? 'high' : 'auto';
      card.append(image);
      slot.append(card);
      stage.append(slot);
    });
  }
  render();
  new MutationObserver(render).observe(document.documentElement, { attributes: true, attributeFilter: ['data-studio-mode'] });
  wide.addEventListener('change', render);
  window.addEventListener('studio:motion-change', render);
  window.addEventListener('studio:model-catalogue-updated', () => { renderedKey = undefined; render(); });
  new IntersectionObserver(([entry]) => hero.classList.toggle('stream-offscreen', !entry.isIntersecting)).observe(hero);
}
