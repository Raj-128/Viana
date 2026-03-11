import VanillaTilt from "vanilla-tilt";

function queryAll(scope, selector) {
  if (!scope) {
    return [];
  }

  if (scope.matches && scope.matches(selector)) {
    return [scope, ...scope.querySelectorAll(selector)];
  }

  return [...scope.querySelectorAll(selector)];
}

export function initEnhancedCursor() {
  const cursor = document.querySelector(".cursor");
  const dot = document.querySelector(".cursor-dot");
  const outline = document.querySelector(".cursor-outline");

  if (!cursor || !dot || !outline || window.innerWidth < 768) {
    return;
  }

  let mouseX = 0;
  let mouseY = 0;
  let cursorX = 0;
  let cursorY = 0;
  let outlineX = 0;
  let outlineY = 0;

  document.addEventListener("mousemove", (event) => {
    mouseX = event.clientX;
    mouseY = event.clientY;
  });

  function animate() {
    cursorX += (mouseX - cursorX) * 1;
    cursorY += (mouseY - cursorY) * 1;
    outlineX += (mouseX - outlineX) * 0.15;
    outlineY += (mouseY - outlineY) * 0.15;

    dot.style.left = `${cursorX}px`;
    dot.style.top = `${cursorY}px`;
    outline.style.left = `${outlineX}px`;
    outline.style.top = `${outlineY}px`;

    requestAnimationFrame(animate);
  }

  animate();

  document
    .querySelectorAll("a, button, .work-card, .menu-toggle, .cta-link, .journal-item, input, textarea, select")
    .forEach((element) => {
      element.addEventListener("mouseenter", () => {
        outline.style.width = "60px";
        outline.style.height = "60px";
        outline.style.borderWidth = "2px";
        dot.style.transform = "translate(-50%, -50%) scale(1.5)";
      });

      element.addEventListener("mouseleave", () => {
        outline.style.width = "40px";
        outline.style.height = "40px";
        outline.style.borderWidth = "1.5px";
        dot.style.transform = "translate(-50%, -50%) scale(1)";
      });
    });

  document.addEventListener("mousedown", () => {
    outline.style.width = "50px";
    outline.style.height = "50px";
    dot.style.transform = "translate(-50%, -50%) scale(0.8)";
  });

  document.addEventListener("mouseup", () => {
    outline.style.width = "40px";
    outline.style.height = "40px";
    dot.style.transform = "translate(-50%, -50%) scale(1)";
  });
}

export function initTiltEffects(scope = document) {
  const cards = [
    ...queryAll(scope, ".work-card"),
    ...queryAll(scope, ".journal-item"),
    ...queryAll(scope, ".service-card"),
  ];

  cards.forEach((card) => {
    if (card.vanillaTilt) {
      return;
    }

    VanillaTilt.init(card, {
      max: 5,
      speed: 400,
      glare: true,
      "max-glare": 0.2,
      perspective: 1000,
      scale: 1.02,
      transition: true,
      easing: "cubic-bezier(.03,.98,.52,.99)",
    });
  });
}

export function initMagneticButtons() {
  document
    .querySelectorAll(".cta-link, .menu-toggle, .pill-btn, button:not(.menu-close)")
    .forEach((button) => {
      button.addEventListener("mousemove", (event) => {
        const rect = button.getBoundingClientRect();
        const x = event.clientX - rect.left - rect.width / 2;
        const y = event.clientY - rect.top - rect.height / 2;

        button.style.transform = `translate(${x * 0.3}px, ${y * 0.3}px)`;
      });

      button.addEventListener("mouseleave", () => {
        button.style.transform = "translate(0, 0)";
      });
    });
}

export function initSmoothScroll() {
  document.querySelectorAll('a[href^="#"]').forEach((anchor) => {
    anchor.addEventListener("click", function handleAnchorClick(event) {
      const href = this.getAttribute("href");
      if (href === "#") {
        return;
      }

      event.preventDefault();
      const target = document.querySelector(href);
      if (!target) {
        return;
      }

      window.scrollTo({
        top: target.offsetTop - 100,
        behavior: "smooth",
      });
    });
  });
}

export function initStaggeredAnimations() {
  if (!window.gsap) {
    return;
  }

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) {
          return;
        }

        const children = entry.target.querySelectorAll(
          "h2, h3, p, .work-card, .journal-item, .identity-block, .service-card, .process-step"
        );

        gsap.fromTo(
          children,
          { y: 40, opacity: 0, scale: 0.95 },
          {
            y: 0,
            opacity: 1,
            scale: 1,
            duration: 0.8,
            stagger: 0.1,
            ease: "power3.out",
          }
        );

        observer.unobserve(entry.target);
      });
    },
    { threshold: 0.1 }
  );

  document.querySelectorAll("section").forEach((section) => observer.observe(section));
}

export function initFloatingElements() {
  if (!window.gsap) {
    return;
  }

  document
    .querySelectorAll(".hero-title, .logo-img, .fullscreen-menu .menu-right")
    .forEach((element, index) => {
      gsap.to(element, {
        y: -15,
        duration: 2 + index * 0.5,
        repeat: -1,
        yoyo: true,
        ease: "power1.inOut",
      });
    });
}

export function initImageHoverEffects(scope = document) {
  const images = [
    ...queryAll(scope, ".work-card img"),
    ...queryAll(scope, ".about-image img"),
  ];

  images.forEach((image) => {
    const parent = image.closest(".work-card, .about-image");
    if (!parent || parent.dataset.imageHoverReady === "true") {
      return;
    }

    parent.dataset.imageHoverReady = "true";

    parent.addEventListener("mouseenter", () => {
      if (!window.gsap) {
        return;
      }

      gsap.to(image, {
        scale: 1.1,
        rotation: 2,
        duration: 0.6,
        ease: "power2.out",
      });
    });

    parent.addEventListener("mouseleave", () => {
      if (!window.gsap) {
        return;
      }

      gsap.to(image, {
        scale: 1,
        rotation: 0,
        duration: 0.6,
        ease: "power2.out",
      });
    });
  });
}

export function initTextReveal() {
  if (!window.gsap) {
    return;
  }

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting || entry.target.querySelector(".char")) {
          observer.unobserve(entry.target);
          return;
        }

        const text = entry.target.textContent;
        entry.target.innerHTML = text
          .split("")
          .map((character) => `<span class="char">${character}</span>`)
          .join("");

        gsap.fromTo(
          entry.target.querySelectorAll(".char"),
          { opacity: 0, y: 20 },
          {
            opacity: 1,
            y: 0,
            duration: 0.05,
            stagger: 0.02,
            ease: "power2.out",
          }
        );

        observer.unobserve(entry.target);
      });
    },
    { threshold: 0.5 }
  );

  document.querySelectorAll(".section-title, .page-title").forEach((element) => {
    observer.observe(element);
  });
}

export function initPageLoadAnimation() {
  if (!window.gsap) {
    return;
  }

  gsap
    .timeline()
    .from("body", {
      opacity: 0,
      duration: 0.5,
    })
    .from(
      ".site-header",
      {
        y: -100,
        opacity: 0,
        duration: 0.8,
        ease: "power3.out",
      },
      "-=0.3"
    )
    .from(
      ".hero-eyebrow",
      {
        y: 20,
        opacity: 0,
        duration: 0.6,
      },
      "-=0.4"
    )
    .from(
      ".hero-title .line",
      {
        y: 100,
        opacity: 0,
        duration: 0.8,
        stagger: 0.15,
        ease: "power3.out",
      },
      "-=0.4"
    );
}

export function initRippleEffect(scope = document) {
  const rippleTargets = [
    ...queryAll(scope, "button"),
    ...queryAll(scope, ".cta-link"),
    ...queryAll(scope, ".work-card"),
  ];

  rippleTargets.forEach((target) => {
    if (target.dataset.rippleReady === "true") {
      return;
    }

    target.dataset.rippleReady = "true";

    target.addEventListener("click", function handleRippleClick(event) {
      const ripple = document.createElement("span");
      ripple.classList.add("ripple-effect");

      const rect = target.getBoundingClientRect();
      const size = Math.max(rect.width, rect.height);
      const x = event.clientX - rect.left - size / 2;
      const y = event.clientY - rect.top - size / 2;

      ripple.style.width = `${size}px`;
      ripple.style.height = `${size}px`;
      ripple.style.left = `${x}px`;
      ripple.style.top = `${y}px`;

      target.appendChild(ripple);
      setTimeout(() => ripple.remove(), 600);
    });
  });
}

export function initScrollProgress() {
  if (document.querySelector(".scroll-progress")) {
    return;
  }

  const progressBar = document.createElement("div");
  progressBar.className = "scroll-progress";
  document.body.appendChild(progressBar);

  window.addEventListener("scroll", () => {
    const scrollTop = window.pageYOffset;
    const documentHeight = document.documentElement.scrollHeight - window.innerHeight;
    const scrollPercent = documentHeight > 0 ? (scrollTop / documentHeight) * 100 : 0;
    progressBar.style.width = `${scrollPercent}%`;
  });
}

export function initCreativeAnimations() {
  document.addEventListener("DOMContentLoaded", () => {
    initEnhancedCursor();
    initTiltEffects();
    initMagneticButtons();
    initSmoothScroll();
    initStaggeredAnimations();
    initImageHoverEffects();
    initTextReveal();
    initRippleEffect();
    initScrollProgress();

    setTimeout(() => {
      initFloatingElements();
    }, 1000);
  });
}
