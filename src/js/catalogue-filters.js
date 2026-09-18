import "../css/catalogue-filters.css";

const groups = { theme: "Style", year: "Year", ownership: "Source" };
const labelFor = (key, value) => key === "ownership"
  ? ({ owned: "Studio owned", curated: "Curated sources" }[value] || value)
  : String(value).replace(/(^|[-_ ])\w/g, (part) => part.replace(/[-_]/g, " ").toUpperCase());

export function filterCatalogue(projects, selected = {}, query = "", sort = "featured") {
  const search = query.trim().toLowerCase();
  const result = projects.filter((project) => Object.keys(groups).every((key) =>
    !selected[key]?.size || selected[key].has(String(project[key]))) &&
    (!search || [project.title, project.summary, project.location, project.mediumLabel, project.theme]
      .join(" ").toLowerCase().includes(search)));
  if (sort === "newest") result.sort((a, b) => Number(b.year) - Number(a.year));
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
  sidebar.open = !mobile.matches;
  mobile.addEventListener("change", (event) => { sidebar.open = !event.matches; });
  const selected = Object.fromEntries(Object.keys(groups).map((key) => [key, new Set()]));
  let collection = [], mode;
  const controls = [];
  function toggle(key, value) {
    selected[key].has(value) ? selected[key].delete(value) : selected[key].add(value);
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
    controls.forEach(({ key, value, input, count }) => {
      input.checked = selected[key].has(value);
      const other = { ...selected, [key]: new Set([value]) };
      const available = filterCatalogue(collection, other, search.value).length;
      count.textContent = String(available);
      input.disabled = available === 0 && !input.checked;
    });
    suggestions.replaceChildren(...[...new Set(collection.map((p) => String(p.theme)).filter(Boolean))].map((value) => {
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
    setCollection(projects, nextMode) {
      if (mode === nextMode) return;
      mode = nextMode;
      collection = projects;
      Object.values(selected).forEach((values) => values.clear());
      facets.replaceChildren();
      controls.length = 0;
      Object.entries(groups).forEach(([key, title]) => {
        const details = document.createElement("details");
        details.className = "shop-facet";
        details.open = key !== "year";
        const summary = document.createElement("summary");
        summary.textContent = title;
        const fieldset = document.createElement("fieldset");
        const legend = document.createElement("legend");
        legend.className = "sr-only";
        legend.textContent = title;
        fieldset.append(legend);
        const values = [...new Set(projects.map((p) => String(p[key] ?? "")).filter(Boolean))];
        values.sort((a, b) => key === "year" ? Number(b) - Number(a) : a.localeCompare(b));
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
          controls.push({ key, value, input, count });
        });
        details.append(summary, fieldset);
        facets.append(details);
      });
      sync();
    },
    filter(projects) { sync(); return filterCatalogue(projects, selected, search.value, sort.value); },
    clear() { Object.values(selected).forEach((values) => values.clear()); sort.value = "featured"; },
  };
}
