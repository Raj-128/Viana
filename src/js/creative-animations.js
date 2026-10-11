import { allowsMotion } from './motion-policy.js';

export function initCreativeAnimations() {
  document.addEventListener('DOMContentLoaded', () => {
    document.querySelectorAll('a[href^="#"]').forEach(link => {
      link.addEventListener('click', event => {
        const id = link.getAttribute('href').slice(1);
        const target = id && document.getElementById(id);
        if (!target) return;
        event.preventDefault();
        target.scrollIntoView({ behavior: allowsMotion() ? 'smooth' : 'auto', block: 'start' });
      });
    });
  });
}
