import { projects } from "./projects.js";

const originals = new WeakMap();
function change(selector, value, active, attribute) {
  document.querySelectorAll(selector).forEach((element) => {
    let original = originals.get(element);
    if (!original) { original = {}; originals.set(element, original); }
    const key = attribute || "html";
    if (!(key in original)) original[key] = attribute ? element.getAttribute(attribute) : element.innerHTML;
    if (attribute) {
      const next = active ? value : original[key];
      if (next === null) element.removeAttribute(attribute); else element.setAttribute(attribute, next);
    } else if (active) element.textContent = value;
    else element.innerHTML = original[key];
  });
}

export function updateModeContent(mode) {
  const active = mode === "3d";
  const page = location.pathname.split("/").pop()?.replace(".html", "") || "index";
  document.body.dataset.page = page;
  const scenes = projects.filter((project) => project.workType === "3d");
  const copy = {
    about: ["The mind behind the render.", "Vicky Rana explores light, materials and spatial storytelling through 3D environments, product studies and digital art."],
    services: ["From an idea to a world.", "3D environments, product imagery and spatial concepts, shaped through modelling, materials and light."],
    contact: ["Start your next dimension.", "Share your concept, references and deliverables. Let’s plan a 3D visualization for your space, product or campaign."],
  };
  if (copy[page]) {
    change(".page-hero .page-title", copy[page][0], active);
    change(".page-hero .page-lead", copy[page][1], active);
    change(".page-hero .section-kicker", "STUDIO VIANA / 3D VISUALS", active);
    const container = document.querySelector(".page-hero .container");
    const scene = scenes[{ about: 0, services: 1, contact: 3 }[page]];
    if (container && scene && !container.querySelector(".mode-scene")) {
      const figure = document.createElement("figure");
      figure.className = "mode-scene";
      const image = document.createElement("img");
      image.src = scene.cover;
      image.alt = scene.title;
      image.draggable = false;
      const caption = document.createElement("figcaption");
      caption.textContent = `3D STUDY / ${scene.title}`;
      figure.append(image, caption);
      container.append(figure);
    }
  }
  if (page === "work") scenes.forEach((project, index) => {
    const base = `.hero-slide:nth-child(${index + 1})`;
    change(`${base} img`, project.cover, active, "src");
    change(`${base} img`, project.title, active, "alt");
    change(`${base} strong`, project.title, active);
    change(`${base} .hero-slide-caption span`, "3D concept", active);
  });
  if (page === "about") {
    change(".about-text > p:nth-of-type(1)", "Studio Viana is a digital art practice led by Vicky Rana. Our 3D work turns ideas into carefully composed environments, objects and visual stories.", active);
    change(".about-text > p:nth-of-type(2)", "Each scene starts with a question of space, light and material. We develop the form, explore surfaces and refine the camera until the image communicates its idea clearly.", active);
    change(".about-text > p:nth-of-type(3)", "Explore our render studies and contact the studio for a custom visualization brief.", active);
    change(".showcase-section .section-title", "Inside the digital studio", active);
    change(".showcase-section .section-sub", "A collection of rendered spaces, lighting studies and sculptural objects.", active);
    document.querySelectorAll(".showcase-track .showcase-item").forEach((item, index) => {
      const project = scenes[index % scenes.length];
      if (!project) return;
      const base = `.showcase-track .showcase-item:nth-child(${index + 1})`;
      change(base, `project.html?id=${project.id}`, active, "href");
      change(`${base} img`, project.cover, active, "src");
      change(`${base} img`, project.title, active, "alt");
      change(`${base} strong`, project.title, active);
      change(`${base} span`, "3D / Studio study", active);
    });
  }
  if (page === "services") {
    const services = [
      ["Interior Visualization", "Explore a space before it is built, with considered compositions, materials and lighting.", ["Residential and commercial scenes", "Material and finish studies", "Camera composition", "Lighting exploration", "Final rendered views"]],
      ["Product & Lighting Studies", "Give objects a setting of their own, from sculptural lighting to product-focused imagery.", ["Product staging", "Surface and material development", "Studio lighting", "Detail views", "Campaign imagery"]],
      ["3D Art Direction", "Develop a coherent visual language for an image series, concept or brand-led scene.", ["Visual references", "Concept development", "Colour and material direction", "Scene composition", "Image-series consistency"]],
      ["Spatial Concepts", "Investigate form, proportion and atmosphere through expressive digital environments.", ["Concept rooms", "Spatial composition", "Sculptural forms", "Atmosphere studies", "Presentation imagery"]],
    ];
    services.forEach(([title, description, items], index) => {
      const base = `.service-card:nth-child(${index + 1})`;
      change(`${base} h2`, title, active);
      change(`${base} > p:not(.section-kicker)`, description, active);
      items.forEach((text, i) => change(`${base} li:nth-child(${i + 1})`, text, active));
    });
    change(".process-step:nth-child(1) p", "Share your brief, references, intended use and required views.", active);
    change(".process-step:nth-child(2) h3", "Build & Refine", active);
    change(".process-step:nth-child(2) p", "Review the scene, materials, lighting and camera composition before final rendering.", active);
    change(".process-step:nth-child(3) h3", "Render & Deliver", active);
    change(".process-step:nth-child(3) p", "Receive the agreed rendered views and formats for your project.", active);
  }
  if (page === "contact") {
    change(".contact-card > h2", "Let's talk about your concept.", active);
    change(".contact-card > p:not(.section-kicker)", "Share your references, scene requirements and intended use. We can help shape the lighting, materials and final views around your brief.", active);
    change("#contact-dimensions-label", "Output requirements (optional)", active);
    change("#contact-dimensions", "Number of views, image size or file format", active, "placeholder");
    change(".whatsapp-cta-inner .section-title", "Tell us about your 3D project", active);
    change(".whatsapp-cta-inner > p:not(.section-kicker):not(.whatsapp-note)", "Send your references, scene requirements and timeline. We’ll discuss scope and prepare a custom quote.", active);
    change("#contact-type", "Interior render, product visualization, spatial concept…", active, "placeholder");
  }
  if (["services", "contact"].includes(page)) {
    change(".whatsapp-cta-section .whatsapp-btn", "https://api.whatsapp.com/send?phone=919737711570&text=" + encodeURIComponent("Hello Studio Viana, I would like to discuss a 3D visualization project."), active, "href");
  }
}
