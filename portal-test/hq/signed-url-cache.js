// N9: signed-URL caching for private media (kid videos, photos). A signed URL is valid for `ttlSec`; the page re-uses it until `marginSec`
// before it expires instead of asking Storage again on every render, asks for all missing paths in ONE request, and shares an in-flight
// request between callers. Same URLs => the browser (and a CDN in front of Storage) can serve repeated plays from cache.
// Pure module (no DOM): tests/media-delivery-unit.test.mjs.
export function createSignedUrlCache({ ttlSec = 900, marginSec = 120, now = () => Date.now(), max = 500 } = {}) {
  const cache = new Map();          // `${bucket}/${path}` -> { url, exp }
  const inflight = new Map();       // same key -> Promise<url|null>
  const fresh = (e) => e && e.exp - marginSec * 1000 > now();
  async function sign(client, bucket, paths) {
    const want = [...new Set(paths.filter(Boolean))];
    const out = {}, missing = [];
    for (const p of want) {
      const e = cache.get(`${bucket}/${p}`);
      if (fresh(e)) out[p] = e.url;
      else if (inflight.has(`${bucket}/${p}`)) out[p] = inflight.get(`${bucket}/${p}`);
      else missing.push(p);
    }
    if (missing.length) {
      const req = client.storage.from(bucket).createSignedUrls(missing, ttlSec).then(({ data, error }) => {
        if (error) throw error;
        const got = {};
        const exp = now() + ttlSec * 1000;
        for (const r of data || []) if (r.signedUrl && !r.error) { got[r.path] = r.signedUrl; cache.set(`${bucket}/${r.path}`, { url: r.signedUrl, exp }); }
        while (cache.size > max) cache.delete(cache.keys().next().value);
        return got;
      });
      for (const p of missing) inflight.set(`${bucket}/${p}`, req.then((g) => g[p] ?? null));
      try { await req; } finally { for (const p of missing) inflight.delete(`${bucket}/${p}`); }
      const got = await req;
      for (const p of missing) out[p] = got[p] ?? null;
    }
    for (const [k, v] of Object.entries(out)) out[k] = await v;
    for (const k of Object.keys(out)) if (!out[k]) delete out[k];
    return out;
  }
  return { sign, clear: () => cache.clear(), size: () => cache.size };
}

// The rendition files the worker makes next to a clip (worker/kid-videos.mjs makeRenditions): <asset folder>/r360.mp4 and r720.mp4.
export function renditionPaths(videoPath) {
  const i = String(videoPath || '').lastIndexOf('/');
  if (i < 1) return [];
  const dir = videoPath.slice(0, i);
  return [`${dir}/r360.mp4`, `${dir}/r720.mp4`];
}
// Which file to play: the smallest rendition on a slow or data-saving connection, 720p on a small screen, else the original.
export function pickVideo(videoPath, urls, { saveData = false, effectiveType = '4g', screenWidth = 1280 } = {}) {
  const [r360, r720] = renditionPaths(videoPath);
  if ((saveData || /(^|-)2g|3g/.test(effectiveType)) && urls[r360]) return { path: r360, type: 'video/mp4' };
  if (screenWidth <= 1024 && urls[r720]) return { path: r720, type: 'video/mp4' };
  return { path: videoPath, type: null };
}
