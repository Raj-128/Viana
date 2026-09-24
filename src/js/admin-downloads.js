import { authReady, getSession } from "./auth.js";
import { projects } from "./projects.js";
import { fetchApi } from "./api-config.js";

const $ = (id) => document.getElementById(id);
const status = $("approval-status");
let state, busy = false;
async function api(path, body, file) {
  const cleanPath = path.startsWith("/") ? path.slice(1) : path;
  const response = await fetchApi(cleanPath, {
    method: body || file ? "POST" : "GET", cache: "no-store",
    headers: body ? { "Content-Type": "application/json" } : file ? { "Content-Type": file.type } : {},
    body: file || (body ? JSON.stringify(body) : undefined),
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || "Request failed.");
  return data;
}
const title = (id) => projects.find((p) => p.id === id)?.title || id;
function option(value, label) { const el = document.createElement("option"); el.value = value; el.textContent = label; return el; }
function button(label, action) { const el = document.createElement("button"); el.type = "button"; el.textContent = label; el.addEventListener("click", action); return el; }
function row(item, detail) {
  const el = document.createElement("article"); el.className = "approval-row";
  const info = document.createElement("div"), heading = document.createElement("strong"), caption = document.createElement("small");
  heading.textContent = title(item.design_id);
  caption.textContent = `${item.name} · ${item.email}${detail ? ` · ${detail}` : ""}`;
  info.className = "approval-row-info";
  const project = projects.find((p) => p.id === item.design_id);
  if (project) { const image = document.createElement("img"); image.src = project.cover; image.alt = ""; image.loading = "lazy"; el.append(image); }
  info.append(heading, caption);
  if (detail) { const badge = document.createElement("span"); badge.className = "approval-badge"; badge.dataset.status = detail; badge.textContent = detail; info.append(badge); }
  el.append(info);
  return el;
}
function uploadState() {
  const project = projects.find((p) => p.id === $("original-design").value);
  if (project) { $("original-preview").src = project.cover; $("original-preview").alt = project.title; $("original-preview-title").textContent = project.title; }
  const exists = state?.designs.some((d) => d.id === $("original-design").value);
  $("original-state").textContent = exists ? "Original is already uploaded and ready for approvals." : "No original uploaded for this design.";
  $("original-form").querySelector("button").disabled = busy || exists;
}
let requestFilter = "pending";
function renderRequests() {
  if (!state) return;
  const search = $("request-search").value.trim().toLowerCase();
  const filtered = state.requests.filter((r) => (requestFilter === "all" || r.status === requestFilter) && [r.name, r.email, title(r.design_id)].join(" ").toLowerCase().includes(search));
  const requests = $("approval-requests"); requests.replaceChildren();
  for (const request of filtered) {
    const el = row(request, request.status), actions = document.createElement("div"); actions.className = "approval-row-actions";
    if (request.status === "pending") {
      const available = state.designs.some((d) => d.id === request.design_id);
      actions.append(button(available ? "Approve" : "Upload original first", () => {
        if (available) changeAccess(request.email, request.design_id, "grant");
        else { $("original-design").value = request.design_id; uploadState(); $("original-file").focus(); status.textContent = "Choose and upload the clean original, then approve this request."; }
      }), button("Decline", () => changeAccess(request.email, request.design_id, "reject")));
    }
    el.append(actions); requests.append(el);
  }
  if (!filtered.length) { requests.classList.add("is-empty"); requests.textContent = search ? "No requests match your search." : requestFilter === "pending" ? "All caught up. New requests will appear here." : "No requests in this view yet."; } else requests.classList.remove("is-empty");
}
async function refresh() {
  state = await api("/api/admin/downloads");
  const previous = $("access-customer").value;
  $("access-customer").replaceChildren(option("", "Choose a registered customer"), ...state.customers.map((c) => option(c.email, `${c.name} · ${c.email}`)));
  $("access-customer").value = previous;
  renderRequests();
  $("pending-count").textContent = state.requests.filter((r) => r.status === "pending").length;
  $("access-count").textContent = state.access.length;
  $("original-count").textContent = state.designs.length;
  const access = $("approval-access"); access.replaceChildren();
  state.access.forEach((item) => {
    const el = row(item);
    el.append(button("Revoke access", () => {
      if (confirm(`Revoke ${item.email}'s download access to ${title(item.design_id)}?`)) changeAccess(item.email, item.design_id, "revoke");
    })); access.append(el);
  });
  if (!state.access.length) access.textContent = "No customer access granted yet.";
  uploadState();
}
async function run(action, message) {
  if (busy) return;
  busy = true; status.textContent = "Working…";
  $("approval-content").querySelectorAll("button").forEach((b) => { b.disabled = true; });
  try { await action(); await refresh(); status.textContent = message; }
  catch (error) { status.textContent = error.message; }
  finally { busy = false; $("approval-content").querySelectorAll("button").forEach((b) => { b.disabled = false; }); uploadState(); }
}
function changeAccess(email, designId, action) {
  return run(() => api("/api/admin/download-access", { email, designId, action }),
    action === "grant" ? "Access approved. The customer can now download the original while signed in." : action === "revoke" ? "Download access revoked." : "Request declined.");
}
await authReady;
if (getSession()?.role !== "admin") {
  status.textContent = "This page is only available to the studio owner. ";
  const link = document.createElement("a"); link.href = "admin-login.html?redirect=admin-downloads.html"; link.textContent = "Sign in as admin"; status.append(link);
} else {
  document.querySelectorAll("[data-request-filter]").forEach((button) => button.addEventListener("click", () => {
    requestFilter = button.dataset.requestFilter;
    document.querySelectorAll("[data-request-filter]").forEach((item) => item.setAttribute("aria-pressed", String(item === button)));
    renderRequests();
  }));
  $("request-search").addEventListener("input", renderRequests);
  ["original-design", "access-design"].forEach((id) => $(id).replaceChildren(...projects.map((p) => option(p.id, p.title))));
  $("original-design").addEventListener("change", uploadState);
  $("refresh-requests").addEventListener("click", () => run(async () => {}, "Requests refreshed."));
  $("original-form").addEventListener("submit", (event) => {
    event.preventDefault();
    const file = $("original-file").files[0], designId = $("original-design").value;
    if (!file || !["image/jpeg", "image/png", "image/webp"].includes(file.type) || file.size > 25 * 1024 * 1024 || !file.size) { status.textContent = "Choose a JPG, PNG or WebP file up to 25 MB."; return; }
    run(async () => { await api(`/api/admin/originals/${encodeURIComponent(designId)}`, null, file); $("original-file").value = ""; }, "Original uploaded privately. You can now approve customer access.");
  });
  $("access-form").addEventListener("submit", (event) => { event.preventDefault(); changeAccess($("access-customer").value, $("access-design").value, "grant"); });
  $("approval-content").hidden = false;
  await run(async () => {}, "Ready to review download requests.");
}
