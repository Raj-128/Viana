/**
 * Studio Viana — Premium Interactions
 * Handles: stats counter, horizontal drag scroll, page transitions,
 * cursor text, WhatsApp contact form, parallax strip
 */

/* ===========================
   SMOOTH JS MARQUEE
=========================== */
function initTrustMarquee() {
  const tracks = document.querySelectorAll('.trust-bar-track');
  if (!tracks.length) return;

  const speed = 0.03; // pixels per millisecond (smooth slow glide)
  
  tracks.forEach(track => {
    let offset = 0;
    let lastTime = performance.now();

    const loop = (now) => {
      const delta = now - lastTime;
      lastTime = now;
      
      offset -= speed * delta;
      
      // Calculate 50% width since content is exactly duplicated
      // We need it to be exactly 50% of the flex width. Flex child sizing handles it.
      // Easiest seamless scroll: calculate bounding rect of half the track.
      const halfWidth = track.scrollWidth / 2;
      
      if (Math.abs(offset) >= halfWidth) {
        offset += halfWidth; // seamless loop
      }
      
      track.style.transform = `translate3d(${offset}px, 0, 0)`;
      requestAnimationFrame(loop);
    };
    
    requestAnimationFrame(loop);
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

    // Touch support
    let touchStartX = 0;
    let touchScrollLeft = 0;
    wrapper.addEventListener('touchstart', (e) => {
      touchStartX = e.touches[0].pageX;
      touchScrollLeft = wrapper.scrollLeft;
    }, { passive: true });

    wrapper.addEventListener('touchmove', (e) => {
      const x = e.touches[0].pageX;
      const walk = (touchStartX - x) * 1.2;
      wrapper.scrollLeft = touchScrollLeft + walk;
    }, { passive: true });
  });
}


/* ===========================
   CURSOR TEXT ON HOVER
=========================== */
function initCursorText() {
  const cursorText = document.getElementById('cursor-text');
  if (!cursorText || window.innerWidth < 768) return;

  document.addEventListener('mousemove', (e) => {
    cursorText.style.left = e.clientX + 'px';
    cursorText.style.top = e.clientY + 'px';
  });

  document.querySelectorAll('.showcase-item, .work-card, .testimonial-card').forEach(el => {
    el.addEventListener('mouseenter', () => {
      cursorText.textContent = 'View';
      cursorText.classList.add('visible');
    });
    el.addEventListener('mouseleave', () => {
      cursorText.classList.remove('visible');
    });
  });

  document.querySelectorAll('.showcase-scroll-wrapper').forEach(el => {
    el.addEventListener('mouseenter', () => {
      cursorText.textContent = 'Drag';
      cursorText.classList.add('visible');
    });
    el.addEventListener('mouseleave', () => {
      cursorText.classList.remove('visible');
    });
  });
}


/* ===========================
   PAGE TRANSITIONS
=========================== */
function initPageTransitions() {
  const overlay = document.getElementById('page-overlay');
  if (!overlay) return;

  // Animate out on load
  overlay.classList.add('leaving');
  setTimeout(() => {
    overlay.style.display = 'none';
  }, 500);

  // Animate in on link click
  document.querySelectorAll('a[href]').forEach(link => {
    const href = link.getAttribute('href');
    if (!href || href.startsWith('#') || href.startsWith('http') || href.startsWith('mailto') || href.startsWith('tel')) return;
    if (link.target === '_blank') return;

    link.addEventListener('click', (e) => {
      e.preventDefault();
      overlay.style.display = 'block';
      overlay.classList.remove('leaving');
      overlay.classList.add('entering');
      setTimeout(() => {
        window.location.href = href;
      }, 430);
    });
  });
}


/* ===========================
   HERO IMAGE STRIP PARALLAX
=========================== */
function initHeroParallax() {
  const strip = document.querySelector('.hero-image-strip');
  if (!strip) return;

  window.addEventListener('scroll', () => {
    const scrolled = window.scrollY;
    const images = strip.querySelectorAll('.strip-img img');
    images.forEach((img, i) => {
      const speed = 0.04 + i * 0.02;
      img.style.transform = `scale(1.08) translateY(${scrolled * speed}px)`;
    });
  }, { passive: true });
}


/* ===========================
   CONTACT FORM — WHATSAPP SUBMIT
=========================== */
function initContactForm() {
  const form = document.getElementById('contact-form');
  if (!form) return;

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const name = document.getElementById('contact-name')?.value || '';
    const email = document.getElementById('contact-email')?.value || '';
    const type = document.getElementById('contact-type')?.value || '';
    const dimensions = document.getElementById('contact-dimensions')?.value || '';
    const message = document.getElementById('contact-message')?.value || '';

    const lines = [
      `Hi Studio Viana!`,
      ``,
      `Name: ${name}`,
      email ? `Email: ${email}` : '',
      type ? `Project Type: ${type}` : '',
      dimensions ? `Wall Dimensions: ${dimensions}` : '',
      message ? `Message: ${message}` : '',
    ].filter(Boolean);

    const encoded = encodeURIComponent(lines.join('\n'));
    window.open(`https://api.whatsapp.com/send?phone=919737711570&text=${encoded}`, '_blank');
  });
}


/* ===========================
   AWARDS BADGE HOVER FX
=========================== */
function initAwardsBadges() {
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
   ANTI-THEFT SYSTEM & SECURITY
=========================== */
function initSecurity() {
  // Prevent Right Click globally
  document.addEventListener('contextmenu', (e) => {
    e.preventDefault();
  });

  // Prevent generic image drag-and-drop
  document.addEventListener('dragstart', (e) => {
    if (e.target.nodeName === 'IMG') {
      e.preventDefault();
    }
  });

  // Prevent basic shortcut keys (PrintScreen, Ctrl+S)
  document.addEventListener('keydown', (e) => {
    if (e.key === 'PrintScreen') {
      // Trying to clear clipboard (only works in some browsers)
      navigator.clipboard.writeText('');
      alert("Screenshots are disabled for premium assets.");
    }
    if ((e.ctrlKey || e.metaKey) && (e.key === 's' || e.key === 'p')) {
      e.preventDefault();
    }
  });
}

/* ===========================
   INIT ALL
=========================== */
document.addEventListener('DOMContentLoaded', () => {
  initTrustMarquee();
  initCounters();
  initDragScroll();
  initCursorText();
  initPageTransitions();
  initHeroParallax();
  initContactForm();
  initAwardsBadges();
  initStatHovers();
  initPricingGlow();
  initTestimonialTilt();
  initSecurity();
});
