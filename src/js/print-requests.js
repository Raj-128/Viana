import { fetchApi } from './api-config.js';

const paperNames = { standard: 'Standard Matte', canvas: 'Premium Canvas', feather: 'Feather Texture', linen: 'Wall Linen', earthy: 'Earthy Textile' };
export const printRequestSummary = request => `${request.width} × ${request.height} inches · ${paperNames[request.paper] || request.paper} · quantity ${request.quantity}`;
export async function createPrintRequest(designId, dimensions) {
  const response = await fetchApi('api/print-requests', { method: 'POST',
    headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ designId, ...dimensions }) });
  if (response.status === 404) throw new Error('Design requests are temporarily unavailable. Your request was not sent. Please contact the studio or try again later.');
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || 'Could not send your design request. Please try again.');
  return data.request;
}
export async function getPrintRequests() {
  const response = await fetchApi('api/print-requests', { cache: 'no-store' });
  if (response.status === 401) return [];
  if (response.status === 404) throw new Error('Design requests are temporarily unavailable. Please try again later or contact the studio.');
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || 'Could not check your design requests.');
  return data.requests;
}
export async function downloadPrintFile(request) {
  const response = await fetchApi(`api/print-requests/${encodeURIComponent(request.id)}/download`, { cache: 'no-store' });
  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    throw new Error(data.error || 'Your print file is not available yet.');
  }
  const mime = response.headers.get('content-type')?.split(';')[0];
  const extension = { 'application/pdf': 'pdf', 'image/tiff': 'tif', 'image/jpeg': 'jpg', 'image/png': 'png' }[mime];
  if (!extension) throw new Error('The print file could not be downloaded. Contact the studio.');
  const blob = await response.blob();
  if (!blob.size) throw new Error('The print file is empty. Contact the studio.');
  const url = URL.createObjectURL(blob), link = document.createElement('a');
  link.href = url;
  link.download = `viana-${request.id}-${request.width}x${request.height}in.${extension}`;
  document.body.append(link); link.click(); link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 60000);
}
