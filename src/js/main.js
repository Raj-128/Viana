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
const STORAGE_KEYS = {
  saved: "studioSavedDesigns",
  downloads: "studioDownloads",
  quote: "studioQuoteSelections",
  paid: "studioPaidDesigns",
};
const PAYMENT_COMPLETE_KEY = "studioPaymentComplete";
// 3D is available on the landing page and Work page, while detail pages remain wallpaper-first.
const isHomePage = /(?:^|\/)(index|work)\.html$/i.test(window.location.pathname) || window.location.pathname.endsWith("/");
const pageAllows3dMode = isHomePage;
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
    localStorage.setItem(key, JSON.stringify(list.slice(0, 12)));
  } catch {
    // Ignore storage errors.
  }
}

function getPaidDesigns() {
  return readStoredList(STORAGE_KEYS.paid);
}

function markDesignPaid(projectId) {
  if (!projectId) {
    return;
  }

  const paid = getPaidDesigns();
  const nextPaid = paid.includes(projectId) ? paid : [projectId, ...paid].slice(0, 12);
  writeStoredList(STORAGE_KEYS.paid, nextPaid);
  localStorage.setItem(PAYMENT_COMPLETE_KEY, "true");
  renderSavedCollections();
  return true;
}

function isDesignDownloadUnlocked(projectId) {
  if (!projectId || isAdminSession()) {
    return true;
  }

  const paid = getPaidDesigns();
  if (localStorage.getItem(PAYMENT_COMPLETE_KEY) === "true") {
    return true;
  }

  return paid.includes(projectId);
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
  const quote = readStoredList(STORAGE_KEYS.quote);
  const next = quote.some((entry) => entry && entry.id === project.id)
    ? quote.filter((entry) => entry && entry.id !== project.id)
    : [{ id: project.id, title: project.title, workType: project.workType }, ...quote].slice(0, 8);

  writeStoredList(STORAGE_KEYS.quote, next);
  renderSavedCollections();
  selectProject(project);
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

function downloadProjectBrief(project) {
  if (!isDesignDownloadUnlocked(project.id)) {
    openUtilityPanel("downloads");
    const downloadsContainer = document.getElementById("download-history");
    if (downloadsContainer) {
      downloadsContainer.innerHTML = `
        <div class="utility-item utility-lock">
          <div>
            <strong>${project.title}</strong>
            <span>Payment required</span>
          </div>
          <button type="button" data-payment-demo>Unlock</button>
        </div>
      `;
      downloadsContainer.querySelector("[data-payment-demo]")?.addEventListener("click", () => {
        markDesignPaid(project.id);
        openUtilityPanel("downloads");
        downloadProjectBrief(project);
      });
    }
    return;
  }

  const theme = getThemeDetails(project.theme);
  const brief = [
    "STUDIO VIANA — DESIGN BRIEF",
    "",
    `Design: ${project.title}`,
    `Collection: ${project.mediumLabel}`,
    `Style: ${theme?.label ?? project.theme}`,
    `Location: ${project.location}`,
    `Year: ${project.year}`,
    "",
    project.summary,
    "",
    "For custom sizing, paper options and a final quote, contact Studio Viana.",
  ].join("\n");

  const downloads = readStoredList(STORAGE_KEYS.downloads);
  const nextDownloads = downloads.some((entry) => entry && entry.id === project.id)
    ? downloads.filter((entry) => entry && entry.id !== project.id)
    : [{ id: project.id, title: project.title, workType: project.workType }, ...downloads].slice(0, 8);

  writeStoredList(STORAGE_KEYS.downloads, nextDownloads);
  renderSavedCollections();

  const link = document.createElement("a");
  link.href = URL.createObjectURL(new Blob([brief], { type: "text/plain" }));
  link.download = `${project.title.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-brief.txt`;
  link.style.display = "none";
  document.body.appendChild(link);
  link.click();
  window.setTimeout(() => {
    URL.revokeObjectURL(link.href);
    link.remove();
  }, 1000);
}

function renderSavedCollections() {
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
    .map((entry) => ({ ...entry, type: "downloads" }))
    .filter((entry) => entry && (projects.some((project) => project.id === entry.id) || entry.title));
  const quoteEntries = quote
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

function getPageMode() {
  return pageAllows3dMode ? getStoredMode() || "wallpaper" : "wallpaper";
}

const initialMode = getPageMode();
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
  const menuActionButtons = document.querySelectorAll("[data-menu-action]");

  const grid = document.getElementById("work-grid");
  const homeCollections = document.getElementById("home-collections");
  const yearSelect = document.getElementById("filter-year");
  const ownershipSelect = document.getElementById("filter-ownership");
  const themeSelect = document.getElementById("filter-theme");
  const searchInput = document.getElementById("filter-search");
  const clearBtn = document.getElementById("clear-filters");
  const workCount = document.getElementById("work-count");
  const modeToggles = document.querySelectorAll("[data-mode-toggle]");
  const catalogueTitle = document.getElementById("catalogue-title");
  const catalogueIntro = document.getElementById("catalogue-intro");
  const projectGuide = document.querySelector("[data-project-guide]");

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

  document.querySelector("[data-payment-demo]")?.addEventListener("click", () => {
    const selectedProject = activeProject || projects[0];
    if (selectedProject) {
      markDesignPaid(selectedProject.id);
      openUtilityPanel("downloads");
      renderSavedCollections();
    }
  });

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

  menuActionButtons.forEach((button) => {
    button.addEventListener("click", () => {
      const action = button.dataset.menuAction;
      openUtilityPanel(action);

      if (action === "saved") {
        document.getElementById("saved-designs")?.scrollIntoView({ behavior: "smooth", block: "nearest" });
      }
      if (action === "downloads") {
        document.getElementById("download-history")?.scrollIntoView({ behavior: "smooth", block: "nearest" });
      }
      if (action === "quote") {
        document.getElementById("quote-designs")?.scrollIntoView({ behavior: "smooth", block: "nearest" });
      }
    });
  });

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
    const isCatalogue = Boolean(grid);
    const element = document.createElement(isCatalogue ? "article" : "a");
    if (!isCatalogue) {
      element.href = `project.html?id=${project.id}`;
    }
    element.className = `work-card protected-media-block${featured ? " full" : ""}`;
    const isSaved = readStoredList(STORAGE_KEYS.saved).includes(project.id);
    const isActiveSelection = activeProject?.id === project.id;
    const isSelected = isSaved || isActiveSelection;

    element.innerHTML = isCatalogue
      ? `
        <button type="button" class="catalogue-card-image ${isSelected ? "is-selected" : ""}" data-select-design="${project.id}" aria-label="Select ${project.title} and toggle it on or off">
          <img src="${project.cover}" alt="${project.title}" draggable="false" loading="lazy" decoding="async">
          <span class="catalogue-plus" aria-hidden="true">${isSelected ? "✓" : "+"}</span>
          <span class="catalogue-selected-tag">${isSelected ? "Selected" : "Select"}</span>
          <span class="catalogue-badge">${project.ownership === "owned" ? "Studio collection" : "Curated edition"}</span>
        </button>
        <div class="catalogue-card-copy">
          <h3>${project.title}</h3>
          <p>${theme?.label ?? project.theme} · ${project.mediumLabel} · ${project.location}</p>
          <button type="button" class="catalogue-select-toggle" data-select-design="${project.id}" aria-label="Select ${project.title} and keep it active for quote and estimator">
            ${isSelected ? "Selected" : "Select"}
          </button>
        </div>
        <div class="catalogue-actions">
          <button type="button" class="catalogue-detail" data-detail-design="${project.id}">View details</button>
          <button type="button" class="catalogue-add" data-add-design="${project.id}">Add to quote</button>
          <button type="button" class="catalogue-download" data-download-brief="${project.id}">Download brief</button>
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
      const selectButtons = element.querySelectorAll("[data-select-design]");
      selectButtons.forEach((button) => {
        button.addEventListener("click", () => {
          const saved = readStoredList(STORAGE_KEYS.saved);
          const isSelected = saved.includes(project.id);
          if (isSelected) {
            writeStoredList(STORAGE_KEYS.saved, saved.filter((id) => id !== project.id));
            renderSavedCollections();
            activeProject = activeProject?.id === project.id ? null : activeProject;
            if (activeProject?.id === project.id) {
              updateEstimator();
            }
            return;
          }

          toggleProjectSelection(project);
        });
      });

      element.querySelector("[data-detail-design]")?.addEventListener("click", () => {
        navigateToProjectDetail(project.id);
      });
      element.querySelector("[data-add-design]")?.addEventListener("click", () => {
        addProjectToQuote(project);
      });
      element.querySelector("[data-download-brief]")?.addEventListener("click", () => {
        downloadProjectBrief(project);
      });
    }

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

    const query = searchInput?.value.trim().toLowerCase();
    if (query) {
      filtered = filtered.filter((project) =>
        [project.title, project.summary, project.location, project.mediumLabel, project.theme]
          .join(" ")
          .toLowerCase()
          .includes(query)
      );
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
        const isActive = button === activeButton;
        button.classList.toggle("active", isActive);
        button.hidden = !isActive;
      });

      if (slider && activeButton) {
        slider.style.width = `${activeButton.offsetWidth}px`;
        slider.style.transform = `translateX(${activeButton.offsetLeft}px)`;
      }
    });
  }

  function updateProjectGuide(mode) {
    if (!projectGuide) return;
    projectGuide.querySelectorAll("[data-guide-mode]").forEach((button) => {
      const isActive = button.dataset.guideMode === mode;
      button.classList.toggle("is-active", isActive);
      button.setAttribute("aria-selected", String(isActive));
      button.tabIndex = isActive ? 0 : -1;
    });
    projectGuide.querySelectorAll("[data-guide-panel]").forEach((panel) => {
      panel.hidden = panel.dataset.guidePanel !== mode;
    });
  }

  function setMode(mode, { persist = true } = {}) {
    if (!MODE_VALUES.includes(mode)) {
      return;
    }

    // Never allow a saved 3D choice to change Work, Services, About, Contact,
    // or project-detail pages. Those pages always present the wallpaper brand.
    const permittedMode = pageAllows3dMode ? mode : "wallpaper";
    currentWorkType = permittedMode;
    applyModeClass(permittedMode);

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
        : "Explore Studio Viana’s 3D art collection. Filter the collection, download a project brief, or open a concept for the full story.";
    }

    if (persist && pageAllows3dMode) {
      try {
        localStorage.setItem(MODE_KEY, permittedMode);
      } catch {
        // Ignore storage errors.
      }
    }

    renderSavedCollections();
    populateFilterOptions();
    updateToggleUI();
    updateProjectGuide(permittedMode);

    if (themeSelect && !getUniqueThemes(currentWorkType).some((theme) => theme.id === themeSelect.value)) {
      themeSelect.value = "";
    }

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
    const width = Math.min(500, Math.max(40, Number(estimatorState.width) || 40));
    const height = Math.min(500, Math.max(40, Number(estimatorState.height) || 40));
    const quantity = Math.min(12, Math.max(1, Number(estimatorState.quantity) || 1));
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

  function initHeroCarousel() {
    const stage = document.querySelector(".hero-carousel-stage");
    const slides = document.querySelectorAll(".hero-slide");

    if (!stage || !slides.length) {
      return;
    }

    let activeIndex = 0;
    let pointerStartX = 0;
    let isDragging = false;
    let dragOffset = 0;

    const showSlide = (index) => {
      activeIndex = (index + slides.length) % slides.length;
      slides.forEach((slide, slideIndex) => {
        slide.classList.toggle("active", slideIndex === activeIndex);
      });
    };

    const handlePointerDown = (event) => {
      isDragging = true;
      pointerStartX = event.clientX;
      dragOffset = 0;
      stage.setPointerCapture?.(event.pointerId);
    };

    const handlePointerMove = (event) => {
      if (!isDragging) {
        return;
      }

      dragOffset = event.clientX - pointerStartX;
    };

    const handlePointerUp = () => {
      if (!isDragging) {
        return;
      }

      isDragging = false;

      if (dragOffset < -40) {
        showSlide(activeIndex + 1);
      } else if (dragOffset > 40) {
        showSlide(activeIndex - 1);
      }

      dragOffset = 0;
    };

    stage.addEventListener("pointerdown", handlePointerDown);
    stage.addEventListener("pointermove", handlePointerMove);
    stage.addEventListener("pointerup", handlePointerUp);
    stage.addEventListener("pointerleave", handlePointerUp);
    stage.addEventListener("pointercancel", handlePointerUp);

    setInterval(() => {
      showSlide(activeIndex + 1);
    }, 3000);
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
    });
  });

  yearSelect?.addEventListener("change", applyFilters);
  ownershipSelect?.addEventListener("change", applyFilters);
  themeSelect?.addEventListener("change", applyFilters);
  searchInput?.addEventListener("input", applyFilters);
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
    if (searchInput) {
      searchInput.value = "";
    }
    activeProject = null;
    updateEstimator();
    applyFilters();
  });

  projectGuide?.querySelectorAll("[data-guide-mode]").forEach((button) => {
    button.addEventListener("click", () => setMode(button.dataset.guideMode));
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

    if (event.key !== MODE_KEY) {
      return;
    }

    setMode(getPageMode(), { persist: false });
  });
});

window.goBack = function goBack() {
  window.location.href = "work.html";
};

