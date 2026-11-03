import { json, err, readIndex, writeJSON, randomKey } from '../../../../lib/core.js';

// Criar / renomear / mover uma pasta
export const onRequestPost = async ({ request, env }) => {
  const b = await request.json().catch(() => ({}));
  const name = String(b.name || '').trim().slice(0, 100);
  if (!name) return err('Dá um nome à pasta.');
  const idx = await readIndex(env);
  const parent = b.parent && idx.folders.some((f) => f.id === b.parent) ? b.parent : null;
  let f = b.id && idx.folders.find((x) => x.id === b.id);
  if (f) {
    // impedir que uma pasta fique dentro de si própria
    for (let p = parent; p; p = idx.folders.find((x) => x.id === p)?.parent)
      if (p === f.id) return err('Uma pasta não pode ficar dentro de si própria.');
    Object.assign(f, { name, parent });
  } else idx.folders.push((f = { id: randomKey(8), name, parent }));
  await writeJSON(env, 'index.json', idx);
  return json(f);
};
