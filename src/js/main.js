import { MODE_KEY, readStudioMode, applyStudioTheme } from "./site-mode.js";
import { estimateDimensions } from "./estimate-dimensions.js";
import { updateModeContent } from "./mode-content.js";
import { initCatalogueFilters } from "./catalogue-filters.js";
import { initCommerce, renderCommerce, addToCart, openCommerce, downloadDesign } from "./commerce.js";
import { initWallpaperViewer } from "./wallpaper-viewer.js";
import { initMediaDeterrents } from "./media-deterrents.js";
import { paperTypes, pricingThemes, projects, wallpaperShowcaseImages } from "./projects.js";
import {
  initCreativeAnimations,
  initImageHoverEffects,
  initRippleEffect,
  initTiltEffects,
} from "./creative-animations.js";
import {
  authReady,
  applyAuthStateToDocument,
  enforceProtectedAccess,
  gateProtectedNavigation,
  syncAuthLinks,
} from "./auth.js";

initCreativeAnimations();

const MODE_VALUES = ["wallpaper", "3d"];
const STORAGE_KEYS = {
  saved: "studioSavedDesigns",
  downloads: "studioDownloads",
  quote: "studioQuoteSelections",
};
const WHATSAPP_NUMBER = "919737711570";
const currencyFormatter = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 0,
});

function readStoredList(key) {
  try {
    const stored = JSON.parse(localStorage.getItem(key) || "[]");
    return Array.isArray(stored) ? stored : [];
  } catch {
    return [];
  }
}

function writeStoredList(key, list) {
  try {
    localStorage.setItem(key, JSON.stringify(list));
  } catch {
    // Ignore storage errors.
  }
}

function addProjectToSaved(projectId) {
  const saved = readStoredList(STORAGE_KEYS.saved);
  const nextList = saved.includes(projectId)
    ? saved.filter((id) => id !== projectId)
    : [projectId, ...saved].slice(0, 8);

  writeStoredList(STORAGE_KEYS.saved, nextList);
  renderSavedCollections();
  return nextList.includes(projectId);
}

function navigateToProjectDetail(projectId) {
  if (!projectId) {
    return;
  }

  window.location.href = `project.html?id=${projectId}`;
}

function toggleProjectSelection(project) {
  if (!project) {
    return false;
  }

  const saved = readStoredList(STORAGE_KEYS.saved);
  const isAlreadySaved = saved.includes(project.id);

  if (isAlreadySaved) {
    writeStoredList(STORAGE_KEYS.saved, saved.filter((id) => id !== project.id));
    renderSavedCollections();
    if (activeProject?.id === project.id) {
      activeProject = null;
      updateEstimator();
    }
    if (typeof applyFilters === "function") {
      applyFilters();
    }
    return false;
  }

  writeStoredList(STORAGE_KEYS.saved, [project.id, ...saved].slice(0, 8));
  renderSavedCollections();

  activeProject = project;
  estimatorState.theme = project.theme;
  if (estimatorThemeSelect) {
    estimatorThemeSelect.value = project.theme;
  }

  updateEstimator();
  estimatorSection?.scrollIntoView({ behavior: "smooth", block: "start" });
  if (typeof applyFilters === "function") {
    applyFilters();
  }
  return true;
}

function selectProject(project) {
  if (!project) {
    return false;
  }

  activeProject = project;
  estimatorState.theme = project.theme;
  if (estimatorThemeSelect) {
    estimatorThemeSelect.value = project.theme;
  }

  updateEstimator();
  estimatorSection?.scrollIntoView({ behavior: "smooth", block: "start" });
  if (typeof applyFilters === "function") {
    applyFilters();
  }
  return true;
}

function addProjectToQuote(project) {
  addToCart(project);
}

function syncBasketButtons() {
  const quote = readStoredList(STORAGE_KEYS.quote);
  document.querySelectorAll("[data-add-design]").forEach((button) => {
    const inBasket = quote.some((entry) => entry?.id === button.dataset.addDesign);
    const title = projects.find((project) => project.id === button.dataset.addDesign)?.title || "design";
    button.classList.toggle("is-added", inBasket);
    button.setAttribute("aria-pressed", String(inBasket));
    button.setAttribute("aria-label", `${inBasket ? "Added to cart. Remove" : "Add to cart:"} ${title}`);
    button.title = inBasket ? "Remove from cart" : "Add to cart";
    const label = button.querySelector(".catalogue-basket-label");
    if (label) label.textContent = inBasket ? "Added to cart" : "";
  });
}

function openUtilityPanel(action) {
  const menuActionButtons = document.querySelectorAll("[data-menu-action]");
  const menuPanels = document.querySelectorAll("[data-menu-panel]");

  menuActionButtons.forEach((button) => {
    button.classList.toggle("active", button.dataset.menuAction === action);
  });

  menuPanels.forEach((panel) => {
    panel.classList.toggle("active", panel.dataset.menuPanel === action);
  });
}

function downloadProjectImage(project) {
  return downloadDesign(project);
}

function renderSavedCollections() {
  syncBasketButtons();
  renderCommerce();
  const savedContainer = document.getElementById("saved-designs");
  const downloadsContainer = document.getElementById("download-history");
  const quoteContainer = document.getElementById("quote-designs");

  if (!savedContainer || !downloadsContainer || !quoteContainer) {
    return;
  }

  const saved = readStoredList(STORAGE_KEYS.saved);
  const downloads = readStoredList(STORAGE_KEYS.downloads);
  const quote = readStoredList(STORAGE_KEYS.quote);

  const renderList = (items, emptyLabel) => {
    if (!items.length) {
      return `<p class="utility-empty">${emptyLabel}</p>`;
    }

    return items
      .map((item) => {
        const project = projects.find((entry) => entry.id === item.id);
        const label = project ? project.title : item.title;
        const itemType = project ? (project.workType === "3d" ? "3D concept" : "Wallpaper") : "Saved selection";
        return `
          <div class="utility-item">
            <div>
              <strong>${label}</strong>
              <span>${itemType}</span>
            </div>
            <button type="button" data-remove-item="${item.id}" data-storage-key="${item.type || "saved"}">Remove</button>
          </div>
        `;
      })
      .join("");
  };

  const savedEntries = saved
    .map((projectId) => ({ id: projectId, type: "saved" }))
    .filter((entry) => projects.some((project) => project.id === entry.id));
  const downloadEntries = downloads
    .filter((entry) => entry && projects.some((project) => project.id === entry.id))
    .map((entry) => ({ ...entry, type: "downloads" }))
    .filter((entry) => entry && (projects.some((project) => project.id === entry.id) || entry.title));
  const quoteEntries = quote
    .filter((entry) => entry && projects.some((project) => project.id === entry.id))
    .map((entry) => ({ ...entry, type: "quote" }))
    .filter((entry) => entry && (projects.some((project) => project.id === entry.id) || entry.title));

  savedContainer.innerHTML = renderList(savedEntries, "No saved designs yet.");
  downloadsContainer.innerHTML = renderList(downloadEntries, "No downloads yet.");
  quoteContainer.innerHTML = renderList(quoteEntries, "No designs in the quote list yet.");

  document.querySelectorAll("[data-remove-item]").forEach((button) => {
    button.addEventListener("click", () => {
      const { removeItem, storageKey } = button.dataset;
      if (!removeItem) {
        return;
      }

      if (storageKey === "downloads") {
        const list = readStoredList(STORAGE_KEYS.downloads).filter((entry) => entry.id !== removeItem);
        writeStoredList(STORAGE_KEYS.downloads, list);
      } else if (storageKey === "quote") {
        const list = readStoredList(STORAGE_KEYS.quote).filter((entry) => entry.id !== removeItem);
        writeStoredList(STORAGE_KEYS.quote, list);
      } else {
        const list = readStoredList(STORAGE_KEYS.saved).filter((id) => id !== removeItem);
        writeStoredList(STORAGE_KEYS.saved, list);
      }

      renderSavedCollections();
    });
  });
}

function applyModeClass(mode) {
  applyStudioTheme(mode);
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

function getPageMode() {
  return readStudioMode();
}

const initialMode = getPageMode();
const root = document.documentElement;
const revealMode = () => root.classList.add("mode-ready");

applyModeClass(initialMode);
requestAnimationFrame(revealMode);

document.addEventListener("DOMContentLoaded", async () => {
  await authReady;
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
  const menuActionButtons = document.querySelectorAll("[data-menu-action]");

  const grid = document.getElementById("work-grid");
  const homeCollections = document.getElementById("home-collections");
  const searchInput = document.getElementById("filter-search");
  const clearBtn = document.getElementById("clear-filters");
  const catalogueFilters = initCatalogueFilters(() => applyFilters());
  const workCount = document.getElementById("work-count");
  const modeToggles = document.querySelectorAll("[data-mode-toggle]");
  const catalogueTitle = document.getElementById("catalogue-title");
  const catalogueIntro = document.getElementById("catalogue-intro");

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

  document.querySelector("[data-clear-saved]")?.addEventListener("click", () => {
    writeStoredList(STORAGE_KEYS.saved, []);
    renderSavedCollections();
  });

  document.querySelector("[data-clear-downloads]")?.addEventListener("click", () => {
    writeStoredList(STORAGE_KEYS.downloads, []);
    renderSavedCollections();
  });

  document.querySelector("[data-clear-quote]")?.addEventListener("click", () => {
    writeStoredList(STORAGE_KEYS.quote, []);
    renderSavedCollections();
  });

  initCommerce({ onChange: renderSavedCollections });
  if (grid) initWallpaperViewer();

  renderSavedCollections();

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
    menu.id = "studio-navigation";
    menu.setAttribute("role", "dialog");
    menu.setAttribute("aria-modal", "true");
    menu.setAttribute("aria-label", "Studio navigation");
    menu.inert = true;
    toggle.setAttribute("aria-controls", menu.id);
    toggle.setAttribute("aria-expanded", "false");
    const heading = document.createElement("p");
    heading.className = "menu-overline";
    heading.textContent = "STUDIO VIANA / EXPLORE";
    menu.querySelector(".menu-left").prepend(heading);
    const shortcuts = document.createElement("div");
    shortcuts.className = "menu-shortcuts";
    shortcuts.innerHTML = '<button type="button" data-menu-commerce="cart">Your cart <span aria-hidden="true">&#8599;</span></button><button type="button" data-menu-commerce="downloads">Downloads <span aria-hidden="true">&#8599;</span></button><a href="mailto:vickyranagovind@gmail.com">Have a project? Email the studio &#8599;</a>';
    menu.querySelector(".menu-left").append(shortcuts);
    const setMenu = (open) => {
      toggle.classList.toggle("active", open);
      menu.classList.toggle("active", open);
      document.body.classList.toggle("menu-open", open);
      menu.inert = !open;
      toggle.setAttribute("aria-expanded", String(open));
      toggle.setAttribute("aria-label", open ? "Close menu" : "Open menu");
      if (open) closeBtn?.focus(); else toggle.focus();
    };
    toggle.addEventListener("click", () => setMenu(!menu.classList.contains("active")));
    closeBtn?.addEventListener("click", () => setMenu(false));
    shortcuts.addEventListener("click", (event) => {
      const button = event.target.closest("[data-menu-commerce]");
      if (button) { setMenu(false); openCommerce(button.dataset.menuCommerce); }
    });
    document.addEventListener("keydown", (event) => {
      if (!menu.classList.contains("active")) return;
      if (event.key === "Escape") { event.preventDefault(); setMenu(false); }
      if (event.key === "Tab") {
        const targets = [...menu.querySelectorAll('a[href], button, input, select, textarea')].filter((el) => !el.disabled && el.getClientRects().length);
        const first = targets[0], last = targets.at(-1);
        if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
        else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
      }
    });
  }

  menuActionButtons.forEach((button) => {
    button.addEventListener("click", () => {
      const action = button.dataset.menuAction;
      if (action === "quote" || action === "downloads") {
        openCommerce(action === "quote" ? "cart" : "downloads");
      } else {
        openUtilityPanel(action);
      }
    });
  });

  function initMediaProtection() {
    initMediaDeterrents();
    const protectedSelector = "img, .catalogue-card-image, .hero-carousel-stage, .project-gallery-item, .preview-frame, .marquee-row";
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
    const isCatalogue = Boolean(grid);
    const element = document.createElement(isCatalogue ? "article" : "a");
    if (!isCatalogue) {
      element.href = `project.html?id=${project.id}`;
    }
    element.className = `work-card protected-media-block${featured ? " full" : ""}`;
    const inBasket = readStoredList(STORAGE_KEYS.quote).some((entry) => entry?.id === project.id);

    element.innerHTML = isCatalogue
      ? `
        <button type="button" class="catalogue-card-image" data-preview-design="${project.id}" aria-label="Open large preview of ${project.title}">
          <img src="${project.cover}" alt="${project.title}" draggable="false" loading="lazy" decoding="async">
          <span class="catalogue-badge">${project.ownership === "owned" ? "Studio collection" : "Curated edition"}</span>
        </button>
        <div class="catalogue-card-copy">
          <h3><a href="project.html?id=${project.id}">${project.title}</a></h3>
          <p>${theme?.label ?? project.theme} · ${project.mediumLabel} · ${project.location}</p>
        </div>
        <div class="catalogue-actions">
          <button type="button" class="catalogue-add ${inBasket ? "is-added" : ""}" data-add-design="${project.id}" aria-label="${inBasket ? "Added to cart. Remove" : "Add to cart:"} ${project.title}" aria-pressed="${inBasket}" title="${inBasket ? "Remove from cart" : "Add to cart"}">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m8 3-4 6m12-6 4 6M3 9h18l-2 11H5L3 9Z"/><path d="M9 13v3m6-3v3"/></svg>
            <span class="catalogue-basket-label" aria-live="polite">${inBasket ? "Added to cart" : ""}</span>
          </button>
          <button type="button" class="catalogue-download" data-download-image="${project.id}" aria-label="Download ${project.title}" title="Download design">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 3v12m-5-5 5 5 5-5M4 16v5h16v-5"/></svg>
          </button>
        </div>
      `
      : `
        <img src="${project.cover}" alt="${project.title}" draggable="false" loading="lazy" decoding="async">
        <div class="work-info">
          <span>${project.mediumLabel}</span>
          <h3>${project.title}</h3>
          <p>${theme?.label ?? project.theme} / ${project.year}</p>
        </div>
      `;

    if (isCatalogue) {
      element.querySelector("[data-add-design]")?.addEventListener("click", () => {
        addProjectToQuote(project);
      });
      element.querySelector("[data-download-image]")?.addEventListener("click", () => {
        downloadProjectImage(project);
      });
    }

    return element;
  }

  let catalogueList = [];
  let catalogueLimit = 24;
  const loadMore = grid ? document.createElement('button') : null;
  if (loadMore) {
    loadMore.type = 'button';
    loadMore.className = 'catalogue-load-more';
    loadMore.hidden = true;
    grid.after(loadMore);
    loadMore.addEventListener('click', () => renderProjects(catalogueList, catalogueLimit + 24));
  }

  function renderProjects(list, limit = 24) {
    if (!grid) {
      return;
    }

    grid.innerHTML = "";
    catalogueList = list;
    catalogueLimit = limit;
    loadMore.hidden = list.length <= limit;
    loadMore.textContent = `Load more (${Math.max(0, list.length - limit)} remaining)`;

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

    const cards = list.slice(0, limit).map((project) => renderProjectCard(project));
    cards.forEach((card) => grid.appendChild(card));

    workCount.textContent = `${list.length} ${list.length === 1 ? "piece" : "pieces"}`;
    animateCards(cards);
    enhanceCards(grid);
    renderSavedCollections();
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

  function renderShowcaseTrack(track, list) {
    if (!track) {
      return;
    }

    track.innerHTML = list
      .map(
        (project) => `
          <a href="project.html?id=${project.id}" class="showcase-item">
            <img src="${project.cover}" alt="${project.title}" draggable="false" loading="lazy">
            <div class="showcase-item-cap">
              <span>${project.theme ? getThemeDetails(project.theme)?.label ?? project.theme : project.mediumLabel} &middot; ${project.year}</span>
              <strong>${project.title}</strong>
            </div>
          </a>
        `
      )
      .join("");
  }

  function updateShowcaseSections() {
    const wallpaperTrack = document.querySelector(".showcase-track.show-wallpaper");
    const threeDTrack = document.querySelector(".showcase-track.show-3d");

    renderShowcaseTrack(wallpaperTrack, getProjectsByMode("wallpaper").slice(0, 6));
    renderShowcaseTrack(threeDTrack, getProjectsByMode("3d").slice(0, 4));
  }

  function applyFilters() {
    if (!grid) return;
    const collection = getProjectsByMode(currentWorkType);
    renderProjects(catalogueFilters ? catalogueFilters.filter(collection) : collection);
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
        const isActive = button === activeButton;
        button.classList.toggle("active", isActive);
        button.setAttribute("aria-pressed", String(isActive));
      });

      if (slider && activeButton) {
        const toggleBounds = toggleElement.getBoundingClientRect();
        const buttonBounds = activeButton.getBoundingClientRect();
        slider.style.top = `${buttonBounds.top - toggleBounds.top}px`;
        slider.style.width = `${buttonBounds.width}px`;
        slider.style.height = `${buttonBounds.height}px`;
        slider.style.transform = `translate3d(${buttonBounds.left - toggleBounds.left}px, 0, 0)`;
      }
    });
  }

  function setMode(mode, { persist = true } = {}) {
    if (!MODE_VALUES.includes(mode)) {
      return;
    }

    const permittedMode = mode;
    currentWorkType = permittedMode;
    applyModeClass(permittedMode);
    updateModeContent(permittedMode);

    const isWallpaperMode = permittedMode === "wallpaper";
    if (estimatorSection) {
      estimatorSection.hidden = !isWallpaperMode;
    }
    if (catalogueTitle) {
      catalogueTitle.textContent = isWallpaperMode ? "Wallpapers & visual stories" : "3D Art & visual studies";
    }
    if (catalogueIntro) {
      catalogueIntro.textContent = isWallpaperMode
        ? "Explore Studio Viana’s mural catalogue. Filter a direction, open a design for full details, or add it to your custom quote in one click."
        : "Explore Studio Viana’s 3D art collection. Filter the collection, preview a concept, or add a design to your cart.";
    }

    if (persist) {
      try {
        localStorage.setItem(MODE_KEY, permittedMode);
      } catch {
        // Ignore storage errors.
      }
    }

    renderSavedCollections();

    catalogueFilters?.setCollection(getProjectsByMode(permittedMode), permittedMode);
    updateToggleUI();


    if (homeCollections) {
      renderHomeCollections(getProjectsByMode(currentWorkType));
    }

    updateShowcaseSections();

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
    const unit = estimatorWidthInput?.dataset.unit === 'in' ? 'in' : 'cm';
    const { width, height, dimensionFactor, rateMultiplier, centimeters } =
      estimateDimensions(estimatorState.width, estimatorState.height, unit);
    const quantity = Math.min(12, Math.max(1, Number(estimatorState.quantity) || 1));
    const selectedDesign = activeProject?.title ?? theme.title;
    const previewSource = activeProject?.cover ?? theme.preview;
    const previewHeading = activeProject?.title ?? theme.title;
    const previewBody = activeProject?.summary ?? theme.description;
    const previewEyebrow = activeProject ? "Selected wallpaper" : theme.label;

    const baseAmount = centimeters * theme.rate;
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
      dimensionOutput.textContent = `${dimensionFactor} ${unit}`;
    }
    if (themeRateOutput) {
      const rate = (theme.rate * rateMultiplier).toLocaleString('en-IN', {
        style: 'currency', currency: 'INR', maximumFractionDigits: 2,
      });
      themeRateOutput.textContent = `${rate} / ${unit}`;
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
        `Wall size: ${width} ${unit} x ${height} ${unit}`,
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
      input?.addEventListener("change", () => {
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

  function initHeroCarousel() {
    const stage = document.querySelector(".hero-carousel-stage");
    const slides = document.querySelectorAll(".hero-slide");

    if (!stage || !slides.length) {
      return;
    }

    let activeIndex = 0;
    let pointer = null;
    let timer;
    let suppressClick = false;

    const showSlide = (index) => {
      activeIndex = (index + slides.length) % slides.length;
      slides.forEach((slide, slideIndex) => {
        slide.classList.toggle("active", slideIndex === activeIndex);
        slide.setAttribute("aria-hidden", String(slideIndex !== activeIndex));
      });
    };
    const restartAutoplay = () => {
      clearInterval(timer);
      timer = setInterval(() => {
        if (!pointer && !document.hidden) showSlide(activeIndex + 1);
      }, 3000);
    };
    stage.querySelectorAll("img").forEach((image) => { image.draggable = false; });
    stage.addEventListener("dragstart", (event) => event.preventDefault());
    stage.addEventListener("pointerdown", (event) => {
      if (!event.isPrimary || event.button !== 0 || pointer) return;
      if (event.target.closest("button, a, input, select, textarea")) return;
      pointer = { id: event.pointerId, x: event.clientX, y: event.clientY };
      suppressClick = false;
      clearInterval(timer);
      stage.setPointerCapture(event.pointerId);
      stage.classList.add("is-dragging");
    });
    stage.addEventListener("pointermove", (event) => {
      if (!pointer || event.pointerId !== pointer.id) return;
      if (Math.abs(event.clientX - pointer.x) > 8) suppressClick = true;
    });
    const finishDrag = (event) => {
      if (!pointer || event.pointerId !== pointer.id) return;
      const dx = event.clientX - pointer.x;
      const dy = event.clientY - pointer.y;
      const id = pointer.id;
      pointer = null;
      stage.classList.remove("is-dragging");
      if (stage.hasPointerCapture(id)) stage.releasePointerCapture(id);
      if (event.type === "pointerup" && Math.abs(dx) > 40 && Math.abs(dx) > Math.abs(dy)) {
        showSlide(activeIndex + (dx < 0 ? 1 : -1));
      }
      restartAutoplay();
    };
    stage.addEventListener("pointerup", finishDrag);
    stage.addEventListener("pointercancel", finishDrag);
    stage.addEventListener("lostpointercapture", finishDrag);
    stage.addEventListener("click", (event) => {
      if (!suppressClick) return;
      event.preventDefault();
      event.stopPropagation();
      suppressClick = false;
    }, true);
    stage.tabIndex = 0;
    stage.addEventListener("keydown", (event) => {
      if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;
      event.preventDefault();
      showSlide(activeIndex + (event.key === "ArrowRight" ? 1 : -1));
      restartAutoplay();
    });
    showSlide(0);
    restartAutoplay();
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
      meta.textContent = [project.collection, project.year, theme?.label ?? project.theme, project.location].filter(Boolean).join(' / ');
    }
    if (description) {
      description.textContent = project.summary;
    }
    if (gallery && project.gallery) {
      const supportingImages = project.gallery.filter((image) => image !== project.cover);
      gallery.closest('.project-gallery')?.toggleAttribute('hidden', supportingImages.length === 0);
      gallery.innerHTML = supportingImages
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

    if (form.id === "contact-form") {
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

      button.addEventListener("keydown", (event) => {
        if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) {
          return;
        }

        const buttons = [...toggleElement.querySelectorAll(".pill-btn")];
        const currentIndex = buttons.indexOf(button);
        const nextIndex = event.key === 'Home'
          ? 0
          : event.key === 'End'
            ? buttons.length - 1
            : (currentIndex + (event.key === 'ArrowRight' ? 1 : -1) + buttons.length) % buttons.length;

        event.preventDefault();
        buttons[nextIndex]?.focus();
        setMode(buttons[nextIndex]?.dataset.type);
      });
    });
  });

  searchInput?.addEventListener("input", applyFilters);
  clearBtn?.addEventListener("click", () => {
    catalogueFilters?.clear();
    if (searchInput) {
      searchInput.value = "";
    }
    activeProject = null;
    updateEstimator();
    applyFilters();
  });


  initMediaProtection();

  window.addEventListener("resize", updateToggleUI);
  setMode(currentWorkType, { persist: false });
  revealMode();
  initHeroCarousel();
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
    setMode(getPageMode(), { persist: false });
  });

  window.addEventListener("storage", (event) => {
    if (enforceProtectedAccess()) {
      return;
    }

    applyAuthStateToDocument();
    syncAuthLinks();
    gateProtectedNavigation();

    if (event.key && event.key !== MODE_KEY) {
      return;
    }

    setMode(getPageMode(), { persist: false });
  });
});

window.goBack = function goBack() {
  window.location.href = "work.html";
};
