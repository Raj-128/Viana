import { GoogleAuth } from 'google-auth-library';

const args = Object.fromEntries(process.argv.slice(2).filter(item => item.startsWith('--')).map(item => {
  const [key, ...value] = item.slice(2).split('=');
  return [key, value.join('=')];
}));
const project = args.project || process.env.GOOGLE_CLOUD_PROJECT;
const location = args.location || process.env.GOOGLE_CLOUD_LOCATION || 'us-west1';
const bucket = args.bucket;
const productSet = args['product-set'] || process.env.GOOGLE_PRODUCT_SET_ID || 'studio-viana-wallpapers';
if (!project || !bucket || !/^[a-zA-Z0-9-]+$/.test(project) || !/^[a-zA-Z0-9-]+$/.test(location) || !/^[a-z0-9][a-z0-9._-]{1,220}[a-z0-9]$/.test(bucket) || !/^[a-zA-Z0-9_-]{1,128}$/.test(productSet)) {
  console.error('Usage: npm run visual-search:import -- --project=GCP_PROJECT --bucket=GCS_BUCKET [--location=us-west1] [--product-set=studio-viana-wallpapers]');
  process.exit(1);
}

const auth = new GoogleAuth({ scopes: ['https://www.googleapis.com/auth/cloud-vision'] });
const client = await auth.getClient();
async function googleRequest(url, options = {}) {
  const token = (await client.getAccessToken()).token;
  const response = await fetch(url, {
    ...options,
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json', ...(options.headers || {}) },
    signal: AbortSignal.timeout(60_000),
  });
  const payload = await response.json();
  if (!response.ok) throw new Error(payload.error?.message || `Google API returned HTTP ${response.status}`);
  return payload;
}

const base = `https://vision.googleapis.com/v1/projects/${project}/locations/${location}`;
console.log(`Importing gs://${bucket}/visual-search/catalogue.csv into product set ${productSet}…`);
const operation = await googleRequest(`${base}/productSets:import`, {
  method: 'POST',
  body: JSON.stringify({ inputConfig: { gcsSource: { csvFileUri: `gs://${bucket}/visual-search/catalogue.csv` } } }),
});
if (!operation.name) throw new Error('Google did not return an import operation.');
console.log(`Import operation: ${operation.name}`);
let result = operation;
for (let attempt = 0; !result.done && attempt < 90; attempt++) {
  await new Promise(resolve => setTimeout(resolve, 10_000));
  result = await googleRequest(`https://vision.googleapis.com/v1/${operation.name}`);
}
if (!result.done) throw new Error('Import is still running. Check the operation again in Google Cloud Console.');
if (result.error) throw new Error(result.error.message || 'Catalogue import failed.');
const statuses = result.response?.statuses || [];
const errors = statuses.filter(status => status.code && status.code !== 0);
console.log(`Import finished: ${statuses.length - errors.length} of ${statuses.length} catalogue images accepted.`);
if (errors.length) {
  console.error(errors.slice(0, 12).map(status => status.message || `Google import error ${status.code}`).join('\n'));
  process.exitCode = 1;
}
console.log('Product Search may need up to a day to refresh the visual index.');
