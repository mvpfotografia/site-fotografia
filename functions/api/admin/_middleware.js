import { err, isAdmin } from '../../../lib/core.js';

// Todas as rotas /api/admin/* exigem sessão de administrador (exceto o login)
export const onRequest = async (ctx) => {
  if (new URL(ctx.request.url).pathname === '/api/admin/login') return ctx.next();
  if (!(await isAdmin(ctx.request, ctx.env))) return err('Sessão expirada. Entra de novo.', 401);
  return ctx.next();
};
