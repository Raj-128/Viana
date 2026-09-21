import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";

const source = readFileSync(new URL("../src/js/catalogue-filters.js", import.meta.url), "utf8")
  .replace(/^import .*;\r?\n/gm, "").replaceAll("export ", "");
const context = {};
vm.runInNewContext(source, context);
const catalogue = [
  { id: "a", title: "Amber", theme: "floral", year: "2025", ownership: "owned", location: "Surat" },
  { id: "b", title: "Birch", theme: "nature", year: "2026", ownership: "owned", location: "Surat" },
  { id: "c", title: "Cedar", theme: "nature", year: "2024", ownership: "curated", location: "Mumbai" },
];
const ids = (items) => Array.from(items, (item) => item.id);
test("catalogue combines multiple styles with source, year and search filters", () => {
  const selected = { theme: new Set(["floral", "nature"]), ownership: new Set(["owned"]) };
  assert.deepEqual(ids(context.filterCatalogue(catalogue, selected)), ["a", "b"]);
  selected.year = new Set(["2026"]);
  assert.deepEqual(ids(context.filterCatalogue(catalogue, selected, " SURAT ")), ["b"]);
  assert.equal(context.filterCatalogue(catalogue, selected, "Mumbai").length, 0);
  Object.values(selected).forEach((values) => values.clear());
  assert.deepEqual(ids(context.filterCatalogue(catalogue, selected)), ["a", "b", "c"]);
});
test("sort changes results without changing the original catalogue order", () => {
  assert.deepEqual(ids(context.filterCatalogue(catalogue, {}, "", "newest")), ["b", "a", "c"]);
  assert.deepEqual(ids(context.filterCatalogue(catalogue, {}, "", "za")), ["c", "b", "a"]);
  assert.deepEqual(ids(context.filterCatalogue(catalogue, {}, "", "az")), ["a", "b", "c"]);
  assert.deepEqual(ids(catalogue), ["a", "b", "c"]);
});
test("Work has a top filter panel and no independent collection switch", () => {
  const html = readFileSync(new URL("../work.html", import.meta.url), "utf8");
  assert.ok(html.includes('class="catalogue-filter-panel"'));
  assert.ok(!html.includes("data-mode-toggle"));
  assert.ok(html.indexOf('id="catalogue-facets"') < html.indexOf('id="work-grid"'));
});
