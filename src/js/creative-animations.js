import VanillaTilt from "vanilla-tilt";

function queryAll(scope, selector) {
  if (!scope) return [];
  if (scope.matches && scope.matches(selector)) return [scope, ...scope.querySelectorAll(selector)];
  return [...scope.querySelectorAll(selector)];
}

// ── CURSOR (RAF-based, smooth) ──────────────────────────────
export function initEnhancedCursor() {
  const dot     = document.querySelector(".cursor-dot");
  const outline = document.querySelector(".cursor-outline");
  if (!dot || !outline || window.innerWidth < 768) return;

  let mx = 0, my = 0, ox = 0, oy = 0;

  document.addEventListener("mousemove", e => { mx = e.clientX; my = e.clientY; }, { passive: true });

  function loop() {
    ox += (mx - ox) * 0.12;
    oy += (my - oy) * 0.12;
    dot.style.transform    = `translate(${mx}px,${my}px) translate(-50%,-50%)`;
    outline.style.transform = `translate(${ox}px,${oy}px) translate(-50%,-50%)`;
    requestAnimationFrame(loop);
  }
  requestAnimationFrame(loop);

  const enlarge  = () => { outline.style.width = "60px"; outline.style.height = "60px"; };
  const shrink   = () => { outline.style.width = "40px"; outline.style.height = "40px"; };
  document.querySelectorAll("a,button,.work-card,.showcase-item").forEach(el => {
    el.addEventListener("mouseenter", enlarge);
    el.addEventListener("mouseleave", shrink);
  });
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
