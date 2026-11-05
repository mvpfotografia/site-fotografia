import { json, readJSON, SITE_DEFAULTS, publicBase, HERO_KEY, CONTACT_KEY } from '../../lib/core.js';

export const onRequestGet = async ({ env }) => {
  const site = { ...SITE_DEFAULTS, ...(await readJSON(env, 'site.json', {})) };
  if (!site.name || site.name === 'O Teu Nome') site.name = SITE_DEFAULTS.name;
  site.hero = site.heroV ? `${publicBase(env)}/${HERO_KEY}?v=${site.heroV}` : null;
  site.photo = site.photoV ? `${publicBase(env)}/${CONTACT_KEY}?v=${site.photoV}` : null;
  return json(site, 200, { 'cache-control': 'public, max-age=60' });
};
