import { json, err, getMeta, saveMeta, hashPassword, adminMeta, readIndex, randomKey, SLUG_RE } from '../../../../lib/core.js';

// Criar ou atualizar uma galeria. Só os campos enviados são alterados.
export const onRequestPost = async ({ request, env }) => {
  const b = await request.json().catch(() => ({}));
  const slug = String(b.slug || '').trim().toLowerCase();
  if (!SLUG_RE.test(slug)) return err('Endereço inválido: usa só letras minúsculas, números e hífens (ex: casamento-ana-joao).');
  let meta = await getMeta(env, slug);
  if (b.create && meta) return err('Já existe uma galeria com esse endereço.', 409);
  if (!b.create && !meta) return err('Galeria não encontrada.', 404);
  meta ||= { slug, key: randomKey(), okey: randomKey(), created: new Date().toISOString(), cover: null, photos: [], favoritesOn: true };

  const date = /^\d{4}-\d{2}-\d{2}$/;
  if ('title' in b) meta.title = String(b.title || slug).slice(0, 200);
  if ('date' in b) meta.date = date.test(b.date) ? b.date : null;
  if ('description' in b) meta.description = String(b.description || '').slice(0, 3000);
  if ('public' in b) meta.public = !!b.public;
  if ('allowDownload' in b) meta.allowDownload = !!b.allowDownload;
  if ('favoritesOn' in b) meta.favoritesOn = !!b.favoritesOn;
  if ('protect' in b) meta.protect = !!b.protect;
  if ('expires' in b) meta.expires = date.test(b.expires) ? b.expires : null;
  if ('folder' in b) {
    const idx = await readIndex(env);
    meta.folder = idx.folders.some((f) => f.id === b.folder) ? b.folder : null;
  }
  if (typeof b.password === 'string') {
    if (b.password.trim() === '') {
      delete meta.hash;
      delete meta.salt;
    } else Object.assign(meta, await hashPassword(b.password.trim()));
  }
  meta.title ||= slug;
  await saveMeta(env, meta);
  return json(adminMeta(env, meta));
};
