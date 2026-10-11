import { fetchApi } from "./api-config.js";

// This endpoint must authorize the signed-in user and purchase on the server.
// Browser-local roles/payment flags are never accepted as download credentials.
export async function requestProtectedDownload(projectId, fetcher = fetchApi) {
  const path = `api/designs/${encodeURIComponent(projectId)}/download`;
  const targetUrl = fetcher === fetchApi ? path : new URL(path, new URL("./", window.location.href));
  const response = await fetcher(targetUrl, {
    credentials: "same-origin",
    cache: "no-store",
    headers: { Accept: "image/*, application/octet-stream" },
  });
  if (response.status === 401) throw Object.assign(new Error("Please sign in through the download service to access this design."), { status: 401 });
  if ([403, 429].includes(response.status)) {
    const data = await response.json().catch(() => ({}));
    throw Object.assign(new Error(data.error || (response.status === 403 ? 'Download access is required for this design.' : 'Too many download requests. Please wait and try again.')), { status: response.status, code: data.code });
  }
  if (!response.ok) throw new Error("Secure downloads are not available yet. Please contact Studio Viana through your cart.");
  const type = response.headers.get("content-type")?.split(";")[0].trim().toLowerCase();
  if (!["image/jpeg", "image/png", "image/webp", "image/avif", "application/octet-stream", "application/vnd.rar", "application/zip"].includes(type)) {
    throw new Error("The secure download service is not configured. Please contact Studio Viana through your cart.");
  }
  const blob = await response.blob();
  if (!blob.size) throw new Error("The downloaded file is empty. Please try again.");
  return blob;
}
