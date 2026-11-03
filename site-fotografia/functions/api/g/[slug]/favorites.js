import { json, err, getMeta, canView, writeJSON, NAME_RE } from '../../../../lib/core.js';

// O cliente marca as fotos favoritas (seleção para edição/álbum)
export const onRequestPut = async ({ request, env, params }) => {
  const meta = await getMeta(env, params.slug);
  if (!meta) return err('Galeria não encontrada.', 404);
  if (meta.favoritesOn === false) return err('Favoritas desativadas.', 403);
  if (!(await canView(request, env, meta))) return err('Sem acesso.', 403);
  const { favorites } = await request.json().catch(() => ({}));
  if (!Array.isArray(favorites) || favorites.length > 10000) return err('Pedido inválido.');
  const names = new Set(meta.photos.map((p) => p.name));
  const clean = [...new Set(favorites.filter((n) => typeof n === 'string' && NAME_RE.test(n) && names.has(n)))];
  await writeJSON(env, `galleries/${meta.slug}/favorites.json`, clean);
  return json({ ok: true, favorites: clean });
};
