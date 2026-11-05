import { json, err, getMeta, readJSON, readIndex, writeJSON, adminMeta, deletePrefix, webPrefix, origPrefix, coverKey } from '../../../../../lib/core.js';

export const onRequestGet = async ({ env, params }) => {
  const meta = await getMeta(env, params.slug);
  if (!meta) return err('Galeria não encontrada.', 404);
  const favorites = await readJSON(env, `galleries/${meta.slug}/favorites.json`, []);
  return json({ ...adminMeta(env, meta), favorites });
};

export const onRequestDelete = async ({ env, params }) => {
  const meta = await getMeta(env, params.slug);
  if (!meta) return err('Galeria não encontrada.', 404);
  await deletePrefix(env.BUCKET, webPrefix(meta) + '/');
  await deletePrefix(env.BUCKET, origPrefix(meta) + '/');
  await env.BUCKET.delete([coverKey(meta.slug), coverKey(meta.slug, 'h'), coverKey(meta.slug, 'v')]);
  await deletePrefix(env.DATA, `galleries/${meta.slug}/`);
  const idx = await readIndex(env);
  delete idx.galleries[meta.slug];
  await writeJSON(env, 'index.json', idx);
  return json({ ok: true });
};
