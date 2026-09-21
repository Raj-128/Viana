import { projects } from './projects.js';
import { selectHeroDesigns } from './hero-designs.js';
import '../css/image-stream-hero.css';

// Equal apparent-size ratios keep the more spacious stream moving evenly.
function corridorFrames(direction, name) {
  const steps = Array.from({ length: 25 }, (_, index) => {
    const u = index / 24;
    const scale = (2.6 / 25) * Math.pow(46 / 2.6, u);
    const depth = 30 * (1 - 1 / scale);
    const rail = 44 - 55 * Math.pow(1 - u, 3.3);
    const turn = 6 + 22 * u;
    return `${u * 100}% { transform: translate3d(${direction * rail}cqw, 0, ${depth}cqw) rotateY(${-direction * turn}deg); }`;
  });
  return `@keyframes ${name} { ${steps.join('')} }`;
}

const hero = document.querySelector('[data-image-stream-hero]');
if (hero) {
  const style = document.createElement('style');
  style.textContent = corridorFrames(1, 'stream-right') + corridorFrames(-1, 'stream-left');
  hero.append(style);

  const collections = {
    wallpaper: selectHeroDesigns(projects),
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
    const directions = mode === '3d' ? ['gallery'] : ['right', 'left'];
    const duration = mode === '3d' ? 32 : 24;
    for (const direction of directions) {
      for (let index = 0; index < count; index++) {
        const offset = direction === 'left' ? count : 0;
        const design = designs[(offset + index) % designs.length];
        const card = document.createElement('a');
        card.className = 'image-stream-card';
        card.href = `project.html?id=${encodeURIComponent(design.id)}`;
        card.setAttribute('aria-label', `View ${design.title}`);
        card.draggable = false;
        card.style.animationName = `stream-${direction}`;
        card.style.animationDuration = `${duration}s`;
        card.style.animationDelay = `${-index * duration / count}s`;
        const image = document.createElement('img');
        image.src = design.cover;
        image.alt = '';
        image.draggable = false;
        image.decoding = 'async';
        card.append(image);
        rail.append(card);
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
