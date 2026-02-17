// src/js/main.js
import { projects } from "./projects.js";

console.log("MAIN JS LOADED");
if (window.innerWidth < 768) {
  document.querySelector(".cursor").style.display = "none";
}

document.addEventListener("DOMContentLoaded", () => {

  // /* =========================
  //    HEADER SCROLL
  // ========================= */
  // const header = document.querySelector(".site-header");
  // if (header) {
  //   window.addEventListener("scroll", () => {
  //     header.style.background =
  //       window.scrollY > 50 ? "#ffffff" : "transparent";
  //   });
  // }

  /* =========================
     MENU TOGGLE
  ========================= */
  const toggle = document.querySelector(".menu-toggle");
  const menu = document.querySelector(".fullscreen-menu");
  const closeBtn = document.querySelector(".menu-close");

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

    // Ripple effect
    toggle.addEventListener("click", () => {
      toggle.classList.remove("ripple");
      void toggle.offsetWidth;
      toggle.classList.add("ripple");
    });

    // Close button
    closeBtn?.addEventListener("click", () => {
      toggle.classList.remove("active");
      menu.classList.remove("active");
      document.body.classList.remove("menu-open");
    });

    // Magnetic hover
    toggle.addEventListener("mousemove", (e) => {
      const rect = toggle.getBoundingClientRect();
      const x = e.clientX - rect.left - rect.width / 2;
      const y = e.clientY - rect.top - rect.height / 2;
      const limit = 6;
      const magX = Math.max(-limit, Math.min(limit, x * 0.2));
      const magY = Math.max(-limit, Math.min(limit, y * 0.2));
      toggle.style.setProperty("--mag-x", `${magX}px`);
      toggle.style.setProperty("--mag-y", `${magY}px`);
    });

    toggle.addEventListener("mouseleave", () => {
      toggle.style.setProperty("--mag-x", "0px");
      toggle.style.setProperty("--mag-y", "0px");
    });
  }

  // ESC closes menu
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      toggle?.classList.remove("active");
      menu?.classList.remove("active");
      document.body.classList.remove("menu-open");
    }
  });

  /* =========================
     REVEAL ANIMATIONS
  ========================= */
  const reveals = document.querySelectorAll(".reveal");
  if (reveals.length) {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            entry.target.classList.add("active");
            if (window.gsap) {
              gsap.fromTo(
                entry.target,
                { y: 24, autoAlpha: 0 },
                { y: 0, autoAlpha: 1, duration: 0.9, ease: "power2.out" }
              );
            }
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.15 }
    );

    reveals.forEach(el => observer.observe(el));
  }

  /* =========================
     IMAGE REVEAL (MEDIA)
  ========================= */
  const mediaBlocks = document.querySelectorAll(".reveal-media");
  if (mediaBlocks.length) {
    const mediaObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
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
          }
        });
      },
      { threshold: 0.2 }
    );

    mediaBlocks.forEach(el => mediaObserver.observe(el));
  }

  /* =========================
     WORK PAGE: RENDER PROJECTS
  ========================= */
  const grid = document.getElementById("work-grid");
  const yearSelect = document.getElementById("filter-year");
  const typeSelect = document.getElementById("filter-type");
  const categorySelect = document.getElementById("filter-category");
  const clearBtn = document.getElementById("clear-filters");
  const pillButtons = document.querySelectorAll(".pill-btn");
  const pillSlider = document.querySelector(".pill-slider");

  let currentWorkType = "wallpaper";
const cursor = document.querySelector(".cursor");
const dot = document.querySelector(".cursor-dot");
const outline = document.querySelector(".cursor-outline");

if (cursor && dot && outline && window.innerWidth >= 768) {
  document.body.style.cursor = "none";

  window.addEventListener("mousemove", (e) => {
    const { clientX: x, clientY: y } = e;

    dot.style.left = x + "px";
    dot.style.top = y + "px";

    outline.style.left = x + "px";
    outline.style.top = y + "px";
  });
}


  function renderProjects(list) {
    if (!grid) return;

    grid.innerHTML = "";

    if (!list.length) {
      grid.innerHTML = "<p>No projects found.</p>";
      return;
    }

    list.forEach(project => {
      const card = document.createElement("a");
      card.href = `project.html?id=${project.id}`;
      card.className = "work-card reveal-media";

      card.innerHTML = `
        <img src="${project.cover}" alt="${project.title}">
        <div class="work-info">
          <span>${project.type === "interior" ? "Interior Design" : "Graphic Design"}</span>
          <h3>${project.title}</h3>
        </div>
      `;

      grid.appendChild(card);
    });
  }
function applyFilters() {
  let filtered = [...projects];

  // 🔹 Filter by Work Type (Wallpaper / 3D)
  filtered = filtered.filter(p => p.workType === currentWorkType);

  if (yearSelect?.value) {
    filtered = filtered.filter(p => p.year === yearSelect.value);
  }

  if (typeSelect?.value) {
    filtered = filtered.filter(p => p.type === typeSelect.value);
  }

  if (categorySelect?.value) {
    filtered = filtered.filter(p => p.category === categorySelect.value);
  }

  renderProjects(filtered);
}


if (grid) {

  // Initial render with default type
  applyFilters();

  yearSelect?.addEventListener("change", applyFilters);
  typeSelect?.addEventListener("change", applyFilters);
  categorySelect?.addEventListener("change", applyFilters);

  clearBtn?.addEventListener("click", () => {
    yearSelect.value = "";
    typeSelect.value = "";
    categorySelect.value = "";
    applyFilters();
  });

function moveSliderTo(button) {
  if (!pillSlider) return;

  pillSlider.style.width = button.offsetWidth + "px";
  pillSlider.style.transform = `translateX(${button.offsetLeft}px)`;
}
window.addEventListener("resize", () => {
  const activeBtn = document.querySelector(".pill-btn.active");
  if (activeBtn) moveSliderTo(activeBtn);
});


const activeBtn = document.querySelector(".pill-btn.active");
if (activeBtn) moveSliderTo(activeBtn);

pillButtons.forEach(button => {
  button.addEventListener("click", () => {

    pillButtons.forEach(btn => btn.classList.remove("active"));
    button.classList.add("active");

    currentWorkType = button.dataset.type;

    moveSliderTo(button);

    applyFilters();
  });
});
}


  /* =========================
     PROJECT DETAIL PAGE
  ========================= */
  const params = new URLSearchParams(window.location.search);
  const projectId = params.get("id");

  if (projectId) {
    const project = projects.find(p => p.id === projectId);

    if (!project) {
      document.body.innerHTML = "<h2 style='padding:100px'>Project not found</h2>";
      throw new Error("Invalid project ID");
    }

    const cover = document.getElementById("project-cover");
    const title = document.getElementById("project-title");
    const desc = document.getElementById("project-description");
    const gallery = document.getElementById("project-gallery");

    if (cover) cover.src = project.cover;
    if (title) title.textContent = project.title;
    if (desc) {
      desc.textContent =
        `${project.type.toUpperCase()} - ${project.category} - ${project.year}`;
    }

    if (gallery && project.gallery) {
      gallery.innerHTML = project.gallery
        .map(img => `<img src="${img}" alt="">`)
        .join("");
    }
  }

  /* =========================
     SEARCH (MEGA MENU)
  ========================= */
  const searchInput = document.getElementById("search-input");
  const searchClear = document.getElementById("search-clear");

  if (searchInput && grid) {
    searchInput.addEventListener("input", () => {
      const q = searchInput.value.toLowerCase().trim();

      if (!q) {
        renderProjects(projects);
        return;
      }

      const results = projects.filter(p =>
        p.title.toLowerCase().includes(q) ||
        p.type.toLowerCase().includes(q) ||
        p.category.toLowerCase().includes(q)
      );

      renderProjects(results);
    });
  }

  searchClear?.addEventListener("click", () => {
    searchInput.value = "";
    renderProjects(projects);
  });

});

/* =========================
   BACK BUTTON (GLOBAL)
========================= */
window.goBack = function () {
  window.location.href = "work.html";
};

const heroTitle = document.querySelector(".hero-title");

if (heroTitle) {
  heroTitle.addEventListener("animationend", () => {
    heroTitle.classList.add("revealed");
  });
}
