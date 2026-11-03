import { json, readIndex, publicBase } from '../../../lib/core.js';

// Pastas + galerias para a barra lateral do painel
export const onRequestGet = async ({ env }) => {
  const idx = await readIndex(env);
  return json({ ...idx, publicBase: publicBase(env), hasPublicDomain: !!env.PUBLIC_BASE });
};
