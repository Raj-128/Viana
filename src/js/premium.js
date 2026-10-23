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

  const formInitTime = Date.now();
  let lastSubmitTime = 0;

  const status = document.createElement('p');
  status.className = 'form-status';
  status.setAttribute('aria-live', 'polite');
  form.appendChild(status);

  form.addEventListener('submit', (e) => {
    e.preventDefault();

    // Spam / Bot Protection: Honeypot check
    const honeypot = document.getElementById('contact-hp')?.value.trim();
    if (honeypot) {
      status.textContent = 'Inquiry ready in WhatsApp.';
      return;
    }

    // Spam / Bot Protection: Minimum interaction time (1.5 seconds)
    if (Date.now() - formInitTime < 1500) {
      status.textContent = 'Please wait a moment before sending.';
      return;
    }

    // Rate Limiting / Throttle: 5 seconds between submits
    if (Date.now() - lastSubmitTime < 5000) {
      status.textContent = 'Please wait a few seconds before submitting again.';
      return;
    }

    const nameEl = document.getElementById('contact-name');
    const emailEl = document.getElementById('contact-email');
    const messageEl = document.getElementById('contact-message');

    const name = nameEl?.value.trim() || '';
    const email = emailEl?.value.trim().toLowerCase() || '';
    const type = document.getElementById('contact-type')?.value.trim().slice(0, 100) || '';
    const dimensions = document.getElementById('contact-dimensions')?.value.trim().slice(0, 100) || '';
    const message = messageEl?.value.trim() || '';

    // Form Validation: Name
    if (!name || name.length < 2 || name.length > 80 || /<[^>]*>/.test(name)) {
      status.textContent = 'Please enter a valid name (2–80 characters).';
      nameEl?.focus();
      return;
    }

    // Form Validation: Email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
    if (!email || !emailRegex.test(email) || email.length > 254) {
      status.textContent = 'Please enter a valid email address.';
      emailEl?.focus();
      return;
    }

    // Form Validation: Message
    if (!message || message.length < 10 || message.length > 2500) {
      status.textContent = 'Please enter a message with at least 10 characters.';
      messageEl?.focus();
      return;
    }

    lastSubmitTime = Date.now();

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
