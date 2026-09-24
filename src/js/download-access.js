import { fetchApi, buildApiUrl } from "./api-config.js";

// This endpoint must authorize the signed-in user and purchase on the server.
// Browser-local roles/payment flags are never accepted as download credentials.
export async function requestProtectedDownload(projectId, fetcher = fetchApi) {
  const targetUrl = fetcher === fetchApi ? buildApiUrl(`api/designs/${encodeURIComponent(projectId)}/download`) : new URL(`api/designs/${encodeURIComponent(projectId)}/download`, new URL("./", window.location.href));
  const response = await fetcher(targetUrl, {
    credentials: "same-origin",
    cache: "no-store",
    headers: { Accept: "image/*, application/octet-stream" },
  });
  if (response.status === 401) throw new Error("Please sign in through the download service to access this design.");
  if (response.status === 403) throw new Error("Download access is required for this design. Add it to your cart and request a quote to arrange access.");
  if (response.status === 429) throw new Error("Too many download requests. Please wait and try again.");
  if (!response.ok) throw new Error("Secure downloads are not available yet. Please contact Studio Viana through your cart.");
  const type = response.headers.get("content-type")?.split(";")[0].trim().toLowerCase();
  if (!["image/jpeg", "image/png", "image/webp", "image/avif", "application/octet-stream"].includes(type)) {
    throw new Error("The secure download service is not configured. Please contact Studio Viana through your cart.");
  }
  const blob = await response.blob();
  if (!blob.size) throw new Error("The downloaded file is empty. Please try again.");
  return blob;
}
