/**
 * Studio Viana - Premium Interactions
 * Handles: stats counter, horizontal drag scroll, page transitions,
 * cursor text, WhatsApp contact form, parallax strip
 */

const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
const supportsFinePointer = window.matchMedia("(pointer: fine)");

function shouldRunMotion() {
  return !prefersReducedMotion.matches && !document.hidden;
}

/* ===========================
   SMOOTH JS MARQUEE
=========================== */
function initTrustMarquee() {
  const tracks = document.querySelectorAll('.trust-bar-track');
  if (!tracks.length || prefersReducedMotion.matches) return;

  const speed = 0.025; // pixels per millisecond (smooth slow glide)
  
  tracks.forEach(track => {
    let offset = 0;
    let lastTime = 0;
    let frame = 0;
    let visible = false;
    let halfWidth = track.scrollWidth / 2;

    const loop = (now) => {
      frame = 0;
      if (!visible || !shouldRunMotion() || !halfWidth) return;
      const delta = lastTime ? Math.min(64, now - lastTime) : 0;
      lastTime = now;
      
      offset -= speed * delta;
      
      // Width is cached by ResizeObserver; avoid layout reads during animation.
      
      if (Math.abs(offset) >= halfWidth) {
        offset += halfWidth; // seamless loop
      }
      
      track.style.transform = `translate3d(${offset}px, 0, 0)`;
      frame = requestAnimationFrame(loop);
    };
    
    const sync = () => {
      cancelAnimationFrame(frame);
      frame = 0;
      lastTime = 0;
      if (visible && shouldRunMotion() && halfWidth) frame = requestAnimationFrame(loop);
    };
    new ResizeObserver(() => { halfWidth = track.scrollWidth / 2; sync(); }).observe(track);
    new IntersectionObserver(([entry]) => { visible = entry.isIntersecting; sync(); }).observe(track);
    document.addEventListener('visibilitychange', sync);
    prefersReducedMotion.addEventListener('change', sync);
    window.addEventListener('pagehide', () => { cancelAnimationFrame(frame); frame = 0; });
    window.addEventListener('pageshow', sync);
  });
}

/* ===========================
   STATS COUNTER ANIMATION
=========================== */
function initCounters() {
  const counters = document.querySelectorAll('.count-up');
  if (!counters.length) return;

  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (!entry.isIntersecting) return;
      const el = entry.target;
      const target = parseInt(el.dataset.target, 10);
      const duration = 1400;
      const startTime = performance.now();

      const easeOut = (t) => 1 - Math.pow(1 - t, 3);

      const tick = (now) => {
        const elapsed = now - startTime;
        const progress = Math.min(elapsed / duration, 1);
        el.textContent = Math.round(easeOut(progress) * target);
        if (progress < 1) requestAnimationFrame(tick);
        else el.textContent = target;
      };

      requestAnimationFrame(tick);
      observer.unobserve(el);
    });
  }, { threshold: 0.5 });

  counters.forEach(el => observer.observe(el));
}


/* ===========================
   HORIZONTAL DRAG SCROLL
=========================== */
function initDragScroll() {
  const wrappers = document.querySelectorAll('.showcase-scroll-wrapper');
  wrappers.forEach(wrapper => {
    let isDragging = false;
    let startX = 0;
    let scrollLeft = 0;

    wrapper.addEventListener('mousedown', (e) => {
      isDragging = true;
      startX = e.pageX - wrapper.offsetLeft;
      scrollLeft = wrapper.scrollLeft;
      wrapper.style.userSelect = 'none';
    });

    window.addEventListener('mouseup', () => {
      isDragging = false;
      wrapper.style.userSelect = '';
    });

    wrapper.addEventListener('mousemove', (e) => {
      if (!isDragging) return;
      e.preventDefault();
      const x = e.pageX - wrapper.offsetLeft;
      const walk = (x - startX) * 1.5;
      wrapper.scrollLeft = scrollLeft - walk;
    });

    // Touch devices use native scrolling and momentum; a second touch handler
    // would move the strip again while the browser is already scrolling it.
  });
}


/* ===========================
   PAGE TRANSITIONS
=========================== */
function initPageTransitions() {
  const overlay = document.getElementById('page-overlay');
  if (!overlay) return;
  // Native navigation starts immediately and respects modified clicks and auth guards.
  overlay.style.display = 'none';
}


/* ===========================
   HERO IMAGE STRIP PARALLAX
=========================== */
function initHeroParallax() {
  const strip = document.querySelector('.hero-image-strip');
  if (!strip || prefersReducedMotion.matches) return;

  let frame = 0;
  const update = () => {
    frame = 0;
    if (!shouldRunMotion()) return;
    const scrolled = window.scrollY;
    strip.querySelectorAll('.strip-img img').forEach((img, i) => {
      const speed = 0.025 + i * 0.012;
      img.style.transform = `scale(1.08) translate3d(0, ${scrolled * speed}px, 0)`;
    });
  };

  window.addEventListener('scroll', () => {
    if (!frame) frame = requestAnimationFrame(update);
  }, { passive: true });
}


/* ===========================
   CONTACT FORM - WHATSAPP SUBMIT
=========================== */
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

/* ===========================
   AWARDS BADGE HOVER FX
=========================== */
function initAwardsBadges() {
  if (!supportsFinePointer.matches || prefersReducedMotion.matches) return;
  document.querySelectorAll('.award-badge').forEach(badge => {
    badge.addEventListener('mousemove', (e) => {
      const rect = badge.getBoundingClientRect();
      const x = ((e.clientX - rect.left) / rect.width - 0.5) * 6;
      const y = ((e.clientY - rect.top) / rect.height - 0.5) * 6;
      badge.style.transform = `translateY(-2px) rotateX(${-y}deg) rotateY(${x}deg)`;
    });
    badge.addEventListener('mouseleave', () => {
      badge.style.transform = '';
    });
  });
}


/* ===========================
   STAT BLOCKS MICRO HOVER
=========================== */
function initStatHovers() {
  if (!supportsFinePointer.matches || prefersReducedMotion.matches) return;
  document.querySelectorAll('.stat-block').forEach(block => {
    block.addEventListener('mousemove', (e) => {
      const rect = block.getBoundingClientRect();
      const x = ((e.clientX - rect.left) / rect.width) * 100;
      const y = ((e.clientY - rect.top) / rect.height) * 100;
      block.style.background = `radial-gradient(circle at ${x}% ${y}%, rgba(122,107,91,0.07), transparent 60%)`;
    });
    block.addEventListener('mouseleave', () => {
      block.style.background = '';
    });
  });
}


/* ===========================
   PRICING CARD HOVER GLOW
=========================== */
function initPricingGlow() {
  if (!supportsFinePointer.matches || prefersReducedMotion.matches) return;
  document.querySelectorAll('.pricing-card:not(.featured)').forEach(card => {
    card.addEventListener('mousemove', (e) => {
      const rect = card.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      card.style.background = `radial-gradient(circle at ${x}px ${y}px, rgba(122,107,91,0.05), var(--bg) 70%)`;
    });
    card.addEventListener('mouseleave', () => {
      card.style.background = '';
    });
  });
}


/* ===========================
   TESTIMONIAL CARDS 3D TILT
=========================== */
function initTestimonialTilt() {
  if (!supportsFinePointer.matches || prefersReducedMotion.matches) return;
  document.querySelectorAll('.testimonial-card').forEach(card => {
    card.addEventListener('mousemove', (e) => {
      const rect = card.getBoundingClientRect();
      const x = ((e.clientX - rect.left) / rect.width - 0.5) * 8;
      const y = ((e.clientY - rect.top) / rect.height - 0.5) * 8;
      card.style.transform = `translateY(-6px) rotateX(${-y}deg) rotateY(${x}deg)`;
      card.style.transition = 'transform 0.1s linear, box-shadow 0.35s ease, border-color 0.35s ease';
    });
    card.addEventListener('mouseleave', () => {
      card.style.transform = '';
      card.style.transition = '';
    });
  });
}


/* ===========================
   MEDIA PROTECTION HINTS
=========================== */
function initSecurity() {
  document.querySelectorAll('img').forEach(img => {
    img.draggable = false;
  });
}

/* ===========================
   INIT ALL
=========================== */
document.addEventListener('DOMContentLoaded', () => {
  initTrustMarquee();
  initCounters();
  initDragScroll();
  initPageTransitions();
  initHeroParallax();
  initContactForm();
  initAwardsBadges();
  initStatHovers();
  initPricingGlow();
  initTestimonialTilt();
  initSecurity();
});


