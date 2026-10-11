// Precompute the studio corridor once; the browser runs the animation.
// No pointer listeners or JavaScript frame loop are needed.
export function corridorTransform(progress, direction) {
  const scale = (2.6 / 25) * Math.pow(46 / 2.6, progress);
  const rail = 44 - 55 * Math.pow(1 - progress, 3.3);
  return `translate3d(${(direction * rail * scale).toFixed(5)}cqw,0,0) scale(${scale.toFixed(5)}) perspective(100cqw) rotateY(${(-direction * (6 + 22 * progress)).toFixed(3)}deg)`;
}

export function galleryTransform(progress) {
  return `translate3d(calc(var(--gallery-span) * ${(.5 - progress).toFixed(5)}),0,0) scale(${(.94 + .06 * Math.sin(Math.PI * progress)).toFixed(5)})`;
}

export function heroFrames() {
  const frames = (name, transform, depth = false) => `@keyframes ${name}{${Array.from({ length: 25 }, (_, index) => {
    const p = index / 24;
    return `${p * 100}%{transform:${transform(p)}${depth ? `;z-index:${Math.round(p * 100) + 1}` : ''}}`;
  }).join('')}}`;
  return frames('stream-right', p => corridorTransform(p, 1), true) +
    frames('stream-left', p => corridorTransform(p, -1), true) + frames('stream-gallery', galleryTransform);
}
