import { json, err, safeEqual, makeToken, setCookie } from '../../../lib/core.js';

export const onRequestPost = async ({ request, env }) => {
  if (!env.ADMIN_PASSWORD || !env.SESSION_SECRET)
    return err('O site ainda não está configurado (ADMIN_PASSWORD / SESSION_SECRET).', 500);
  const { password = '' } = await request.json().catch(() => ({}));
  if (!(await safeEqual(String(password), env.ADMIN_PASSWORD))) {
    await new Promise((r) => setTimeout(r, 1000));
    return err('Palavra-passe incorreta.', 401);
  }
  const maxAge = 14 * 86400;
  return json({ ok: true }, 200, { 'set-cookie': setCookie('adm', await makeToken(env, 'admin', maxAge), maxAge) });
};
