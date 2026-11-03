import { json, readJSON, writeJSON, SITE_DEFAULTS } from '../../../lib/core.js';

export const onRequestPut = async ({ request, env }) => {
  const body = await request.json().catch(() => ({}));
  const old = await readJSON(env, 'site.json', {});
  const site = { heroV: old.heroV };
  for (const k of Object.keys(SITE_DEFAULTS)) site[k] = String(body[k] ?? '').slice(0, k === 'about' ? 5000 : 200);
  await writeJSON(env, 'site.json', site);
  return json(site);
};
