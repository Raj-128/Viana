import { paperTypes, pricingThemes, projects, wallpaperShowcaseImages } from "./projects.js";
import {
  initCreativeAnimations,
  initImageHoverEffects,
  initRippleEffect,
  initTiltEffects,
} from "./creative-animations.js";
import {
  applyAuthStateToDocument,
  enforceProtectedAccess,
  gateProtectedNavigation,
  isAdminSession,
  syncAuthLinks,
} from "./auth.js";

initCreativeAnimations();

const MODE_KEY = "studioMode";
const MODE_VALUES = ["wallpaper", "3d"];
const WHATSAPP_NUMBER = "919737711570";
const currencyFormatter = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 0,
});

function getStoredMode() {
  try {
    const saved = localStorage.getItem(MODE_KEY);
    return MODE_VALUES.includes(saved) ? saved : null;
  } catch {
    return null;
  }
}

function applyModeClass(mode) {
  const target = document.body || document.documentElement;
  if (!target) {
    return;
  }

  target.classList.toggle("mode-wallpaper", mode === "wallpaper");
  target.classList.toggle("mode-3d", mode === "3d");
}

function createObserverManager() {
  const revealObserver = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) {
          return;
        }

        entry.target.classList.add("active");

        if (window.gsap) {
          gsap.fromTo(
            entry.target,
            { y: 24, autoAlpha: 0 },
            { y: 0, autoAlpha: 1, duration: 0.9, ease: "power2.out" }
          );
        }

        revealObserver.unobserve(entry.target);
      });
    },
    { threshold: 0.15 }
  );

  const mediaObserver = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) {
          return;
        }

        const img = entry.target.querySelector("img");
        if (window.gsap && img) {
          gsap.fromTo(
            img,
            { scale: 1.08, y: 24, autoAlpha: 0 },
            { scale: 1, y: 0, autoAlpha: 1, duration: 1.1, ease: "power3.out" }
          );
        } else if (img) {
          img.style.opacity = "1";
          img.style.transform = "translateY(0) scale(1)";
        }

        mediaObserver.unobserve(entry.target);
      });
    },
    { threshold: 0.2 }
  );

  function observeReveals(scope = document) {
    scope.querySelectorAll(".reveal:not(.active)").forEach((element) => {
      revealObserver.observe(element);
    });
  }

  function observeMedia(scope = document) {
    scope.querySelectorAll(".reveal-media").forEach((element) => {
      mediaObserver.observe(element);
    });
  }

  return {
    observeMedia,
    observeReveals,
  };
}

function formatPrice(value) {
  return currencyFormatter.format(Math.round(value));
}

function buildWhatsAppLink(message) {
  return `https://api.whatsapp.com/send?phone=${WHATSAPP_NUMBER}&text=${encodeURIComponent(message)}`;
}

function isPublicShareContext() {
  return /^https?:$/i.test(window.location.protocol);
}

function getProjectPageUrl(project) {
  if (!project || !isPublicShareContext()) {
    return "";
  }

  return window.location.href;
}

function getProjectImageUrl(project) {
  if (!project || !isPublicShareContext()) {
    return "";
  }

  return new URL(project.cover, window.location.href).href;
}

function getProjectReferenceLine(project) {
  const projectUrl = getProjectPageUrl(project);
  if (projectUrl) {
    return `Project link: ${projectUrl}`;
  }

  return project ? `Project reference: ${project.id}` : "";
}

function getProjectImageLine(project) {
  const imageUrl = getProjectImageUrl(project);
  return imageUrl ? `Preview image: ${imageUrl}` : "";
}

function initWallpaperMarquee() {
  const rows = [...document.querySelectorAll(".marquee-row")];
  if (!rows.length || !wallpaperShowcaseImages.length) {
    return;
  }

  const seedImages = wallpaperShowcaseImages.filter(Boolean);
  const rotationPoint = Math.max(1, Math.ceil(seedImages.length / 2));
  const rowImages = [
    seedImages,
    [...seedImages.slice(rotationPoint), ...seedImages.slice(0, rotationPoint)],
  ];

  const createGroupMarkup = (images, { hidden = false, offset = 0 } = {}) => `
    <div class="marquee-group"${hidden ? ' aria-hidden="true"' : ""}>
      ${images
        .map(
          (image, index) => `
            <img
              src="${image}"
              alt="${hidden ? "" : `Studio Viana wallpaper ${offset + index + 1}`}"
              draggable="false"
              loading="eager"
              decoding="async"
            >
          `
        )
        .join("")}
    </div>
  `;

  const hydrateTrack = (track, images, rowIndex) => {
    track.innerHTML = createGroupMarkup(images, { offset: rowIndex * images.length });

    const firstGroup = track.querySelector(".marquee-group");
    const baseWidth = Math.round(firstGroup?.getBoundingClientRect().width || 0);
    if (!baseWidth) {
      return 0;
    }

    const rowWidth = Math.ceil(track.closest(".marquee-row")?.clientWidth || window.innerWidth || baseWidth);
    const copiesNeeded = Math.max(3, Math.ceil(rowWidth / baseWidth) + 2);

    track.innerHTML = Array.from({ length: copiesNeeded }, (_, copyIndex) =>
      createGroupMarkup(images, {
        hidden: copyIndex > 0,
        offset: rowIndex * images.length + copyIndex * images.length,
      })
    ).join("");

    return baseWidth;
  };

  rows.forEach((row, index) => {
    const track = row.querySelector(".marquee-track");
    if (!track) {
      return;
    }

    const images = rowImages[index % rowImages.length];
    hydrateTrack(track, images, index);
  });

  const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

  let frameId = 0;
  let lastTime = 0;
  let marqueeItems = [];

  const createItems = () => {
    marqueeItems = rows
      .map((row, index) => {
        const track = row.querySelector(".marquee-track");
        if (!track) {
          return null;
        }

        const images = rowImages[index % rowImages.length];
        const groupWidth = hydrateTrack(track, images, index);
        if (!groupWidth) {
          return null;
        }

        const reverse = row.classList.contains("reverse");
        const speed = index === 0 ? 0.18 : 0.15;
        const offset = reverse ? -groupWidth : 0;

        track.style.removeProperty("animation");
        track.style.transform = `translate3d(${offset}px, 0, 0)`;

        return {
          track,
          groupWidth,
          reverse,
          offset,
          speed,
        };
      })
      .filter(Boolean);
  };

  const tick = (timestamp) => {
    if (!lastTime) {
      lastTime = timestamp;
    }

    const delta = Math.min(32, timestamp - lastTime);
    lastTime = timestamp;

    marqueeItems.forEach((item) => {
      if (item.reverse) {
        item.offset = ((item.offset + delta * item.speed + item.groupWidth) % item.groupWidth) - item.groupWidth;
      } else {
        item.offset = -((Math.abs(item.offset) + delta * item.speed) % item.groupWidth);
      }

      item.track.style.transform = `translate3d(${item.offset}px, 0, 0)`;
    });

    frameId = window.requestAnimationFrame(tick);
  };

  const setup = () => {
    if (frameId) {
      window.cancelAnimationFrame(frameId);
      frameId = 0;
    }

    lastTime = 0;
    createItems();

    if (prefersReducedMotion.matches) {
      return;
    }

    if (marqueeItems.length) {
      frameId = window.requestAnimationFrame(tick);
    }
  };

  const waitForImages = () =>
    Promise.allSettled(
      [...document.querySelectorAll(".marquee-track img")].map((img) => {
        if (img.complete) {
          return Promise.resolve();
        }
        return new Promise((resolve) => {
          img.addEventListener("load", resolve, { once: true });
          img.addEventListener("error", resolve, { once: true });
        });
      })
    );

  const scheduleSetup = () => {
    waitForImages().then(() => {
      window.requestAnimationFrame(setup);
    });
  };

  scheduleSetup();
  if (document.readyState === "complete") {
    window.setTimeout(scheduleSetup, 0);
  } else {
    window.addEventListener("load", scheduleSetup, { once: true });
  }
  window.addEventListener("resize", scheduleSetup);
  prefersReducedMotion.addEventListener?.("change", scheduleSetup);
}

function getThemeDetails(themeId) {
  return pricingThemes.find((theme) => theme.id === themeId);
}

function getProjectsByMode(mode) {
  return projects.filter((project) => project.workType === mode);
}

function getUniqueYears(mode) {
  return [...new Set(getProjectsByMode(mode).map((project) => project.year))].sort(
    (left, right) => Number(right) - Number(left)
  );
}

function getUniqueThemes(mode) {
  return [...new Set(getProjectsByMode(mode).map((project) => project.theme))]
    .map((themeId) => getThemeDetails(themeId))
    .filter(Boolean);
}

function populateSelect(select, options, placeholder) {
  if (!select) {
    return;
  }

  const previousValue = select.value;
  const optionMarkup = options
    .map((option) => `<option value="${option.value}">${option.label}</option>`)
    .join("");

  select.innerHTML = `<option value="">${placeholder}</option>${optionMarkup}`;

  if (options.some((option) => option.value === previousValue)) {
    select.value = previousValue;
  }
}

function animateCards(cards) {
  if (!cards.length || !window.gsap) {
    return;
  }

  gsap.fromTo(
    cards,
    { y: 22, autoAlpha: 0 },
    { y: 0, autoAlpha: 1, duration: 0.7, stagger: 0.08, ease: "power2.out" }
  );
}

function enhanceCards(scope) {
  initTiltEffects(scope);
  initImageHoverEffects(scope);
  initRippleEffect(scope);
}

const initialMode = getStoredMode() || "wallpaper";
const root = document.documentElement;
const revealMode = () => root.classList.add("mode-ready");

applyModeClass(initialMode);
requestAnimationFrame(revealMode);

const cursor = document.querySelector(".cursor");
if (cursor && window.innerWidth < 768) {
  cursor.style.display = "none";
}

document.addEventListener("DOMContentLoaded", () => {
  if (enforceProtectedAccess()) {
    return;
  }

  applyAuthStateToDocument();
  syncAuthLinks();
  gateProtectedNavigation();

  const observerManager = createObserverManager();
  observerManager.observeReveals();
  observerManager.observeMedia();
  initWallpaperMarquee();

  const toggle = document.querySelector(".menu-toggle");
  const menu = document.querySelector(".fullscreen-menu");
  const closeBtn = document.querySelector(".menu-close");
  const header = document.querySelector(".site-header");

  const grid = document.getElementById("work-grid");
  const homeCollections = document.getElementById("home-collections");
  const yearSelect = document.getElementById("filter-year");
  const ownershipSelect = document.getElementById("filter-ownership");
  const themeSelect = document.getElementById("filter-theme");
  const clearBtn = document.getElementById("clear-filters");
  const workCount = document.getElementById("work-count");
  const modeToggles = document.querySelectorAll("[data-mode-toggle]");

  const estimatorSection = document.querySelector("[data-estimator]");
  const estimatorThemeSelect = document.getElementById("price-theme");
  const estimatorPaperSelect = document.getElementById("price-paper");
  const estimatorWidthInput = document.getElementById("price-width");
  const estimatorHeightInput = document.getElementById("price-height");
  const estimatorQuantityInput = document.getElementById("price-qty");
  const estimatorDecreaseButton = document.getElementById("price-qty-decrease");
  const estimatorIncreaseButton = document.getElementById("price-qty-increase");
  const estimatorThemePills = document.getElementById("estimate-theme-pills");

  const previewImage = document.getElementById("estimate-preview-image");
  const previewLabel = document.getElementById("estimate-preview-label");
  const previewTitle = document.getElementById("estimate-preview-title");
  const previewCopy = document.getElementById("estimate-preview-copy");
  const previewBestFor = document.getElementById("estimate-best-for");
  const previewFinish = document.getElementById("estimate-finish");
  const previewTurnaround = document.getElementById("estimate-turnaround");

  const selectedDesignOutput = document.getElementById("price-selected-design");
  const dimensionOutput = document.getElementById("price-dimension");
  const themeRateOutput = document.getElementById("price-theme-rate");
  const paperNoteOutput = document.getElementById("price-paper-note");
  const totalOutput = document.getElementById("price-total");
  const rangeOutput = document.getElementById("price-range");
  const quoteWhatsappLink = document.getElementById("quote-whatsapp-link");
  const projectOrderSection = document.getElementById("project-order-section");

  let currentWorkType = initialMode;
  let activeProject = null;
  let currentWhatsAppMessage = "Hello Studio Viana";
  let currentWhatsAppLink = buildWhatsAppLink("Hello Studio Viana");

  const estimatorState = {
    theme: pricingThemes[0]?.id ?? "",
    paper: paperTypes[0]?.id ?? "",
    width: Number(estimatorWidthInput?.value || 200),
    height: Number(estimatorHeightInput?.value || 100),
    quantity: Number(estimatorQuantityInput?.value || 1),
  };

  if (toggle && menu) {
    toggle.addEventListener("click", () => {
      toggle.classList.toggle("active");
      menu.classList.toggle("active");
      document.body.classList.toggle("menu-open");

      if (window.gsap && menu.classList.contains("active")) {
        gsap.fromTo(
          ".menu-links a",
          { y: 20, autoAlpha: 0 },
          { y: 0, autoAlpha: 1, duration: 0.6, stagger: 0.08, ease: "power2.out" }
        );
      }
    });

    toggle.addEventListener("click", () => {
      toggle.classList.remove("ripple");
      void toggle.offsetWidth;
      toggle.classList.add("ripple");
    });

    closeBtn?.addEventListener("click", () => {
      toggle.classList.remove("active");
      menu.classList.remove("active");
      document.body.classList.remove("menu-open");
    });

    toggle.addEventListener("mousemove", (event) => {
      const rect = toggle.getBoundingClientRect();
      const x = event.clientX - rect.left - rect.width / 2;
      const y = event.clientY - rect.top - rect.height / 2;
      const limit = 6;
      const moveX = Math.max(-limit, Math.min(limit, x * 0.2));
      const moveY = Math.max(-limit, Math.min(limit, y * 0.2));
      toggle.style.setProperty("--mag-x", `${moveX}px`);
      toggle.style.setProperty("--mag-y", `${moveY}px`);
    });

    toggle.addEventListener("mouseleave", () => {
      toggle.style.setProperty("--mag-x", "0px");
      toggle.style.setProperty("--mag-y", "0px");
    });
  }

  document.addEventListener("keydown", (event) => {
    if (event.key !== "Escape") {
      return;
    }

    toggle?.classList.remove("active");
    menu?.classList.remove("active");
    document.body.classList.remove("menu-open");
  });

  function initMediaProtection() {
    if (isAdminSession()) {
      return;
    }

    const protectedSelector = "img, .protected-media-block, .preview-frame";
    const isProtectedTarget = (target) =>
      target instanceof Element && Boolean(target.closest(protectedSelector));
    const selectionTouchesProtectedContent = () => {
      const selection = window.getSelection();
      const anchorElement =
        selection?.anchorNode instanceof Element
          ? selection.anchorNode
          : selection?.anchorNode?.parentElement;
      const focusElement =
        selection?.focusNode instanceof Element ? selection.focusNode : selection?.focusNode?.parentElement;

      return isProtectedTarget(anchorElement) || isProtectedTarget(focusElement);
    };

    document.querySelectorAll("img").forEach((image) => {
      image.draggable = false;
    });

    document.addEventListener("contextmenu", (event) => {
      if (isProtectedTarget(event.target)) {
        event.preventDefault();
      }
    });

    document.addEventListener("dragstart", (event) => {
      if (isProtectedTarget(event.target)) {
        event.preventDefault();
      }
    });

    document.addEventListener("selectstart", (event) => {
      if (isProtectedTarget(event.target)) {
        event.preventDefault();
      }
    });

    ["copy", "cut"].forEach((eventName) => {
      document.addEventListener(eventName, (event) => {
        if (selectionTouchesProtectedContent() || isProtectedTarget(event.target)) {
          event.preventDefault();
        }
      });
    });

    document.addEventListener("auxclick", (event) => {
      if (isProtectedTarget(event.target)) {
        event.preventDefault();
      }
    });

    document.addEventListener("keydown", (event) => {
      const key = event.key.toLowerCase();
      const usesModifier = event.ctrlKey || event.metaKey;
      const shouldBlock =
        (usesModifier && (key === "s" || key === "u" || key === "p" || key === "c")) ||
        key === "f12" ||
        key === "printscreen" ||
        (usesModifier && event.shiftKey && (key === "i" || key === "j" || key === "c"));

      if (shouldBlock) {
        event.preventDefault();

        if (key === "printscreen") {
          try {
            navigator.clipboard?.writeText("");
          } catch {
            // Ignore clipboard failures.
          }
        }
      }
    });

    window.addEventListener("beforeprint", () => {
      document.documentElement.classList.add("print-guard");
    });

    window.addEventListener("afterprint", () => {
      document.documentElement.classList.remove("print-guard");
    });
  }

  if (header) {
    const showHeader = () => header.classList.remove("is-hidden");
    const hideHeader = () => header.classList.add("is-hidden");
    let lastScrollY = window.scrollY;
    const threshold = 8;

    window.addEventListener(
      "scroll",
      () => {
        if (document.body.classList.contains("menu-open")) {
          return;
        }

        const currentY = window.scrollY;
        if (currentY <= 0) {
          showHeader();
        } else if (currentY > lastScrollY + threshold) {
          hideHeader();
        } else if (currentY < lastScrollY - threshold) {
          showHeader();
        }

        lastScrollY = currentY;
      },
      { passive: true }
    );

    document.addEventListener("click", showHeader);
  }

  function renderProjectCard(project, { featured = false } = {}) {
    const theme = getThemeDetails(project.theme);
    const element = document.createElement("a");
    element.href = `project.html?id=${project.id}`;
    element.className = `work-card protected-media-block${featured ? " full" : ""}`;

    element.innerHTML = `
      <img src="${project.cover}" alt="${project.title}" draggable="false" loading="lazy" decoding="async">
      <div class="work-info">
        <span>${project.mediumLabel}</span>
        <h3>${project.title}</h3>
        <p>${theme?.label ?? project.theme} / ${project.year}</p>
      </div>
    `;

    return element;
  }

  function renderProjects(list) {
    if (!grid) {
      return;
    }

    grid.innerHTML = "";

    if (!list.length) {
      grid.innerHTML = `
        <article class="work-empty-state">
          <p class="section-kicker">No Match Yet</p>
          <h3>Try another year, source, or theme.</h3>
          <p>The collection updates live, so clearing one filter usually brings the full board back.</p>
        </article>
      `;
      workCount.textContent = "0 pieces";
      return;
    }

    const cards = list.map((project) => renderProjectCard(project));
    cards.forEach((card) => grid.appendChild(card));

    workCount.textContent = `${list.length} ${list.length === 1 ? "piece" : "pieces"}`;
    animateCards(cards);
    enhanceCards(grid);
  }

  function renderHomeCollections(list) {
    if (!homeCollections) {
      return;
    }

    homeCollections.innerHTML = "";

    if (!list.length) {
      homeCollections.innerHTML = "<p>No collections found.</p>";
      return;
    }

    const cards = list.slice(0, 3).map((project, index) =>
      renderProjectCard(project, { featured: index === 2 })
    );

    cards.forEach((card) => homeCollections.appendChild(card));
    animateCards(cards);
    enhanceCards(homeCollections);
  }

  function populateFilterOptions() {
    populateSelect(
      yearSelect,
      getUniqueYears(currentWorkType).map((year) => ({ value: year, label: year })),
      "All years"
    );

    populateSelect(
      themeSelect,
      getUniqueThemes(currentWorkType).map((theme) => ({
        value: theme.id,
        label: theme.label,
      })),
      "All themes"
    );
  }

  function applyFilters() {
    if (!grid) {
      return;
    }

    let filtered = [...getProjectsByMode(currentWorkType)];

    if (yearSelect?.value) {
      filtered = filtered.filter((project) => project.year === yearSelect.value);
    }

    if (ownershipSelect?.value) {
      filtered = filtered.filter((project) => project.ownership === ownershipSelect.value);
    }

    if (themeSelect?.value) {
      filtered = filtered.filter((project) => project.theme === themeSelect.value);
    }

    renderProjects(filtered);
  }

  function updateToggleUI() {
    if (!modeToggles.length) {
      return;
    }

    modeToggles.forEach((toggleElement) => {
      const buttons = toggleElement.querySelectorAll(".pill-btn");
      const slider = toggleElement.querySelector(".pill-slider");
      const activeButton =
        toggleElement.querySelector(`.pill-btn[data-type="${currentWorkType}"]`) || buttons[0];

      buttons.forEach((button) => {
        button.classList.toggle("active", button === activeButton);
      });

      if (slider && activeButton) {
        slider.style.width = `${activeButton.offsetWidth}px`;
        slider.style.transform = `translateX(${activeButton.offsetLeft}px)`;
      }
    });
  }

  function setMode(mode, { persist = true } = {}) {
    if (!MODE_VALUES.includes(mode)) {
      return;
    }

    currentWorkType = mode;
    applyModeClass(mode);

    if (persist) {
      try {
        localStorage.setItem(MODE_KEY, mode);
      } catch {
        // Ignore storage errors.
      }
    }

    populateFilterOptions();
    updateToggleUI();

    if (themeSelect && !getUniqueThemes(currentWorkType).some((theme) => theme.id === themeSelect.value)) {
      themeSelect.value = "";
    }

    if (homeCollections) {
      renderHomeCollections(getProjectsByMode(currentWorkType));
    }

    if (grid) {
      applyFilters();
    }
  }

  function renderEstimatorThemePills() {
    if (!estimatorThemePills) {
      return;
    }

    estimatorThemePills.innerHTML = pricingThemes
      .map(
        (theme) => `
          <button type="button" class="theme-pill" data-theme-pill="${theme.id}">
            ${theme.label}
          </button>
        `
      )
      .join("");

    estimatorThemePills.querySelectorAll("[data-theme-pill]").forEach((button) => {
      button.addEventListener("click", () => {
        estimatorState.theme = button.dataset.themePill;
        if (estimatorThemeSelect) {
          estimatorThemeSelect.value = estimatorState.theme;
        }
        updateEstimator();
      });
    });
  }

  function populateEstimatorOptions() {
    populateSelect(
      estimatorThemeSelect,
      pricingThemes.map((theme) => ({ value: theme.id, label: theme.label })),
      "Select theme"
    );

    if (estimatorThemeSelect) {
      estimatorThemeSelect.value = estimatorState.theme;
    }

    populateSelect(
      estimatorPaperSelect,
      paperTypes.map((paper) => ({ value: paper.id, label: paper.label })),
      "Select paper"
    );

    if (estimatorPaperSelect) {
      estimatorPaperSelect.value = estimatorState.paper;
    }
  }

  function updateEstimator() {
    if (!estimatorSection) {
      return;
    }

    if (activeProject && activeProject.workType !== "wallpaper") {
      return;
    }

    const theme = getThemeDetails(estimatorState.theme) ?? pricingThemes[0];
    const paper = paperTypes.find((item) => item.id === estimatorState.paper) ?? paperTypes[0];
    const width = Math.max(40, Number(estimatorState.width) || 40);
    const height = Math.max(40, Number(estimatorState.height) || 40);
    const quantity = Math.max(1, Number(estimatorState.quantity) || 1);
    const dimensionFactor = width + height;
    const selectedDesign = activeProject?.title ?? theme.title;
    const previewSource = activeProject?.cover ?? theme.preview;
    const previewHeading = activeProject?.title ?? theme.title;
    const previewBody = activeProject?.summary ?? theme.description;
    const previewEyebrow = activeProject ? "Selected wallpaper" : theme.label;

    const baseAmount = dimensionFactor * theme.rate;
    const multipliedAmount = baseAmount * paper.multiplier;
    const total = (multipliedAmount + theme.setupFee) * quantity;
    const rangeStart = total * 0.9;
    const rangeEnd = total * 1.12;

    estimatorSection.style.setProperty("--quote-accent", theme.accent);

    if (previewImage) {
      previewImage.src = previewSource;
      previewImage.alt = `${selectedDesign} preview`;
    }
    if (previewLabel) {
      previewLabel.textContent = previewEyebrow;
    }
    if (previewTitle) {
      previewTitle.textContent = previewHeading;
    }
    if (previewCopy) {
      previewCopy.textContent = previewBody;
    }
    if (previewBestFor) {
      previewBestFor.textContent = theme.bestFor;
    }
    if (previewFinish) {
      previewFinish.textContent = theme.finish;
    }
    if (previewTurnaround) {
      previewTurnaround.textContent = theme.turnaround;
    }

    if (estimatorWidthInput) {
      estimatorWidthInput.value = `${width}`;
    }
    if (estimatorHeightInput) {
      estimatorHeightInput.value = `${height}`;
    }
    if (estimatorQuantityInput) {
      estimatorQuantityInput.value = `${quantity}`;
    }
    if (dimensionOutput) {
      dimensionOutput.textContent = `${dimensionFactor} cm`;
    }
    if (themeRateOutput) {
      themeRateOutput.textContent = `${formatPrice(theme.rate)} / cm`;
    }
    if (paperNoteOutput) {
      paperNoteOutput.textContent = paper.note;
    }
    if (totalOutput) {
      totalOutput.textContent = formatPrice(total);
    }
    if (rangeOutput) {
      rangeOutput.textContent = `Estimated range: ${formatPrice(rangeStart)} to ${formatPrice(rangeEnd)}`;
    }
    if (selectedDesignOutput) {
      selectedDesignOutput.textContent = selectedDesign;
    }
    if (quoteWhatsappLink) {
      const projectReference = getProjectReferenceLine(activeProject);
      const projectImageReference = getProjectImageLine(activeProject);
      const message = [
        "Hello Studio Viana,",
        "I am interested in this wallpaper and would like to place an order or get more details.",
        "",
        `Wallpaper: ${selectedDesign}`,
        projectReference,
        projectImageReference,
        `Theme: ${theme.label}`,
        `Paper finish: ${paper.label}`,
        `Wall size: ${width} cm x ${height} cm`,
        `Quantity: ${quantity}`,
        `Estimated price: ${formatPrice(total)}`,
        `Estimated price range: ${formatPrice(rangeStart)} to ${formatPrice(rangeEnd)}`,
        "",
        "Please share the next steps. Thanks.",
      ]
        .filter(Boolean)
        .join("\n");

      currentWhatsAppMessage = message;
      currentWhatsAppLink = buildWhatsAppLink(message);
      quoteWhatsappLink.href = currentWhatsAppLink;
    }

    estimatorThemePills?.querySelectorAll("[data-theme-pill]").forEach((button) => {
      button.classList.toggle("active", button.dataset.themePill === theme.id);
    });
  }

  function syncEstimatorState() {
    if (estimatorThemeSelect) {
      estimatorThemeSelect.addEventListener("change", () => {
        estimatorState.theme = estimatorThemeSelect.value;
        updateEstimator();
      });
    }

    if (estimatorPaperSelect) {
      estimatorPaperSelect.addEventListener("change", () => {
        estimatorState.paper = estimatorPaperSelect.value;
        updateEstimator();
      });
    }

    [estimatorWidthInput, estimatorHeightInput].forEach((input) => {
      input?.addEventListener("input", () => {
        estimatorState.width = Number(estimatorWidthInput?.value || 0);
        estimatorState.height = Number(estimatorHeightInput?.value || 0);
        updateEstimator();
      });
    });

    estimatorDecreaseButton?.addEventListener("click", () => {
      estimatorState.quantity = Math.max(1, estimatorState.quantity - 1);
      updateEstimator();
    });

    estimatorIncreaseButton?.addEventListener("click", () => {
      estimatorState.quantity = Math.min(12, estimatorState.quantity + 1);
      updateEstimator();
    });

    quoteWhatsappLink?.addEventListener("click", (event) => {
      event.preventDefault();

      const popup = window.open(currentWhatsAppLink, "_blank", "noopener,noreferrer");
      if (!popup) {
        window.location.href = currentWhatsAppLink;
      }
    });
  }

  function renderProjectDetail() {
    const params = new URLSearchParams(window.location.search);
    const projectId = params.get("id");
    if (!projectId) {
      return;
    }

    const project = projects.find((item) => item.id === projectId);
    if (!project) {
      document.body.innerHTML = "<h2 style='padding:100px'>Project not found</h2>";
      throw new Error("Invalid project ID");
    }

    activeProject = project;
    const theme = getThemeDetails(project.theme);
    const cover = document.getElementById("project-cover");
    const title = document.getElementById("project-title");
    const meta = document.querySelector(".project-meta-info");
    const description = document.getElementById("project-description");
    const gallery = document.getElementById("project-gallery");
    const isWallpaperProject = project.workType === "wallpaper";

    if (projectOrderSection) {
      projectOrderSection.hidden = !isWallpaperProject;
    }

    if (isWallpaperProject) {
      estimatorState.theme = project.theme;
    }

    if (cover) {
      cover.src = project.cover;
      cover.alt = project.title;
    }
    if (title) {
      title.textContent = project.title;
    }
    if (meta) {
      meta.textContent = `${project.year} / ${theme?.label ?? project.theme} / ${project.location}`;
    }
    if (description) {
      description.textContent = project.summary;
    }
    if (gallery && project.gallery) {
      gallery.innerHTML = project.gallery
        .map(
          (image, index) => `
            <div class="project-gallery-item reveal-media protected-media-block">
              <img
                src="${image}"
                alt="${project.title} gallery image ${index + 1}"
                draggable="false"
                loading="lazy"
                decoding="async"
              >
            </div>
          `
        )
        .join("");
      observerManager.observeMedia(gallery);
    }
  }

  function enhanceContactForm() {
    const form = document.querySelector(".contact-form");
    if (!form) {
      return;
    }

    const status = document.createElement("p");
    status.className = "form-status";
    form.appendChild(status);

    form.addEventListener("submit", (event) => {
      event.preventDefault();
      status.textContent = "Inquiry drafted. Share the details by email or Instagram and Studio Viana will reply with the next steps.";
      form.reset();
    });
  }

  modeToggles.forEach((toggleElement) => {
    toggleElement.querySelectorAll(".pill-btn").forEach((button) => {
      button.addEventListener("click", () => {
        setMode(button.dataset.type);
      });
    });
  });

  yearSelect?.addEventListener("change", applyFilters);
  ownershipSelect?.addEventListener("change", applyFilters);
  themeSelect?.addEventListener("change", applyFilters);
  clearBtn?.addEventListener("click", () => {
    if (yearSelect) {
      yearSelect.value = "";
    }
    if (ownershipSelect) {
      ownershipSelect.value = "";
    }
    if (themeSelect) {
      themeSelect.value = "";
    }
    applyFilters();
  });

  initMediaProtection();

  window.addEventListener("resize", updateToggleUI);
  setMode(currentWorkType, { persist: false });
  revealMode();
  renderProjectDetail();
  populateEstimatorOptions();
  renderEstimatorThemePills();
  syncEstimatorState();
  updateEstimator();
  enhanceContactForm();

  window.addEventListener("pageshow", () => {
    if (enforceProtectedAccess()) {
      return;
    }

    applyAuthStateToDocument();
    syncAuthLinks();
    gateProtectedNavigation();
    const storedMode = getStoredMode() || "wallpaper";
    setMode(storedMode, { persist: false });
  });

  window.addEventListener("storage", (event) => {
    if (enforceProtectedAccess()) {
      return;
    }

    applyAuthStateToDocument();
    syncAuthLinks();
    gateProtectedNavigation();

    if (event.key !== MODE_KEY) {
      return;
    }

    const storedMode = getStoredMode() || "wallpaper";
    setMode(storedMode, { persist: false });
  });
});

window.goBack = function goBack() {
  window.location.href = "work.html";
};
