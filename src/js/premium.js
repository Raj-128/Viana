// Native touch scrolling and functional contact submission; decoration lives in CSS.
function initDragScroll() {
  document.querySelectorAll('.showcase-scroll-wrapper').forEach(wrapper => {
    let down = false, moved = false, startX = 0, startScroll = 0;
    wrapper.tabIndex = 0;
    wrapper.setAttribute('role', 'region');
    wrapper.setAttribute('aria-label', 'Collection. Swipe, drag, or use left and right arrow keys to explore.');
    wrapper.addEventListener('mousedown', event => {
      if (event.button !== 0) return;
      down = true; moved = false;
      startX = event.clientX; startScroll = wrapper.scrollLeft;
    });
    wrapper.addEventListener('dragstart', event => event.preventDefault());
    window.addEventListener('mousemove', event => {
      if (!down) return;
      const distance = event.clientX - startX;
      if (Math.abs(distance) > 5) moved = true;
      if (!moved) return;
      event.preventDefault();
      wrapper.style.userSelect = 'none';
      wrapper.scrollLeft = startScroll - distance;
    });
    const release = () => { down = false; wrapper.style.userSelect = ''; };
    window.addEventListener('mouseup', release);
    window.addEventListener('blur', release);
    wrapper.addEventListener('click', event => {
      if (!moved || event.detail === 0) return;
      event.preventDefault(); event.stopPropagation(); moved = false;
    }, true);
    wrapper.addEventListener('keydown', event => {
      if (event.target !== wrapper) return;
      const step = Math.max(240, wrapper.clientWidth * .75);
      if (event.key === 'ArrowRight') wrapper.scrollLeft += step;
      else if (event.key === 'ArrowLeft') wrapper.scrollLeft -= step;
      else if (event.key === 'Home') wrapper.scrollLeft = 0;
      else if (event.key === 'End') wrapper.scrollLeft = wrapper.scrollWidth;
      else return;
      event.preventDefault();
    });
    // Touch and trackpad scrolling stay native, with no per-frame JavaScript.
  });
}

function initContactForm() {
  const form = document.getElementById('contact-form');
  if (!form) return;

  const status = document.createElement('p');
  status.className = 'form-status';
  status.setAttribute('aria-live', 'polite');
  form.appendChild(status);

  form.addEventListener('submit', (e) => {
    e.preventDefault();

    if (!form.checkValidity()) {
      form.reportValidity();
      return;
    }

    const name = document.getElementById('contact-name')?.value.trim() || '';
    const email = document.getElementById('contact-email')?.value.trim() || '';
    const type = document.getElementById('contact-type')?.value.trim() || '';
    const dimensions = document.getElementById('contact-dimensions')?.value.trim() || '';
    const message = document.getElementById('contact-message')?.value.trim() || '';

    const lines = [
      'Hi Studio Viana,',
      '',
      `Name: ${name}`,
      `Email: ${email}`,
      type ? `Project type: ${type}` : '',
      dimensions ? `Wall dimensions: ${dimensions}` : '',
      `Message: ${message}`,
    ].filter(Boolean);

    const url = `https://api.whatsapp.com/send?phone=919737711570&text=${encodeURIComponent(lines.join('\n'))}`;
    const popup = window.open(url, '_blank', 'noopener,noreferrer');
    if (!popup) {
      window.location.href = url;
    }

    status.textContent = 'Inquiry ready in WhatsApp.';
  });
}


document.addEventListener('DOMContentLoaded', () => {
  document.querySelectorAll('.count-up').forEach(el => { el.textContent = el.dataset.target; });
  initDragScroll();
  initContactForm();
});
