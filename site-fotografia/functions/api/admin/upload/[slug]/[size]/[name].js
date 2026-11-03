import { json, err, getMeta, webPrefix, origPrefix, NAME_RE } from '../../../../../../lib/core.js';

// Recebe um ficheiro (original, versão web ou miniatura) e guarda-o no R2.
// Depois de carregar as 3 versões, o painel chama /photos {op:'add'}.
export const onRequestPut = async ({ request, env, params }) => {
  const { slug, size, name } = params;
  if (!['thumb', 'web', 'original'].includes(size) || !NAME_RE.test(name)) return err('Nome de ficheiro inválido.');
  const meta = await getMeta(env, slug);
  if (!meta) return err('Galeria não encontrada.', 404);
  const key = size === 'original' ? `${origPrefix(meta)}/${name}` : `${webPrefix(meta)}/${size}/${name}`;
  await env.BUCKET.put(key, request.body, {
    httpMetadata: {
      contentType: request.headers.get('content-type') || 'application/octet-stream',
      cacheControl: 'public, max-age=31536000, immutable',
      ...(size === 'original' ? { contentDisposition: `attachment; filename="${name}"` } : {}),
    },
  });
  return json({ ok: true });
};
