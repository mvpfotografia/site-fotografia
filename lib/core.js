// Funções partilhadas pelo servidor (Cloudflare Pages Functions + R2)
//
// Armazenamento:
//  DATA   (privado)  index.json, site.json, galleries/<slug>/meta.json, galleries/<slug>/favorites.json
//  BUCKET (público)  p/<slug>-<key>/thumb|web/<nome>   miniaturas e versões web
//                    o/<slug>-<okey>/<nome>            originais (chave separada)
//                    p/covers/<slug>.jpg               capa usada na página inicial
// As chaves aleatórias tornam os caminhos impossíveis de adivinhar: só quem passa a
// palavra-passe recebe o endereço. Assim as fotos são servidas diretamente pela rede
// da Cloudflare (grátis e sem limite de tráfego) sem passar pelo servidor.
const enc = new TextEncoder();

export function json(data, status = 200, headers = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store', ...headers },
  });
}
export const err = (message, status = 400) => json({ error: message }, status);

const toB64url = (bytes) => {
  let s = '';
  for (const b of bytes) s += String.fromCharCode(b);
  return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
};
const fromB64url = (str) => {
  str = str.replace(/-/g, '+').replace(/_/g, '/');
  while (str.length % 4) str += '=';
  return Uint8Array.from(atob(str), (c) => c.charCodeAt(0));
};
export const randomKey = (n = 18) => {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
  return Array.from(crypto.getRandomValues(new Uint8Array(n)), (b) => chars[b % 36]).join('');
};

// ---------- Sessões (cookies assinados com HMAC) ----------
async function hmacKey(env) {
  if (!env.SESSION_SECRET) throw new Error('Falta configurar SESSION_SECRET');
  return crypto.subtle.importKey('raw', enc.encode(env.SESSION_SECRET), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign', 'verify']);
}
export async function makeToken(env, subject, maxAgeSec) {
  const payload = enc.encode(`${subject}|${Date.now() + maxAgeSec * 1000}`);
  const sig = await crypto.subtle.sign('HMAC', await hmacKey(env), payload);
  return `${toB64url(payload)}.${toB64url(new Uint8Array(sig))}`;
}
export async function verifyToken(env, token, subject) {
  if (!token) return false;
  const [p, s] = token.split('.');
  if (!p || !s) return false;
  try {
    const payload = fromB64url(p);
    if (!(await crypto.subtle.verify('HMAC', await hmacKey(env), fromB64url(s), payload))) return false;
    const text = new TextDecoder().decode(payload);
    const i = text.lastIndexOf('|');
    return text.slice(0, i) === subject && Number(text.slice(i + 1)) > Date.now();
  } catch {
    return false;
  }
}
export function getCookie(request, name) {
  for (const part of (request.headers.get('cookie') || '').split(';')) {
    const [k, ...v] = part.trim().split('=');
    if (k === name) return v.join('=');
  }
  return null;
}
export const setCookie = (name, value, maxAge) =>
  `${name}=${value}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${maxAge}`;
export const isAdmin = (request, env) => verifyToken(env, getCookie(request, 'adm'), 'admin');

// ---------- Palavras-passe ----------
async function sha256(str) {
  return new Uint8Array(await crypto.subtle.digest('SHA-256', enc.encode(str)));
}
export async function safeEqual(a, b) {
  const [x, y] = await Promise.all([sha256(a), sha256(b)]);
  let d = 0;
  for (let i = 0; i < x.length; i++) d |= x[i] ^ y[i];
  return d === 0;
}
export async function hashPassword(password, saltB64) {
  const salt = saltB64 ? fromB64url(saltB64) : crypto.getRandomValues(new Uint8Array(16));
  const key = await crypto.subtle.importKey('raw', enc.encode(password), 'PBKDF2', false, ['deriveBits']);
  const bits = await crypto.subtle.deriveBits({ name: 'PBKDF2', hash: 'SHA-256', salt, iterations: 10000 }, key, 256);
  return { salt: toB64url(salt), hash: toB64url(new Uint8Array(bits)) };
}

// ---------- Dados ----------
export const SLUG_RE = /^[a-z0-9](?:[a-z0-9-]{0,62}[a-z0-9])?$/;
export const NAME_RE = /^[A-Za-z0-9][A-Za-z0-9._-]{0,150}$/;
export const SITE_DEFAULTS = {
  name: 'MVP Fotografia',
  tagline: 'Fotografia de eventos',
  heroLine: 'Descobre as melhores fotografias do teu último evento!',
  about: '',
  email: '',
  phone: '',
  instagram: '',
  location: '',
};

export async function readJSON(env, key, fallback = null) {
  const o = await env.DATA.get(key);
  return o ? o.json() : fallback;
}
export const writeJSON = (env, key, data) =>
  env.DATA.put(key, JSON.stringify(data), { httpMetadata: { contentType: 'application/json' } });

export const metaKey = (slug) => `galleries/${slug}/meta.json`;
export const getMeta = (env, slug) => (SLUG_RE.test(slug || '') ? readJSON(env, metaKey(slug)) : null);

export const publicBase = (env) => (env.PUBLIC_BASE || '/r').replace(/\/$/, '');
export const webPrefix = (meta) => `p/${meta.slug}-${meta.key}`;
export const origPrefix = (meta) => `o/${meta.slug}-${meta.okey}`;
export const coverKey = (slug) => `p/covers/${slug}.jpg`;
export const HERO_KEY = 'p/site/hero.jpg';

export const isExpired = (meta) => !!meta.expires && Date.now() > Date.parse(`${meta.expires}T23:59:59Z`);
// O "salt" muda sempre que a palavra-passe muda, invalidando sessões antigas.
export const gallerySubject = (meta) => `g:${meta.slug}:${meta.salt || ''}`;

export async function canView(request, env, meta) {
  if (await isAdmin(request, env)) return true;
  if (isExpired(meta)) return false;
  if (!meta.hash) return true;
  return verifyToken(env, getCookie(request, `g_${meta.slug}`), gallerySubject(meta));
}

export const emptyIndex = () => ({ folders: [], galleries: {} });
export async function readIndex(env) {
  const idx = await readJSON(env, 'index.json', null);
  return idx && idx.galleries ? idx : emptyIndex();
}

export function summary(env, meta) {
  return {
    slug: meta.slug,
    title: meta.title,
    date: meta.date,
    public: !!meta.public,
    hasPassword: !!meta.hash,
    expires: meta.expires,
    folder: meta.folder || null,
    count: meta.photos.length,
    bytes: meta.photos.reduce((s, p) => s + (p.size || 0), 0),
    cover: meta.cover ? `${publicBase(env)}/${coverKey(meta.slug)}?v=${meta.coverV || 0}` : null,
    updated: meta.updated,
  };
}

// Guarda a galeria e atualiza o índice
export async function saveMeta(env, meta) {
  meta.updated = new Date().toISOString();
  await writeJSON(env, metaKey(meta.slug), meta);
  const idx = await readIndex(env);
  idx.galleries[meta.slug] = summary(env, meta);
  await writeJSON(env, 'index.json', idx);
}

// Copia a versão web da foto escolhida para o ficheiro de capa público
export async function setCover(env, meta, name) {
  if (!name || !meta.photos.some((p) => p.name === name)) {
    meta.cover = null;
    await env.BUCKET.delete(coverKey(meta.slug));
    return;
  }
  const src = await env.BUCKET.get(`${webPrefix(meta)}/web/${name}`);
  if (!src) return;
  await env.BUCKET.put(coverKey(meta.slug), src.body, {
    httpMetadata: { contentType: 'image/jpeg', cacheControl: 'public, max-age=86400' },
  });
  meta.cover = name;
  meta.coverV = Date.now();
}

export async function deletePrefix(bucket, prefix) {
  let cursor;
  do {
    const res = await bucket.list({ prefix, cursor });
    if (res.objects.length) await bucket.delete(res.objects.map((o) => o.key));
    cursor = res.truncated ? res.cursor : undefined;
  } while (cursor);
}

export const adminMeta = (env, { hash, salt, ...rest }) => ({
  ...rest,
  hasPassword: !!hash,
  base: `${publicBase(env)}/${webPrefix(rest)}`,
  obase: `${publicBase(env)}/${origPrefix(rest)}`,
});
