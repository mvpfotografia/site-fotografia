import { json, err, getMeta, isAdmin, isExpired, canView, readJSON, publicBase, webPrefix, origPrefix, coverKey } from '../../../../lib/core.js';

export const onRequestGet = async ({ request, env, params }) => {
  const meta = await getMeta(env, params.slug);
  if (!meta) return err('Galeria não encontrada.', 404);
  if (isExpired(meta) && !(await isAdmin(request, env)))
    return err('Esta galeria expirou. Contacte o fotógrafo.', 410);
  const info = {
    slug: meta.slug,
    title: meta.title,
    date: meta.date,
    description: meta.description,
    allowDownload: !!meta.allowDownload,
    favorites: meta.favoritesOn !== false,
    protect: !!meta.protect,
    expires: meta.expires,
    hasPassword: !!meta.hash,
    count: meta.photos.length,
    cover: meta.cover && (meta.public || !meta.hash) ? `${publicBase(env)}/${coverKey(meta.slug)}?v=${meta.coverV || 0}` : null,
  };
  if (!(await canView(request, env, meta))) return json({ ...info, locked: true });
  const favs = info.favorites ? await readJSON(env, `galleries/${meta.slug}/favorites.json`, []) : [];
  return json({
    ...info,
    locked: false,
    base: `${publicBase(env)}/${webPrefix(meta)}`,
    obase: meta.allowDownload ? `${publicBase(env)}/${origPrefix(meta)}` : null,
    photos: meta.photos.map(({ name, w, h, caption }) => ({ name, w, h, caption })),
    favoriteList: favs,
  });
};
