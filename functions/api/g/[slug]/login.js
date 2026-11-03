import { json, err, getMeta, isExpired, hashPassword, safeEqual, makeToken, setCookie, gallerySubject } from '../../../../lib/core.js';

export const onRequestPost = async ({ request, env, params }) => {
  const meta = await getMeta(env, params.slug);
  if (!meta) return err('Galeria não encontrada.', 404);
  if (isExpired(meta)) return err('Esta galeria expirou.', 410);
  if (!meta.hash) return json({ ok: true });
  const { password = '' } = await request.json().catch(() => ({}));
  const { hash } = await hashPassword(String(password).trim(), meta.salt);
  if (!(await safeEqual(hash, meta.hash))) {
    await new Promise((r) => setTimeout(r, 700)); // atrasa tentativas repetidas
    return err('Palavra-passe incorreta.', 401);
  }
  const maxAge = 30 * 86400;
  const token = await makeToken(env, gallerySubject(meta), maxAge);
  return json({ ok: true }, 200, { 'set-cookie': setCookie(`g_${meta.slug}`, token, maxAge) });
};
