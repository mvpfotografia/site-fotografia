import { json, err, getMeta, saveMeta, adminMeta, coverKey } from '../../../../../../lib/core.js';

// Capa horizontal (h) ou vertical (v) carregada de fora da galeria.
// O painel envia a imagem já reduzida (JPEG) com ?w=&h= para a proporção.
export const onRequestPut = async ({ request, env, params }) => {
  const { slug, o } = params;
  if (!['h', 'v'].includes(o)) return err('Orientação inválida.');
  const meta = await getMeta(env, slug);
  if (!meta) return err('Galeria não encontrada.', 404);
  const q = new URL(request.url).searchParams;
  const w = +q.get('w') || 0, h = +q.get('h') || 0;
  await env.BUCKET.put(coverKey(meta.slug, o), request.body, {
    httpMetadata: { contentType: 'image/jpeg', cacheControl: 'public, max-age=86400' },
  });
  meta.covers ||= {};
  meta.covers[o] = { ext: true, w, h, v: Date.now() };
  await saveMeta(env, meta);
  return json(adminMeta(env, meta));
};
