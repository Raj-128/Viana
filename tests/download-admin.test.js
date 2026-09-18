import test from "node:test";
import assert from "node:assert/strict";
import { createServer } from "node:http";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { resolve, dirname, basename } from "node:path";
import { createApi } from "../server/api.js";

test("customer request, private upload, admin approval and revocation work over HTTP", async () => {
  const directory = await mkdtemp(resolve(tmpdir(), "viana-approvals-test-"));
  const api = createApi({ dataDir: directory, secureCookies: false });
  const server = createServer(api.handler);
  await new Promise((done) => server.listen(0, "127.0.0.1", done));
  const origin = `http://127.0.0.1:${server.address().port}`;
  const request = (path, cookie = "", body, headers = {}) => fetch(origin + path, {
    method: body ? "POST" : "GET", headers: { Origin: origin, Cookie: cookie, "Content-Type": "application/json", ...headers },
    body: body instanceof Buffer ? body : body ? JSON.stringify(body) : undefined,
  });
  try {
    await api.createUser({ name: "Owner", email: "owner@example.com", phone: "9000000011", password: "Owner-password123" }, "admin");
    const login = await request("/api/auth/admin-login", "", { identifier: "owner@example.com", password: "Owner-password123" });
    const admin = login.headers.get("set-cookie").split(";")[0];
    const registration = await request("/api/auth/register", "", { name: "Customer", email: "buyer@example.com", phone: "9000000012", password: "Customer-password123", confirmPassword: "Customer-password123" });
    const customer = registration.headers.get("set-cookie").split(";")[0];
    const otherRegistration = await request("/api/auth/register", "", { name: "Other", email: "other@example.com", phone: "9000000013", password: "Customer-password123", confirmPassword: "Customer-password123" });
    const other = otherRegistration.headers.get("set-cookie").split(";")[0];
    const payload = { email: "buyer@example.com", designId: "floral-branch-wall", action: "grant" };
    assert.equal((await request("/api/admin/downloads")).status, 401);
    assert.equal((await request("/api/admin/downloads", customer)).status, 403);
    assert.equal((await request("/api/admin/download-access", customer, payload)).status, 403);
    assert.equal((await request("/api/download-requests", "", { designId: payload.designId })).status, 401);
    assert.equal((await request("/api/download-requests", customer, { designId: "../secret" })).status, 400);
    for (let i = 0; i < 2; i++) assert.equal((await request("/api/download-requests", customer, { designId: payload.designId })).status, 200);
    let data = await (await request("/api/admin/downloads", admin)).json();
    assert.equal(data.requests.length, 1);
    assert.equal(data.requests[0].status, "pending");
    assert.equal(data.customers[0].password, undefined);
    assert.equal((await (await request("/api/download-requests", other)).json()).requests.length, 0);
    assert.equal((await request("/api/admin/download-access", admin, payload)).status, 409);
    const image = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jRZkAAAAASUVORK5CYII=", "base64");
    const uploadPath = `/api/admin/originals/${payload.designId}`;
    assert.equal((await request(uploadPath, customer, image, { "Content-Type": "image/png" })).status, 403);
    assert.equal((await request(uploadPath, admin, image, { "Content-Type": "image/png", Origin: "https://attacker.example" })).status, 403);
    assert.equal((await request(uploadPath, admin, Buffer.from("<html>not really an image file</html>"), { "Content-Type": "image/png" })).status, 415);
    assert.equal((await request(uploadPath, admin, image, { "Content-Type": "image/png" })).status, 201);
    assert.equal((await request(uploadPath, admin, image, { "Content-Type": "image/png" })).status, 409);
    assert.equal((await request(`/api/designs/${payload.designId}/download`, customer)).status, 403);
    assert.equal((await request("/api/admin/download-access", admin, payload, { Origin: "https://attacker.example" })).status, 403);
    assert.equal((await request("/api/admin/download-access", admin, payload)).status, 200);
    data = await (await request("/api/download-requests", customer)).json();
    assert.equal(data.requests[0].status, "approved");
    assert.equal(data.access[0].design_id, payload.designId);
    const download = await request(`/api/designs/${payload.designId}/download`, customer);
    assert.equal(download.status, 200);
    assert.deepEqual(Buffer.from(await download.arrayBuffer()), image);
    assert.equal((await request(`/api/designs/${payload.designId}/download`, other)).status, 403);
    assert.equal((await request("/api/admin/download-access", admin, { ...payload, action: "revoke" })).status, 200);
    assert.equal((await request(`/api/designs/${payload.designId}/download`, customer)).status, 403);
    assert.equal((await (await request("/api/download-requests", customer)).json()).requests[0].status, "revoked");
    await request("/api/download-requests", customer, { designId: payload.designId });
    assert.equal((await request("/api/admin/download-access", admin, { ...payload, action: "reject" })).status, 200);
    assert.equal((await (await request("/api/download-requests", customer)).json()).requests[0].status, "rejected");
    const second = createApi({ dataDir: directory, secureCookies: false });
    assert.equal(second.db.prepare("SELECT status FROM download_requests").get().status, "rejected");
    second.close();
  } finally {
    await new Promise((done) => server.close(done));
    api.close();
    assert.equal(dirname(directory), resolve(tmpdir()));
    assert.ok(basename(directory).startsWith("viana-approvals-test-"));
    await rm(directory, { recursive: true, force: true });
  }
});
