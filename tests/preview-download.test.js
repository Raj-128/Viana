import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";

const source = readFileSync(new URL("../src/js/preview-download.js", import.meta.url), "utf8").replace("export ", "");
test("preview export caps resolution and burns repeated Studio Viana watermarks into the file", async () => {
  const marks = [], operations = [];
  const context2d = {
    drawImage() { operations.push("image"); }, save() {}, restore() {}, translate() {}, rotate() {}, strokeText() {},
    fillText(text) { marks.push(text); operations.push("watermark"); },
  };
  const blob = { size: 100, type: "image/jpeg" };
  const canvas = { getContext: () => context2d, toBlob(callback, type) { operations.push("export"); assert.equal(type, "image/jpeg"); callback(blob); } };
  const context = {
    Image: class { naturalWidth = 2800; naturalHeight = 4200; async decode() {} },
    document: { createElement: () => canvas },
  };
  vm.runInNewContext(source, context);
  assert.equal(await context.createPreviewDownload({ cover: "preview.jpg" }), blob);
  assert.equal(canvas.height, 1400);
  assert.equal(canvas.width, 933);
  assert.ok(marks.length > 10);
  assert.ok(marks.every((mark) => mark === "Studio Viana"));
  assert.equal(operations[0], "image");
  assert.equal(operations.at(-1), "export");
});
test("failed preview decoding does not download an unwatermarked source", async () => {
  const context = { Image: class { async decode() { throw new Error("Image unavailable"); } }, document: { createElement() { throw new Error("Unexpected export"); } } };
  vm.runInNewContext(source, context);
  await assert.rejects(context.createPreviewDownload({ cover: "missing.jpg" }), /Image unavailable/);
});
