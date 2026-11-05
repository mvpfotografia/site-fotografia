import { json, err, readJSON, writeJSON, CONTACT_KEY } from '../../../lib/core.js';

// Fotografia da página Contacto: o painel envia a imagem já reduzida (JPEG)
export const onRequestPut = async ({ request, env }) => {
  if (!request.body) return err('Sem imagem.');
  await env.BUCKET.put(CONTACT_KEY, request.body, {
    httpMetadata: { contentType: 'image/jpeg', cacheControl: 'public, max-age=86400' },
  });
  const site = await readJSON(env, 'site.json', {});
  site.photoV = Date.now();
  await writeJSON(env, 'site.json', site);
  return json(site);
};

// Volta a usar a capa de uma galeria
export const onRequestDelete = async ({ env }) => {
  const site = await readJSON(env, 'site.json', {});
  delete site.photoV;
  await writeJSON(env, 'site.json', site);
  await env.BUCKET.delete(CONTACT_KEY);
  return json(site);
};
