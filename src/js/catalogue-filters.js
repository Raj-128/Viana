import "../css/catalogue-filters.css";

const groups = { collection: "Collection", category: "Category", itemType: "Item type", theme: "Style", year: "Year", ownership: "Source" };
const interiorCategories = [
  "residential", "furniture", "decoration", "kitchen", "bathroom", "kids room",
  "office", "commercial", "hospitality", "healthcare", "education", "entertainment",
  "lighting", "electronics", "interior architecture", "interior materials",
];
const exteriorCategories = [
  "buildings", "facade", "landscape", "garden", "urban", "fence & boundary",
  "outdoor furniture", "outdoor decoration", "exterior lighting", "playground",
  "parking", "paving", "pool", "transport", "outdoor architecture",
];
const residentialStyles = [
  "living area", "bedroom", "dining", "kitchen", "bathroom", "entry / foyer",
  "puja / temple", "study / work", "kids zone", "storage / utility",
  "passage / circulation", "balcony / semi outdoor", "terrace", "exterior home area",
  "outdoor residential", "parking",
];
const labelFor = (key, value) => key === "ownership"
  ? ({ owned: "Studio owned", curated: "Curated sources" }[value] || value)
  : String(value).replace(/(^|[-_ ])\w/g, (part) => part.replace(/[-_]/g, " ").toUpperCase());

export function filterCatalogue(projects, selected = {}, query = "", sort = "featured") {
  const search = query.trim().toLowerCase();
  const result = projects.filter((project) => Object.keys(groups).every((key) =>
    !selected[key]?.size || selected[key].has(String(project[key]))) &&
    (!search || [project.title, project.summary, project.location, project.mediumLabel, project.theme, project.collection, project.category, project.itemType]
      .join(" ").toLowerCase().includes(search)));
  if (sort === "newest") result.sort((a, b) => (Date.parse(b.addedAt) || Number(b.year) || 0) - (Date.parse(a.addedAt) || Number(a.year) || 0));
  if (sort === "az" || sort === "za") result.sort((a, b) => a.title.localeCompare(b.title) * (sort === "za" ? -1 : 1));
  return result;
}

export function initCatalogueFilters(onChange) {
  const facets = document.getElementById("catalogue-facets");
  if (!facets) return null;
  const suggestions = document.getElementById("catalogue-suggestions");
  const active = document.getElementById("catalogue-active-filters");
  const search = document.getElementById("filter-search");
  const sort = document.getElementById("catalogue-sort");
  const sidebar = document.querySelector(".catalogue-filter-panel");
  const mobile = matchMedia("(max-width: 760px)");
  const keepPanelOpen = () => Boolean(document.querySelector(".format-catalogue"));
  sidebar.open = keepPanelOpen() || !mobile.matches;
  mobile.addEventListener("change", (event) => { sidebar.open = keepPanelOpen() || !event.matches; });
  const selected = Object.fromEntries(Object.keys(groups).map((key) => [key, new Set()]));
  let collection = [], mode;
  const controls = [];
  const facetQueries = { category: '', itemType: '' };
  const facetSearches = new Map();
  const expandedFacets = { category: false, itemType: false };
  function toggle(key, value) {
    selected[key].has(value) ? selected[key].delete(value) : selected[key].add(value);
    if (mode === "3d") {
      if (key === "collection") selected.category.clear();
      if (key === "collection" || key === "category") selected.itemType.clear();
      if (key === "collection" || key === "category") selected.theme.clear();
    }
    onChange();
  }
  function chip(text, callback) {
    const button = document.createElement("button");
    button.type = "button";
    button.textContent = text;
    button.addEventListener("click", callback);
    return button;
  }
  function sync() {
    const residential = mode === "3d" && selected.collection.has("interior") && selected.category.has("residential");
    const styles = residential ? residentialStyles : [...new Set(collection.map((p) => p.theme).filter(Boolean))];
    controls.forEach(({ key, value, input, count, label }) => {
      label.hidden = false;
      if (key === 'itemType') label.hidden = !collection.some(project => project.itemType === value &&
        (!selected.collection.size || selected.collection.has(project.collection)) &&
        (!selected.category.size || selected.category.has(project.category)));
      if (key === "theme") label.hidden = !styles.includes(value);
      if (key === "category" && mode === "3d") {
        label.hidden = selected.collection.size > 0 && !(selected.collection.has("interior") && interiorCategories.includes(value)) &&
          !(selected.collection.has("exterior") && exteriorCategories.includes(value)) &&
          !collection.some((project) => selected.collection.has(project.collection) && project.category === value);
      }
      if (facetQueries[key]) label.hidden ||= !labelFor(key, value).toLowerCase().includes(facetQueries[key].trim().toLowerCase());
      input.checked = selected[key].has(value);
      const other = { ...selected, [key]: new Set([value]) };
      const available = filterCatalogue(collection, other, search.value).length;
      count.textContent = String(available);
      const spatialOption = mode === "3d" && (key === "collection" || (key === "category" && (
        (selected.collection.has("interior") && interiorCategories.includes(value)) ||
        (selected.collection.has("exterior") && exteriorCategories.includes(value))
      )));
      input.disabled = available === 0 && !input.checked && !spatialOption && !(residential && key === "theme");
    });
    facetSearches.forEach(({ empty }, key) => {
      empty.hidden = !expandedFacets[key] || controls.some(control => control.key === key && !control.label.hidden);
    });
    suggestions.replaceChildren(...styles.map((value) => {
      const button = chip(labelFor("theme", value), () => toggle("theme", value));
      button.setAttribute("aria-pressed", String(selected.theme.has(value)));
      return button;
    }));
    active.replaceChildren();
    Object.entries(selected).forEach(([key, values]) => values.forEach((value) => {
      const button = chip(`${groups[key]}: ${labelFor(key, value)} ×`, () => toggle(key, value));
      button.setAttribute("aria-label", `Remove ${groups[key]} filter: ${labelFor(key, value)}`);
      active.append(button);
    }));
    if (search.value.trim()) active.append(chip(`Search: ${search.value.trim()} ×`, () => { search.value = ""; onChange(); }));
  }
  sort.addEventListener("change", onChange);
  return {
    setCollection(projects, nextMode, force = false) {
      if (mode === nextMode && !force) return;
      const modeChanged = mode !== nextMode;
      mode = nextMode;
      collection = projects;
      if (modeChanged) {
        Object.values(selected).forEach((values) => values.clear());
        Object.keys(facetQueries).forEach(key => { facetQueries[key] = ''; });
      }
      facets.replaceChildren();
      controls.length = 0;
      facetSearches.clear();
      Object.entries(groups).forEach(([key, title]) => {
        if (key === 'itemType' && mode !== '3d') return;
        const searchable = key in facetQueries;
        const details = document.createElement(searchable ? 'section' : 'details');
        details.className = "shop-facet";
        if (!searchable) details.open = mode === "3d" || key !== "year";
        const summary = document.createElement(searchable ? 'button' : 'summary');
        summary.textContent = title;
        const fieldset = document.createElement("fieldset");
        if (searchable) {
          summary.type = 'button'; summary.className = 'facet-toggle';
          fieldset.id = `facet-options-${key}`;
          summary.setAttribute('aria-controls', fieldset.id);
          summary.setAttribute('aria-expanded', String(expandedFacets[key]));
          fieldset.hidden = !expandedFacets[key];
          summary.addEventListener('click', () => {
            expandedFacets[key] = !expandedFacets[key];
            summary.setAttribute('aria-expanded', String(expandedFacets[key]));
            fieldset.hidden = !expandedFacets[key];
            sync();
          });
        }
        const legend = document.createElement("legend");
        legend.className = "sr-only";
        legend.textContent = title;
        fieldset.append(legend);
        const isSpatialCollection = key === "collection" && mode === "3d";
        const values = key === "year"
          ? ["2026"]
          : isSpatialCollection
          ? ["interior", "exterior"]
          : key === "category" && mode === "3d"
          ? [...new Set([...interiorCategories, ...exteriorCategories, ...projects.map((p) => p.category).filter(Boolean)])]
          : key === "theme" && mode === "3d"
          ? [...new Set([...residentialStyles, ...projects.map((p) => p.theme).filter(Boolean)])]
          : [...new Set(projects.map((p) => String(p[key] ?? "")).filter(Boolean))];
        if (!isSpatialCollection && !(["category", "theme"].includes(key) && mode === "3d")) values.sort((a, b) => key === "year" ? Number(b) - Number(a) : a.localeCompare(b));
        values.forEach((value) => {
          const label = document.createElement("label");
          const input = document.createElement("input");
          input.type = "checkbox";
          input.value = value;
          input.addEventListener("change", () => toggle(key, value));
          const text = document.createElement("span");
          text.textContent = labelFor(key, value);
          const count = document.createElement("small");
          count.setAttribute("aria-hidden", "true");
          label.append(input, text, count);
          fieldset.append(label);
          controls.push({ key, value, input, count, label });
        });
        details.append(summary);
        if (key in facetQueries) {
          const filter = document.createElement('input');
          filter.type = 'search'; filter.className = 'facet-name-search';
          filter.placeholder = `Search ${title.toLowerCase()} by name…`;
          filter.setAttribute('aria-label', `Search ${title.toLowerCase()} by name`);
          filter.value = facetQueries[key];
          filter.addEventListener('input', () => { facetQueries[key] = filter.value; sync(); });
          const empty = document.createElement('p');
          empty.className = 'facet-search-empty'; empty.setAttribute('role', 'status');
          empty.textContent = `No matching ${title.toLowerCase()}.`; empty.hidden = true;
          facetSearches.set(key, { filter, empty });
          details.append(filter, fieldset, empty);
        } else details.append(fieldset);
        facets.append(details);
      });
      sync();
    },
    filter(projects) { sync(); return filterCatalogue(projects, selected, search.value, sort.value); },
    clear() {
      Object.values(selected).forEach((values) => values.clear()); sort.value = "featured";
      Object.keys(facetQueries).forEach(key => { facetQueries[key] = ''; });
      facetSearches.forEach(({ filter }) => { filter.value = ''; });
    },
  };
}
