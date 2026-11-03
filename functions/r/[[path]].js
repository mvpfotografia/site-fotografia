// Serve fotografias do bucket quando ainda não ligaste um domínio público ao R2
// (e em testes locais). Com PUBLIC_BASE definido, as fotos não passam por aqui.
export const onRequestGet = async ({ request, env, params }) => {
  const key = (params.path || []).join('/');
  if (!/^[po]\//.test(key) || key.includes('..')) return new Response('Não encontrado', { status: 404 });
  const obj = await env.BUCKET.get(key, { onlyIf: request.headers });
  if (!obj) return new Response('Não encontrado', { status: 404 });
  const headers = new Headers();
  obj.writeHttpMetadata(headers);
  headers.set('etag', obj.httpEtag);
  headers.set('cache-control', 'public, max-age=31536000, immutable');
  if (new URL(request.url).searchParams.has('dl'))
    headers.set('content-disposition', `attachment; filename="${key.split('/').pop()}"`);
  if (!obj.body) return new Response(null, { status: 304, headers });
  return new Response(obj.body, { headers });
};
