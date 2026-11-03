import { json, err, getMeta, saveMeta, setCover, readJSON, writeJSON, adminMeta, webPrefix, origPrefix, NAME_RE, HERO_KEY } from '../../../../../lib/core.js';

// Operações sobre as fotos de uma galeria
//  add      { photos:[{name,w,h,size}] }   regista fotos já carregadas
//  order    { names:[...] }                nova ordem
//  caption  { name, caption }
//  cover    { name }
//  hero     { name }                       imagem principal do site
//  delete   { names:[...] }
//  move     { names:[...], to }            mover para outra galeria
export const onRequestPost = async ({ request, env, params }) => {
  const meta = await getMeta(env, params.slug);
  if (!meta) return err('Galeria não encontrada.', 404);
  const b = await request.json().catch(() => ({}));
  const names = Array.isArray(b.names) ? b.names.filter((n) => typeof n === 'string') : [];
  const byName = new Map(meta.photos.map((p) => [p.name, p]));

  switch (b.op) {
    case 'add': {
      for (const p of b.photos || []) {
        if (!NAME_RE.test(p.name || '')) continue;
        const entry = { name: p.name, w: +p.w || 3, h: +p.h || 2, size: +p.size || 0, added: new Date().toISOString(), taken: p.taken || null };
        const old = byName.get(p.name);
        if (old) Object.assign(old, entry, { caption: old.caption });
        else meta.photos.push(entry);
      }
      if (!meta.cover && meta.photos.length) await setCover(env, meta, meta.photos[0].name);
      break;
    }
    case 'order': {
      const seen = new Set();
      const next = [];
      for (const n of names) if (byName.has(n) && !seen.has(n)) { seen.add(n); next.push(byName.get(n)); }
      for (const p of meta.photos) if (!seen.has(p.name)) next.push(p);
      meta.photos = next;
      break;
    }
    case 'caption': {
      const p = byName.get(b.name);
      if (!p) return err('Foto não encontrada.', 404);
      p.caption = String(b.caption || '').slice(0, 1000);
      break;
    }
    case 'cover':
      await setCover(env, meta, b.name);
      break;
    case 'hero': {
      // imagem principal da página inicial
      if (!byName.has(b.name)) return err('Foto não encontrada.', 404);
      const src = await env.BUCKET.get(`${webPrefix(meta)}/web/${b.name}`);
      if (!src) return err('Foto não encontrada.', 404);
      await env.BUCKET.put(HERO_KEY, src.body, { httpMetadata: { contentType: 'image/jpeg', cacheControl: 'public, max-age=86400' } });
      const site = await readJSON(env, 'site.json', {});
      site.heroV = Date.now();
      await writeJSON(env, 'site.json', site);
      return json(adminMeta(env, meta));
    }
    case 'delete': {
      const del = new Set(names.filter((n) => byName.has(n)));
      const keys = [];
      for (const n of del) keys.push(`${webPrefix(meta)}/thumb/${n}`, `${webPrefix(meta)}/web/${n}`, `${origPrefix(meta)}/${n}`);
      for (let i = 0; i < keys.length; i += 900) await env.BUCKET.delete(keys.slice(i, i + 900));
      meta.photos = meta.photos.filter((p) => !del.has(p.name));
      if (del.has(meta.cover)) await setCover(env, meta, meta.photos[0]?.name);
      await dropFavorites(env, meta.slug, del);
      break;
    }
    case 'move': {
      const dest = await getMeta(env, b.to);
      if (!dest || dest.slug === meta.slug) return err('Galeria de destino inválida.');
      const list = names.filter((n) => byName.has(n)).slice(0, 100);
      const destNames = new Set(dest.photos.map((p) => p.name));
      for (const n of list) {
        let target = n;
        for (let i = 2; destNames.has(target); i++) target = n.replace(/(\.[^.]+)?$/, `-${i}$1`);
        destNames.add(target);
        for (const [from, to] of [
          [`${webPrefix(meta)}/thumb/${n}`, `${webPrefix(dest)}/thumb/${target}`],
          [`${webPrefix(meta)}/web/${n}`, `${webPrefix(dest)}/web/${target}`],
          [`${origPrefix(meta)}/${n}`, `${origPrefix(dest)}/${target}`],
        ]) {
          const o = await env.BUCKET.get(from);
          if (o) await env.BUCKET.put(to, o.body, { httpMetadata: o.httpMetadata });
          await env.BUCKET.delete(from);
        }
        dest.photos.push({ ...byName.get(n), name: target });
      }
      const moved = new Set(list);
      meta.photos = meta.photos.filter((p) => !moved.has(p.name));
      if (moved.has(meta.cover)) await setCover(env, meta, meta.photos[0]?.name);
      if (!dest.cover && dest.photos.length) await setCover(env, dest, dest.photos[0].name);
      await dropFavorites(env, meta.slug, moved);
      await saveMeta(env, dest);
      break;
    }
    default:
      return err('Operação desconhecida.');
  }
  await saveMeta(env, meta);
  return json(adminMeta(env, meta));
};

async function dropFavorites(env, slug, names) {
  const key = `galleries/${slug}/favorites.json`;
  const fav = await readJSON(env, key, []);
  const next = fav.filter((n) => !names.has(n));
  if (next.length !== fav.length) await writeJSON(env, key, next);
}
