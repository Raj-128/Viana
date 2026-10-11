// Hardware hints are conservative heuristics, never an authorization signal.
export function motionLevel({ reduced = false, saveData = false, cores, memory } = {}) {
  const limited = (cores > 0 && cores <= 2) ||
    (cores > 0 && cores <= 4 && memory > 0 && memory <= 4) ||
    (!(cores > 0) && memory > 0 && memory <= 2);
  return reduced || saveData || limited ? 'reduced' : 'full';
}
export const allowsMotion = () => typeof document !== 'undefined' && document.documentElement.dataset.motion === 'full';

if (typeof window !== 'undefined' && typeof document !== 'undefined') {
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)');
  const update = () => {
    document.documentElement.dataset.motion = motionLevel({ reduced: reduce.matches,
      saveData: navigator.connection?.saveData, cores: navigator.hardwareConcurrency, memory: navigator.deviceMemory });
    window.dispatchEvent(new Event('studio:motion-change'));
  };
  reduce.addEventListener('change', update);
  navigator.connection?.addEventListener('change', update);
  document.addEventListener('visibilitychange', () => { document.documentElement.classList.toggle('page-hidden', document.hidden); });
  document.addEventListener('DOMContentLoaded', update);
  update();
}
