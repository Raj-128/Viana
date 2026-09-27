// Project the reference corridor onto the screen before painting each card.
// Cards retain the same depth curve without intersecting in a shared 3D scene.
export function corridorPose(progress, direction) {
  const scale = (2.6 / 25) * Math.pow(46 / 2.6, progress);
  const rail = 44 - 55 * Math.pow(1 - progress, 3.3);
  const turn = -direction * (6 + 22 * progress);
  return { x: direction * rail * scale, scale, turn, order: Math.round(progress * 100) + 1 };
}

export function corridorTransform(progress, direction) {
  const { x, scale, turn } = corridorPose(progress, direction);
  return `translate3d(${x.toFixed(5)}cqw,0,0) scale(${scale.toFixed(5)}) perspective(100cqw) rotateY(${turn.toFixed(3)}deg)`;
}

export function corridorFrames(direction, name) {
  const steps = Array.from({ length: 49 }, (_, index) => {
    const progress = index / 48;
    return `${progress * 100}%{transform:${corridorTransform(progress, direction)};z-index:${corridorPose(progress, direction).order}}`;
  });
  return `@keyframes ${name}{${steps.join('')}}`;
}

export function galleryTransform(progress) {
  const position = .5 - progress;
  const scale = .94 + .06 * Math.sin(Math.PI * progress);
  const turn = -12 + 24 * progress;
  return `translate3d(calc(var(--gallery-span) * ${position.toFixed(5)}),0,0) scale(${scale.toFixed(5)}) perspective(1100px) rotateY(${turn.toFixed(3)}deg)`;
}

export function galleryFrames() {
  const steps = Array.from({ length: 25 }, (_, index) => {
    const progress = index / 24;
    return `${progress * 100}%{transform:${galleryTransform(progress)}}`;
  });
  return `@keyframes stream-gallery{${steps.join('')}}`;
}
