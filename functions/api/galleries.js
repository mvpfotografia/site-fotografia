import { json, readIndex, isExpired } from '../../lib/core.js';

// Álbuns públicos que aparecem na página inicial
export const onRequestGet = async ({ env }) => {
  const idx = await readIndex(env);
  const list = Object.values(idx.galleries)
    .filter((g) => g.public && g.count && !isExpired(g))
    .sort((a, b) => (b.date || '').localeCompare(a.date || ''))
    .map(({ slug, title, date, hasPassword, cover, coverRatio, count }) => ({ slug, title, date, hasPassword, cover, coverRatio, count }));
  return json(list, 200, { 'cache-control': 'public, max-age=60' });
};
