import VanillaTilt from "vanilla-tilt";

function queryAll(scope, selector) {
  if (!scope) return [];
  if (scope.matches && scope.matches(selector)) return [scope, ...scope.querySelectorAll(selector)];
  return [...scope.querySelectorAll(selector)];
}

// ── CURSOR (RAF-based, smooth) ──────────────────────────────
export function initEnhancedCursor() {
  const cursor = document.querySelector(".cursor");
  const dot = document.querySelector(".cursor-dot");
  const outline = document.querySelector(".cursor-outline");
  const canUseCustomCursor = window.matchMedia("(hover: hover) and (pointer: fine)");

  if (!cursor || !dot || !outline || !canUseCustomCursor.matches) return;

  let targetX = 0;
  let targetY = 0;
  let dotX = 0;
  let dotY = 0;
  let ringX = 0;
  let ringY = 0;
  let isReady = false;
  let frameId = 0;
  let lastFrameTime = 0;

  const lerp = (current, target, amount) => current + (target - current) * amount;

  const setInteractiveState = (element) => {
    const interactive = element?.closest?.("a, button, input, select, textarea, [role='button'], .work-card, .showcase-item, .showcase-scroll-wrapper");
    cursor.classList.toggle("is-interactive", Boolean(interactive));
  };

  const render = () => {
    dotX = lerp(dotX, targetX, 0.18);
    dotY = lerp(dotY, targetY, 0.18);
    ringX = lerp(ringX, targetX, 0.12);
    ringY = lerp(ringY, targetY, 0.12);

    dot.style.transform = `translate3d(${dotX}px, ${dotY}px, 0) translate(-50%, -50%)`;
    outline.style.transform = `translate3d(${ringX}px, ${ringY}px, 0) translate(-50%, -50%)`;
    frameId = window.requestAnimationFrame(render);
  };

  document.documentElement.classList.add("has-custom-cursor");

  document.addEventListener("pointermove", (event) => {
    if (event.pointerType && event.pointerType !== "mouse") return;

    targetX = event.clientX;
    targetY = event.clientY;
    if (!isReady) {
      dotX = ringX = targetX;
      dotY = ringY = targetY;
      isReady = true;
      cursor.classList.add("is-visible");
    }
  }, { passive: true });

  document.addEventListener("pointerover", (event) => setInteractiveState(event.target), { passive: true });
  document.addEventListener("pointerout", (event) => {
    if (!event.relatedTarget || !event.relatedTarget.closest?.("a, button, input, select, textarea, [role='button'], .work-card, .showcase-item, .showcase-scroll-wrapper")) {
      cursor.classList.remove("is-interactive");
    }
  }, { passive: true });
  document.addEventListener("pointerdown", () => cursor.classList.add("is-pressed"), { passive: true });
  document.addEventListener("pointerup", () => cursor.classList.remove("is-pressed"), { passive: true });
  document.addEventListener("pointerleave", () => cursor.classList.remove("is-visible"));
  document.addEventListener("pointerenter", () => isReady && cursor.classList.add("is-visible"));
  document.addEventListener("mouseleave", () => cursor.classList.remove("is-visible"));
  document.addEventListener("mouseenter", () => isReady && cursor.classList.add("is-visible"));
  window.addEventListener("blur", () => cursor.classList.remove("is-visible"));
  window.addEventListener("focus", () => isReady && cursor.classList.add("is-visible"));

  frameId = window.requestAnimationFrame(render);
  window.addEventListener("pagehide", () => window.cancelAnimationFrame(frameId), { once: true });
}

// ── TILT: only on desktop, only on visible cards ────────────
export function initTiltEffects(scope = document) {
  if (window.innerWidth < 768) return;
  const cards = [ ...queryAll(scope, ".work-card"), ...queryAll(scope, ".service-card") ];
  cards.forEach(card => {
    if (card.vanillaTilt) return;
    VanillaTilt.init(card, { max: 4, speed: 600, glare: true, "max-glare": 0.12, scale: 1.01 });
  });
}

// ── RIPPLE ──────────────────────────────────────────────────
export function initRippleEffect(scope = document) {
  queryAll(scope, "button,.cta-link,.work-card").forEach(target => {
    if (target.dataset.rippleReady) return;
    target.dataset.rippleReady = "true";
    target.addEventListener("click", e => {
      const r = document.createElement("span");
      r.className = "ripple-effect";
      const rect = target.getBoundingClientRect();
      const sz = Math.max(rect.width, rect.height);
      r.style.cssText = `width:${sz}px;height:${sz}px;left:${e.clientX-rect.left-sz/2}px;top:${e.clientY-rect.top-sz/2}px`;
      target.appendChild(r);
      setTimeout(() => r.remove(), 600);
    });
  });
}

// ── IMAGE HOVER ─────────────────────────────────────────────
export function initImageHoverEffects(scope = document) {
  queryAll(scope, ".work-card img,.showcase-item img").forEach(img => {
    const p = img.parentElement;
    if (!p || p.dataset.imgHover) return;
    p.dataset.imgHover = "1";
    p.addEventListener("mouseenter", () => { img.style.transform = "scale(1.06)"; });
    p.addEventListener("mouseleave", () => { img.style.transform = ""; });
  });
}

// ── SCROLL PROGRESS BAR ─────────────────────────────────────
export function initScrollProgress() {
  const bar = document.createElement("div");
  bar.className = "scroll-progress";
  document.body.appendChild(bar);
  window.addEventListener("scroll", () => {
    const h = document.documentElement.scrollHeight - window.innerHeight;
    bar.style.width = `${h > 0 ? (window.scrollY / h) * 100 : 0}%`;
  }, { passive: true });
}

// ── SMOOTH SCROLL (anchor links) ────────────────────────────
export function initSmoothScroll() {
  document.querySelectorAll('a[href^="#"]').forEach(a => {
    a.addEventListener("click", e => {
      const t = document.querySelector(a.getAttribute("href"));
      if (!t) return;
      e.preventDefault();
      t.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  });
}

// ── PAGE LOAD ANIMATION (lightweight, no infinite loops) ────
export function initPageLoadAnimation() {
  if (!window.gsap) return;
  
  // Set inline-block for line spans to allow y transforms
  document.querySelectorAll(".hero-title .line").forEach(line => line.style.display = 'inline-block');

  gsap.timeline()
    .fromTo(".site-header", 
      { y: -60, autoAlpha: 0 }, 
      { y: 0, autoAlpha: 1, duration: 0.7, ease: "power3.out" }
    )
    .fromTo(".hero-eyebrow",  
      { y: 16, autoAlpha: 0 }, 
      { y: 0, autoAlpha: 1, duration: 0.5 }, 
      "-=0.4"
    )
    .fromTo(".hero-title .line", 
      { y: 60, autoAlpha: 0 }, 
      { y: 0, autoAlpha: 1, duration: 0.8, stagger: 0.12, ease: "power3.out" }, 
      "-=0.3"
    )
    .fromTo(".hero-sub",  
      { autoAlpha: 0 }, 
      { autoAlpha: 1, duration: 0.5 }, 
      "-=0.3"
    );
}

// ── STAGGERED SECTION REVEAL ──
export function initStaggeredAnimations() {
  // We rely on main.js revealObserver to handle the section reveals without conflicting inner staggers
}

// ── FLOATING / MAGNETIC ──────
export function initFloatingElements() {
  // Logo is fixed - no floating animation
}

// ── MAGNETIC BUTTONS (lightweight, CSS-only approach) ───────
export function initMagneticButtons() {
  document.querySelectorAll(".cta-link,.menu-toggle").forEach(btn => {
    btn.addEventListener("mousemove", e => {
      const r = btn.getBoundingClientRect();
      const x = (e.clientX - r.left - r.width  / 2) * 0.25;
      const y = (e.clientY - r.top  - r.height / 2) * 0.25;
      btn.style.transform = `translate(${x}px,${y}px)`;
    });
    btn.addEventListener("mouseleave", () => { btn.style.transform = ""; });
  });
}

// ── TEXT REVEAL (word by word) ──────
export function initTextReveal() {
  if (!window.gsap) return;
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (!entry.isIntersecting) return;
      const chars = entry.target.querySelectorAll(".char");
      if(chars.length) {
         gsap.fromTo(chars, 
           { autoAlpha: 0, y: 20 },
           { autoAlpha: 1, y: 0, duration: 0.4, stagger: 0.03, ease: "back.out(1.2)" }
         );
      }
      observer.unobserve(entry.target);
    });
  }, { threshold: 0.4 });

  document.querySelectorAll(".section-title, .page-title").forEach(el => {
    if (!el.querySelector(".char")) {
      const text = el.textContent;
      el.innerHTML = text.split("").map(c => c === " " ? "&nbsp;" : `<span class="char" style="display:inline-block">${c}</span>`).join("");
    }
    observer.observe(el);
  });
}

// ── MAIN EXPORT ─────────────────────────────────────────────
export function initCreativeAnimations() {
  document.addEventListener("DOMContentLoaded", () => {
    initEnhancedCursor();
    initMagneticButtons();
    initSmoothScroll();
    initScrollProgress();
    initPageLoadAnimation();
    initStaggeredAnimations();
    initFloatingElements();
    initTextReveal();
  });
}
