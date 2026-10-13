// AWS Signature Version 4, the authentication R2's S3 API expects.
//
// Written against node:crypto rather than the AWS SDK: the whole algorithm is
// four HMACs over a canonical description of the request, and the SDK would add
// a large dependency tree to this service for one of its endpoints.
import { createHash, createHmac } from 'node:crypto';

const sha256 = value => createHash('sha256').update(value).digest('hex');
const hmac = (key, value) => createHmac('sha256', key).update(value).digest();

// Everything but the unreserved set is escaped, and a path keeps its separators.
const encode = (value, path = false) => encodeURIComponent(value)
  .replace(/[!'()*]/g, character => `%${character.charCodeAt(0).toString(16).toUpperCase()}`)
  .replace(/%2F/g, path ? '/' : '%2F');

export function signingKey(secret, date, region, service) {
  return hmac(hmac(hmac(hmac(`AWS4${secret}`, date), region), service), 'aws4_request');
}

/**
 * The canonical request, the exact bytes both sides agree the signature covers.
 * Headers are lower-cased, sorted and whitespace-collapsed so that a proxy
 * reordering them cannot invalidate an otherwise identical request.
 */
export function canonicalRequest({ method, path, query = {}, headers, payloadHash }) {
  const names = Object.keys(headers).map(name => name.toLowerCase()).sort();
  const canonicalHeaders = names
    .map(name => `${name}:${String(headers[Object.keys(headers).find(key => key.toLowerCase() === name)]).trim().replace(/\s+/g, ' ')}\n`)
    .join('');
  const canonicalQuery = Object.keys(query).sort()
    .map(key => `${encode(key)}=${encode(String(query[key]))}`).join('&');
  return {
    signedHeaders: names.join(';'),
    value: [method, encode(path, true), canonicalQuery, canonicalHeaders, names.join(';'), payloadHash].join('\n'),
  };
}

export function sign({ method, path, query, headers, payloadHash, secret, accessKeyId, region, service, date }) {
  const stamp = date.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
  const day = stamp.slice(0, 8);
  const scope = `${day}/${region}/${service}/aws4_request`;
  const canonical = canonicalRequest({ method, path, query, headers, payloadHash });
  const stringToSign = ['AWS4-HMAC-SHA256', stamp, scope, sha256(canonical.value)].join('\n');
  const signature = createHmac('sha256', signingKey(secret, day, region, service)).update(stringToSign).digest('hex');
  return {
    stamp, scope, signature, signedHeaders: canonical.signedHeaders,
    authorization: `AWS4-HMAC-SHA256 Credential=${accessKeyId}/${scope}, SignedHeaders=${canonical.signedHeaders}, Signature=${signature}`,
  };
}

/**
 * A link that carries its own authorization in the query string, so a customer
 * downloads straight from storage without the file passing through this server.
 * The signature covers the expiry, so the link cannot be extended by editing it.
 */
export function presign({ method = 'GET', url, headers = {}, query = {}, expires, secret, accessKeyId, region, service, date }) {
  const target = new URL(url);
  const stamp = date.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
  const day = stamp.slice(0, 8);
  const scope = `${day}/${region}/${service}/aws4_request`;
  // URL has already percent-encoded the pathname; the canonical request encodes
  // it itself, so sign the decoded form or every key with a space is signed twice.
  const rawPath = decodeURIComponent(target.pathname);
  const signedHeaders = { host: target.host, ...headers };
  const names = Object.keys(signedHeaders).map(name => name.toLowerCase()).sort().join(';');
  const signedQuery = {
    ...query,
    'X-Amz-Algorithm': 'AWS4-HMAC-SHA256',
    'X-Amz-Credential': `${accessKeyId}/${scope}`,
    'X-Amz-Date': stamp,
    'X-Amz-Expires': String(expires),
    'X-Amz-SignedHeaders': names,
  };
  // The payload is not known when the link is made, so it is excluded by name
  // rather than hashed, which is what UNSIGNED-PAYLOAD means here.
  const canonical = canonicalRequest({ method, path: rawPath, query: signedQuery, headers: signedHeaders, payloadHash: 'UNSIGNED-PAYLOAD' });
  const stringToSign = ['AWS4-HMAC-SHA256', stamp, scope, sha256(canonical.value)].join('\n');
  const signature = createHmac('sha256', signingKey(secret, day, region, service)).update(stringToSign).digest('hex');
  const search = Object.keys(signedQuery).sort().map(key => `${encode(key)}=${encode(String(signedQuery[key]))}`).join('&');
  return `${target.origin}${encode(rawPath, true)}?${search}&X-Amz-Signature=${signature}`;
}

export const hashPayload = body => body === undefined || body === null ? sha256('') : sha256(body);
export const UNSIGNED = 'UNSIGNED-PAYLOAD';
