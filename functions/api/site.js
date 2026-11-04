import { json, readJSON, SITE_DEFAULTS, publicBase, HERO_KEY } from '../../lib/core.js';

export const onRequestGet = async ({ env }) => {
  const site = { ...SITE_DEFAULTS, ...(await readJSON(env, 'site.json', {})) };
  if (!site.name || site.name === 'O Teu Nome') site.name = SITE_DEFAULTS.name;
  site.hero = site.heroV ? `${publicBase(env)}/${HERO_KEY}?v=${site.heroV}` : null;
  return json(site, 200, { 'cache-control': 'public, max-age=60' });
};
