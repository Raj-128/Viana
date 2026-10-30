import { GoogleAuth } from 'google-auth-library';
import sharp from 'sharp';

const PROJECT_ID = process.env.GOOGLE_CLOUD_PROJECT || '';
const LOCATION = process.env.GOOGLE_CLOUD_LOCATION || 'us-west1';
const PRODUCT_SET_ID = process.env.GOOGLE_PRODUCT_SET_ID || 'studio-viana-wallpapers';

export function createVisualSearch({ fail }) {
  const auth = new GoogleAuth({ scopes: ['https://www.googleapis.com/auth/cloud-vision'] });
  const configured = Boolean(PROJECT_ID && PRODUCT_SET_ID);

  return {
    config() { return { enabled: configured }; },
    async search({ image, mimeType }) {
      if (!configured) throw fail(503, 'Photo search is not configured yet.');
      if (typeof image !== 'string' || image.length > 5_600_000 || !/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(image)) {
        throw fail(400, 'Choose a valid image under 4 MB.');
      }
      if (!['image/jpeg', 'image/png', 'image/webp'].includes(mimeType)) throw fail(415, 'Use a JPEG, PNG, or WebP image.');
      const original = Buffer.from(image, 'base64');
      if (!original.length || original.length > 4 * 1024 * 1024) throw fail(413, 'Choose an image under 4 MB.');

      let prepared;
      try {
        const source = sharp(original, { limitInputPixels: 25_000_000, failOn: 'warning' });
        const metadata = await source.metadata();
        if (!['jpeg', 'png', 'webp'].includes(metadata.format)) throw new Error('Unsupported image type.');
        prepared = await source.rotate().resize({ width: 1600, height: 1600, fit: 'inside', withoutEnlargement: true })
          .jpeg({ quality: 84 }).toBuffer();
      } catch {
        throw fail(400, 'That image could not be read. Choose a JPEG, PNG, or WebP photo.');
      }

      let token;
      try {
        const client = await auth.getClient();
        token = (await client.getAccessToken()).token;
      } catch {
        throw fail(503, 'Photo search credentials are not configured on the server yet.');
      }
      if (!token) throw fail(503, 'Photo search credentials are not configured on the server yet.');

      const productSet = `projects/${PROJECT_ID}/locations/${LOCATION}/productSets/${PRODUCT_SET_ID}`;
      let response;
      try {
        response = await fetch('https://vision.googleapis.com/v1/images:annotate', {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ requests: [{
            image: { content: prepared.toString('base64') },
            features: [{ type: 'PRODUCT_SEARCH', maxResults: 8 }],
            imageContext: { productSearchParams: { productSet, productCategories: ['homegoods-v2'] } },
          }] }),
          signal: AbortSignal.timeout(20_000),
        });
      } catch {
        throw fail(502, 'Photo matching is temporarily unavailable. Please try again.');
      }
      if (!response.ok) {
        const detail = await response.json().catch(() => ({}));
        console.error('Wallpaper visual search failed:', response.status, detail.error?.status || 'Google Vision error');
        throw fail(502, 'Photo matching is temporarily unavailable. Please try again.');
      }

      const payload = await response.json();
      const results = payload.responses?.[0]?.productSearchResults?.results || [];
      return results.slice(0, 8).flatMap(result => {
        const id = result.product?.name?.split('/').at(-1);
        return id && /^[a-zA-Z0-9_-]{1,128}$/.test(id)
          ? [{ id, score: Number.isFinite(result.score) ? result.score : null }]
          : [];
      });
    },
  };
}
