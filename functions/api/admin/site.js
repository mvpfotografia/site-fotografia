import { json, readJSON, writeJSON, SITE_DEFAULTS, HERO_KEY } from '../../../lib/core.js';

export const onRequestPut = async ({ request, env }) => {
  const body = await request.json().catch(() => ({}));
  const old = await readJSON(env, 'site.json', {});
  const site = { heroV: old.heroV, photoV: old.photoV };
  for (const k of Object.keys(SITE_DEFAULTS)) site[k] = String(body[k] ?? '').slice(0, k === 'about' ? 5000 : 200);
  await writeJSON(env, 'site.json', site);
  return json(site);
};

// Volta à fotografia fixa da página inicial (apaga a imagem escolhida no painel)
export const onRequestDelete = async ({ env }) => {
  const site = await readJSON(env, 'site.json', {});
  delete site.heroV;
  await writeJSON(env, 'site.json', site);
  await env.BUCKET.delete(HERO_KEY);
  return json(site);
};
