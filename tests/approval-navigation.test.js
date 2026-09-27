import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";

const source = readFileSync(new URL("../src/js/commerce.js", import.meta.url), "utf8")
  .replace(/^import .*;\r?\n/gm, "").replaceAll("export ", "");

test("approval button routes the owner to reviews and refreshes only the customer's access", async () => {
  for (const role of ["admin", "user"]) {
    const requests = [];
    const context = {
      getSession: () => ({ role }),
      getPrintRequests: async () => [],
      window: { location: { href: "work.html" } },
      fetchApi: async path => {
        requests.push(path);
        return { ok: true, json: async () => ({ requests: [{ design_id: "wall", status: "approved" }], access: [{ design_id: "wall" }] }) };
      }
    };
    vm.createContext(context);
    vm.runInContext(source, context);
    await vm.runInContext("checkApprovalStatus()", context);
    assert.equal(context.window.location.href, role === "admin" ? "admin-downloads.html" : "work.html");
    assert.deepEqual(requests, role === "admin" ? [] : ["api/download-requests"]);
    if (role === "user") assert.equal(vm.runInContext("approvedDesigns.includes('wall')", context), true);
  }
});
