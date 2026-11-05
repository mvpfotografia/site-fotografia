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
// Capa principal (p/covers/<slug>.jpg) e capas por orientação: -h horizontal, -v vertical
export const coverKey = (slug, o) => `p/covers/${slug}${o ? '-' + o : ''}.jpg`;
export const orientation = (p) => ((p.w || 3) >= (p.h || 2) ? 'h' : 'v');
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

// Proporção (largura / altura) de uma foto da galeria, para a grelha de eventos
function ratioOf(meta, name) {
  const p = name && meta.photos.find((x) => x.name === name);
  return p && p.w && p.h ? Math.round((p.w / p.h) * 1000) / 1000 : null;
}
const coverRatio = (meta) => ratioOf(meta, meta.cover);

// Endereços públicos das capas horizontal e vertical: { h: {url, ratio}, v: {url, ratio} }
export function coverSet(env, meta) {
  const out = {};
  for (const o of ['h', 'v']) {
    const c = meta.covers?.[o];
    if (c) out[o] = { url: `${publicBase(env)}/${coverKey(meta.slug, o)}?v=${c.v || 0}`, ratio: ratioOf(meta, c.name) };
  }
  return out;
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
    coverRatio: coverRatio(meta),
    covers: coverSet(env, meta),
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

// Copia a versão web de uma foto para um ficheiro de capa público
async function copyCover(env, meta, name, key) {
  const src = await env.BUCKET.get(`${webPrefix(meta)}/web/${name}`);
  if (!src) return false;
  await env.BUCKET.put(key, src.body, {
    httpMetadata: { contentType: 'image/jpeg', cacheControl: 'public, max-age=86400' },
  });
  return true;
}

// Capa da orientação o ('h' ou 'v'); sem nome, remove-a
async function setSideCover(env, meta, o, name) {
  meta.covers ||= {};
  if (!name) {
    delete meta.covers[o];
    await env.BUCKET.delete(coverKey(meta.slug, o));
    return;
  }
  if (await copyCover(env, meta, name, coverKey(meta.slug, o))) meta.covers[o] = { name, v: Date.now() };
}

// Escolha manual: passa a ser a capa principal e a capa da sua orientação
export async function setCover(env, meta, name) {
  const p = name && meta.photos.find((x) => x.name === name);
  if (!p) {
    meta.cover = null;
    await env.BUCKET.delete(coverKey(meta.slug));
    return;
  }
  if (!(await copyCover(env, meta, name, coverKey(meta.slug)))) return;
  meta.cover = name;
  meta.coverV = Date.now();
  await setSideCover(env, meta, orientation(p), name);
}

// Garante uma capa horizontal e uma vertical (quando há fotos dessa orientação)
// e uma capa principal. Só mexe no que falta ou deixou de existir.
export async function fillCovers(env, meta) {
  meta.covers ||= {};
  const has = (n) => n && meta.photos.some((p) => p.name === n);
  for (const o of ['h', 'v']) {
    const cur = meta.covers[o];
    if (cur && has(cur.name)) continue;
    const main = meta.photos.find((p) => p.name === meta.cover && orientation(p) === o);
    const pick = main || meta.photos.find((p) => orientation(p) === o);
    if (pick) await setSideCover(env, meta, o, pick.name);
    else if (cur) await setSideCover(env, meta, o, null);
  }
  if (!has(meta.cover)) {
    const next = meta.covers.h?.name || meta.covers.v?.name || meta.photos[0]?.name;
    if (next || meta.cover) await setCover(env, meta, next);
  }
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
