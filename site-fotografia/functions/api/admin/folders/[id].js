import { json, err, readIndex, writeJSON, getMeta, saveMeta } from '../../../../lib/core.js';

// Apagar pasta: o conteúdo passa para a pasta de cima (as galerias não são apagadas)
export const onRequestDelete = async ({ env, params }) => {
  const idx = await readIndex(env);
  const f = idx.folders.find((x) => x.id === params.id);
  if (!f) return err('Pasta não encontrada.', 404);
  for (const x of idx.folders) if (x.parent === f.id) x.parent = f.parent;
  const moved = Object.values(idx.galleries).filter((g) => g.folder === f.id);
  idx.folders = idx.folders.filter((x) => x.id !== f.id);
  await writeJSON(env, 'index.json', idx);
  // atualizar as galerias que estavam na pasta
  for (const g of moved) {
    const meta = await getMeta(env, g.slug);
    if (meta) { meta.folder = f.parent; await saveMeta(env, meta); }
  }
  return json({ ok: true });
};
