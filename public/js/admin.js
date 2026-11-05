import { api, esc, fmtDate, fmtBytes, urls, lightbox, downloadMany } from '/js/common.js';

// ============ Ícones ============
const I = {
  upload: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 16V4M6 10l6-6 6 6M4 20h16"/></svg>',
  share: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><path d="M8.6 13.5l6.8 4M15.4 6.5l-6.8 4"/></svg>',
  gear: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/></svg>',
  eye: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>',
  plus: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 5v14M5 12h14"/></svg>',
  folder: '<svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor"><path d="M10 4H4a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-8l-2-2z"/></svg>',
  img: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="M21 15l-5-5L5 21"/></svg>',
  trash: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6"/></svg>',
  move: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M5 9l-3 3 3 3M9 5l3-3 3 3M15 19l-3 3-3-3M19 9l3 3-3 3M2 12h20M12 2v20"/></svg>',
  star: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2l3.1 6.3 6.9 1-5 4.9 1.2 6.8L12 17.8 5.8 21l1.2-6.8-5-4.9 6.9-1z"/></svg>',
  dl: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 4v12M6 10l6 6 6-6M4 20h16"/></svg>',
  menu: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 6h18M3 12h18M3 18h18"/></svg>',
  moon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 12.8A9 9 0 1 1 11.2 3 7 7 0 0 0 21 12.8z"/></svg>',
};

// ============ Estado ============
const store = {
  get: (k, d) => { try { return JSON.parse(localStorage.getItem(k)) ?? d; } catch { return d; } },
  set: (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch {} },
};
const S = {
  tree: null,
  g: null, // galeria aberta
  sel: new Set(),
  last: null,
  filter: 'all',
  open: new Set(store.get('openFolders', [])),
  ts: store.get('thumbSize', 170),
};
const root = document.getElementById('root');
const $ = (sel, el = document) => el.querySelector(sel);
const theme = store.get('theme', 'dark');
if (theme === 'light') document.documentElement.dataset.theme = 'light';

function toast(msg) {
  const t = document.createElement('div');
  t.className = 'toast';
  t.textContent = msg;
  document.body.append(t);
  setTimeout(() => t.remove(), 2600);
}
async function run(fn) {
  try { return await fn(); } catch (e) {
    if (e.status === 401) return showLogin();
    alert(e.message);
  }
}
const randomPassword = () => {
  const c = 'abcdefghjkmnpqrstuvwxyz23456789';
  return Array.from(crypto.getRandomValues(new Uint8Array(8)), (b) => c[b % c.length]).join('');
};
const slugify = (s) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/&/g, 'e').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 64);
const folderPath = (id) => {
  const out = [];
  for (let f = S.tree.folders.find((x) => x.id === id); f; f = S.tree.folders.find((x) => x.id === f.parent)) out.unshift(f);
  return out;
};

// ============ Arranque e login ============
async function boot() {
  try { S.tree = await api('/api/admin/tree'); } catch (e) { if (e.status === 401) return showLogin(); throw e; }
  renderShell();
  route();
}
function showLogin() {
  root.innerHTML = `
    <div class="login"><form id="lf">
      <h1>Painel de gestão</h1>
      <input id="lp" type="password" placeholder="Palavra-passe" autocomplete="current-password" required autofocus>
      <button class="btn primary" style="justify-content:center">Entrar</button>
      <div class="error" id="le"></div>
    </form></div>`;
  $('#lf').onsubmit = async (e) => {
    e.preventDefault();
    try {
      await api('/api/admin/login', { method: 'POST', body: JSON.stringify({ password: $('#lp').value }) });
      boot();
    } catch (er) { $('#le').textContent = er.message; }
  };
}

function renderShell() {
  root.innerHTML = `
    <header class="top">
      <button class="btn icon menu-btn" id="menu" title="Galerias">${I.menu}</button>
      <div class="brand"><span>Painel</span></div>
      <button class="btn hide-sm" id="site">${I.gear}<span>Site</span></button>
      <a class="btn hide-sm" href="/" target="_blank">${I.eye}<span>Ver site</span></a>
      <button class="btn icon" id="theme" title="Tema claro/escuro">${I.moon}</button>
      <button class="btn" id="out">Sair</button>
    </header>
    <div class="org">
      <aside class="side" id="side">
        <div class="side-head">
          <button class="btn primary" id="newg" style="flex:1;justify-content:center">${I.plus}Nova galeria</button>
          <button class="btn icon" id="newf" title="Nova pasta">${I.folder}</button>
        </div>
        <div class="tree" id="tree"></div>
        <div class="side-foot" id="foot"></div>
      </aside>
      <section class="main" id="main"></section>
      <aside class="info hidden" id="info"></aside>
    </div>`;
  $('#menu').onclick = () => $('#side').classList.toggle('open');
  $('#site').onclick = siteModal;
  $('#theme').onclick = () => {
    const light = document.documentElement.dataset.theme !== 'light';
    if (light) document.documentElement.dataset.theme = 'light'; else delete document.documentElement.dataset.theme;
    store.set('theme', light ? 'light' : 'dark');
  };
  $('#out').onclick = async () => { await api('/api/admin/logout', { method: 'POST' }); location.href = '/admin'; };
  $('#newg').onclick = () => newGalleryModal(S.g?.folder || null);
  $('#newf').onclick = () => folderModal();
  document.addEventListener('keydown', onKey);
  renderTree();
}

function go(slug) {
  history.pushState(null, '', slug ? `/admin?g=${slug}` : '/admin');
  $('#side')?.classList.remove('open');
  route();
}
window.addEventListener('popstate', route);
function route() {
  const slug = new URLSearchParams(location.search).get('g');
  if (slug) openGallery(slug);
  else { S.g = null; renderTree(); renderDashboard(); }
}
async function refreshTree() {
  S.tree = await api('/api/admin/tree');
  renderTree();
}

// ============ Barra lateral (pastas e galerias) ============
function renderTree() {
  const el = $('#tree');
  if (!el) return;
  const { folders, galleries } = S.tree;
  const gl = Object.values(galleries).sort((a, b) => (b.date || '').localeCompare(a.date || '') || a.title.localeCompare(b.title));
  const countIn = (id) => gl.filter((g) => g.folder === id).length + folders.filter((f) => f.parent === id).reduce((s, f) => s + countIn(f.id), 0);
  const html = [];
  const walk = (parent, depth) => {
    for (const f of folders.filter((x) => (x.parent || null) === parent).sort((a, b) => a.name.localeCompare(b.name))) {
      const open = S.open.has(f.id);
      html.push(`<div class="node" data-folder="${f.id}" style="padding-left:${8 + depth * 16}px">
        <span class="caret ${open ? 'open' : ''}">▶</span><span class="ic">${I.folder}</span>
        <span class="nm">${esc(f.name)}</span><span class="ct">${countIn(f.id)}</span>
        <span class="acts"><button data-act="newg" title="Nova galeria aqui">＋</button><button data-act="edit" title="Renomear">✎</button><button data-act="del" title="Apagar pasta">✕</button></span></div>`);
      if (open) walk(f.id, depth + 1);
    }
    for (const g of gl.filter((x) => (x.folder || null) === parent)) {
      html.push(`<div class="node ${S.g?.slug === g.slug ? 'active' : ''}" data-gallery="${g.slug}" draggable="true" style="padding-left:${8 + depth * 16 + 16}px">
        <span class="ic" style="${g.cover ? `background-image:url('${g.cover}')` : ''}">${g.cover ? '' : I.img}</span>
        <span class="nm" title="${esc(g.title)}">${esc(g.title)}</span><span class="ct">${g.count}</span></div>`);
    }
  };
  html.push('<div class="tree-label node" data-folder="" style="height:auto;cursor:default">Galerias</div>');
  walk(null, 0);
  if (!gl.length && !folders.length) html.push('<div class="muted" style="padding:8px 14px;font-size:13px">Ainda sem galerias. Cria a primeira!</div>');
  el.innerHTML = html.join('');

  el.onclick = (e) => {
    const n = e.target.closest('.node');
    if (!n) return;
    const act = e.target.closest('[data-act]')?.dataset.act;
    if (n.dataset.folder) {
      const f = folders.find((x) => x.id === n.dataset.folder);
      if (act === 'edit') return folderModal(f);
      if (act === 'newg') return newGalleryModal(f.id);
      if (act === 'del') return deleteFolder(f);
      S.open.has(f.id) ? S.open.delete(f.id) : S.open.add(f.id);
      store.set('openFolders', [...S.open]);
      renderTree();
    } else if (n.dataset.gallery) go(n.dataset.gallery);
  };

  // Arrastar galerias para pastas, e fotos para outras galerias
  el.ondragstart = (e) => {
    const n = e.target.closest('[data-gallery]');
    if (n) e.dataTransfer.setData('x-gallery', n.dataset.gallery);
  };
  el.ondragover = (e) => {
    const n = e.target.closest('.node');
    if (!n) return;
    const t = e.dataTransfer.types;
    const ok = (t.includes('x-gallery') && n.dataset.folder !== undefined) || (t.includes('x-photos') && n.dataset.gallery && n.dataset.gallery !== S.g?.slug);
    if (!ok) return;
    e.preventDefault();
    el.querySelectorAll('.drop-target').forEach((x) => x.classList.remove('drop-target'));
    n.classList.add('drop-target');
  };
  el.ondragleave = (e) => e.target.closest?.('.node')?.classList.remove('drop-target');
  el.ondrop = (e) => run(async () => {
    const n = e.target.closest('.node');
    el.querySelectorAll('.drop-target').forEach((x) => x.classList.remove('drop-target'));
    if (!n) return;
    e.preventDefault();
    const gslug = e.dataTransfer.getData('x-gallery');
    if (gslug && n.dataset.folder !== undefined) {
      await api('/api/admin/galleries', { method: 'POST', body: JSON.stringify({ slug: gslug, folder: n.dataset.folder || null }) });
      if (S.g?.slug === gslug) S.g.folder = n.dataset.folder || null;
      await refreshTree();
    } else if (e.dataTransfer.getData('x-photos') && n.dataset.gallery) {
      await movePhotos([...S.sel], n.dataset.gallery);
    }
  });
  renderFoot();
}

function renderFoot() {
  const gl = Object.values(S.tree.galleries);
  const bytes = gl.reduce((s, g) => s + (g.bytes || 0), 0) * 1.1;
  const pct = Math.min(100, (bytes / 10e9) * 100);
  $('#foot').innerHTML = `
    <div style="display:flex;justify-content:space-between"><span>Espaço usado</span><b style="color:var(--text)">${fmtBytes(bytes)}</b></div>
    <div class="meter"><i style="width:${pct}%"></i></div>
    <div>${bytes <= 10e9 ? `Grátis até 10 GB · faltam ${fmtBytes(10e9 - bytes)}` : `Custo estimado: ${costText(bytes)}/mês`}</div>`;
}
const costText = (bytes) => `${Math.max(0, ((bytes - 10e9) / 1e9) * 0.015).toFixed(2).replace('.', ',')} $`;

// ============ Painel inicial ============
function renderDashboard() {
  $('#info').classList.add('hidden');
  const gl = Object.values(S.tree.galleries);
  const photos = gl.reduce((s, g) => s + g.count, 0);
  const bytes = gl.reduce((s, g) => s + (g.bytes || 0), 0) * 1.1;
  const recent = [...gl].sort((a, b) => (b.updated || '').localeCompare(a.updated || '')).slice(0, 12);
  $('#main').innerHTML = `
    <div class="dash">
      ${S.tree.hasPublicDomain ? '' : `<div class="notice"><b>Falta um passo para o tráfego ilimitado:</b> as fotos estão a ser servidas pelo servidor (limite de 100 000 pedidos/dia no plano grátis). Liga um subdomínio ao bucket R2 e define <code>PUBLIC_BASE</code>, como explicado no LEIA-ME.</div>`}
      <div class="cards">
        <div class="card"><div class="v">${gl.length}</div><div class="k">Galerias</div></div>
        <div class="card"><div class="v">${photos.toLocaleString('pt-PT')}</div><div class="k">Fotografias</div></div>
        <div class="card"><div class="v">${fmtBytes(bytes)}</div><div class="k">Espaço usado</div></div>
        <div class="card"><div class="v">${bytes <= 10e9 ? 'Grátis' : costText(bytes)}</div><div class="k">Custo de armazenamento / mês</div></div>
      </div>
      <h2>Atividade recente</h2>
      ${recent.length ? `<div class="recent">${recent.map((g) => `
        <div class="rc" data-slug="${g.slug}">
          <div class="cv" style="${g.cover ? `background-image:url('${g.cover}')` : ''}">${g.cover ? '' : I.img}</div>
          <b>${esc(g.title)}</b><span class="muted" style="font-size:12px">${g.count} fotos · ${g.public ? 'Pública' : 'Cliente'}${g.hasPassword ? ' · 🔒' : ''}</span>
        </div>`).join('')}</div>`
      : `<div class="empty"><b>Bem-vindo!</b>Começa por criar uma galeria e arrastar as fotografias para lá.<br><br><button class="btn primary" id="first">${I.plus}Nova galeria</button></div>`}
    </div>`;
  $('#main').querySelectorAll('.rc').forEach((el) => { el.onclick = () => go(el.dataset.slug); });
  $('#first')?.addEventListener('click', () => newGalleryModal(null));
}

// ============ Galeria aberta ============
async function openGallery(slug) {
  await run(async () => {
    if (S.g?.slug !== slug) {
      S.sel.clear(); S.last = null; S.filter = 'all';
      $('#main').innerHTML = '<div class="dash muted">A abrir…</div>';
    }
    S.g = await api(`/api/admin/galleries/${encodeURIComponent(slug)}`);
    renderTree();
    renderMain();
  });
}
const visible = () => (S.filter === 'fav' ? S.g.photos.filter((p) => S.g.favorites.includes(p.name)) : S.g.photos);

function renderMain() {
  const g = S.g;
  const crumbs = folderPath(g.folder).map((f) => esc(f.name)).join(' › ');
  $('#main').innerHTML = `
    <div class="ghead">
      <div class="crumbs">${crumbs || 'Galerias'}</div>
      <div class="ghead-row">
        <h1 title="${esc(g.title)}">${esc(g.title)}</h1>
        <button class="btn primary" id="b-up">${I.upload}<span class="lbl-sm">Carregar</span></button>
        <button class="btn" id="b-share">${I.share}<span class="lbl-sm">Partilhar</span></button>
        <button class="btn" id="b-set">${I.gear}<span class="lbl-sm">Definições</span></button>
        <a class="btn icon" href="/g/${g.slug}" target="_blank" title="Ver como cliente">${I.eye}</a>
        <input type="file" id="files" multiple accept="image/jpeg,image/png,image/webp,.jpg,.jpeg,.png,.webp" hidden>
      </div>
      <div class="badges">${badgesHTML()}</div>
    </div>
    <div class="tools">
      <label style="display:flex;align-items:center;gap:8px;cursor:pointer"><input type="checkbox" id="all"> <span class="selcount" id="selc"></span></label>
      <span class="sep"></span>
      <button class="btn" data-bulk id="t-cover" title="Definir como capa">${I.star}<span class="lbl-sm">Capa</span></button>
      <button class="btn" data-bulk id="t-move" title="Mover para outra galeria">${I.move}<span class="lbl-sm">Mover</span></button>
      <button class="btn" data-bulk id="t-dl" title="Descarregar originais">${I.dl}<span class="lbl-sm">Descarregar</span></button>
      <button class="btn danger" data-bulk id="t-del" title="Apagar (Delete)">${I.trash}<span class="lbl-sm">Apagar</span></button>
      <span class="spacer"></span>
      <select id="t-filter" title="Mostrar">
        <option value="all">Todas as fotos</option>
        <option value="fav">♥ Favoritas do cliente (${g.favorites.length})</option>
      </select>
      <select id="t-sort" title="Ordenar">
        <option value="">Ordenar…</option>
        <option value="name">Nome (A → Z)</option>
        <option value="name-desc">Nome (Z → A)</option>
        <option value="added">Data de carregamento</option>
        <option value="reverse">Inverter ordem</option>
      </select>
      <span class="size" title="Tamanho das miniaturas">${I.img}<input type="range" id="t-size" min="90" max="340" value="${S.ts}"></span>
    </div>
    <div class="gwrap" id="gwrap"><div class="ogrid" id="ogrid"></div></div>`;

  document.documentElement.style.setProperty('--ts', S.ts + 'px');
  $('#t-filter').value = S.filter;
  $('#b-up').onclick = () => $('#files').click();
  $('#files').onchange = (e) => { addUploads([...e.target.files]); e.target.value = ''; };
  $('#b-share').onclick = () => shareModal();
  $('#b-set').onclick = () => settingsModal();
  $('#all').onchange = (e) => { S.sel = e.target.checked ? new Set(visible().map((p) => p.name)) : new Set(); updateSel(); };
  $('#t-cover').onclick = () => run(async () => {
    const p = S.g.photos.find((x) => x.name === [...S.sel][0]);
    await photosOp({ op: 'cover', name: p.name });
    toast(`Capa ${ORIENT[orient(p)]} atualizada`);
  });
  $('#t-move').onclick = () => moveModal();
  $('#t-dl').onclick = () => downloadSelected();
  $('#t-del').onclick = () => deleteSelected();
  $('#t-filter').onchange = (e) => { S.filter = e.target.value; S.sel.clear(); drawGrid(); };
  $('#t-sort').onchange = (e) => run(async () => {
    const v = e.target.value;
    e.target.value = '';
    if (!v) return;
    const list = [...S.g.photos];
    const cmp = (a, b) => a.name.localeCompare(b.name, undefined, { numeric: true });
    if (v === 'name') list.sort(cmp);
    if (v === 'name-desc') list.sort((a, b) => cmp(b, a));
    if (v === 'added') list.sort((a, b) => (a.added || '').localeCompare(b.added || ''));
    if (v === 'reverse') list.reverse();
    await photosOp({ op: 'order', names: list.map((p) => p.name) });
  });
  $('#t-size').oninput = (e) => {
    S.ts = +e.target.value;
    document.documentElement.style.setProperty('--ts', S.ts + 'px');
    store.set('thumbSize', S.ts);
  };
  setupGridEvents();
  drawGrid();
}

function badgesHTML() {
  const g = S.g;
  const bytes = g.photos.reduce((s, p) => s + (p.size || 0), 0);
  return `<span class="badge">${g.photos.length} fotos · ${fmtBytes(bytes)}</span>
        ${g.public ? '<span class="badge green">Pública · página inicial</span>' : '<span class="badge">Não listada</span>'}
        ${g.hasPassword ? '<span class="badge">🔒 Palavra-passe</span>' : '<span class="badge warn">Sem palavra-passe</span>'}
        ${g.allowDownload ? '<span class="badge">Downloads ativos</span>' : ''}
        ${g.expires ? `<span class="badge ${Date.parse(g.expires) < Date.now() ? 'warn' : ''}">Expira ${esc(fmtDate(g.expires))}</span>` : ''}
        ${g.favorites.length ? `<span class="badge" style="color:var(--heart)">♥ ${g.favorites.length} favoritas do cliente</span>` : ''}`;
}
const updateBadges = () => { const b = $('.badges'); if (b && S.g) b.innerHTML = badgesHTML(); };

// Capas: uma horizontal e uma vertical; o site usa a que encaixa melhor em cada sítio
const orient = (p) => ((p.w || 3) >= (p.h || 2) ? 'h' : 'v');
const ORIENT = { h: 'horizontal', v: 'vertical' };
const isCover = (p) => S.g.covers?.[orient(p)]?.name === p.name;
const coverTag = (p) => (isCover(p) ? `<span title="Capa ${ORIENT[orient(p)]}">Capa ${orient(p) === 'h' ? '▭' : '▯'}</span>` : '');

function tileHTML(p) {
  const fav = S.g.favorites.includes(p.name);
  return `<div class="ot ${S.sel.has(p.name) ? 'sel' : ''}" data-name="${esc(p.name)}" draggable="true">
    <div class="box"><img loading="lazy" src="${urls(S.g).thumb(p)}" alt=""></div>
    <span class="ck">✓</span>
    <span class="tags">${coverTag(p)}${fav ? '<span class="h">♥</span>' : ''}${p.caption ? '<span title="Tem legenda">Aa</span>' : ''}</span>
    <div class="fn">${esc(p.name)}</div></div>`;
}

function drawGrid() {
  const grid = $('#ogrid');
  const list = visible();
  const pending = uploads.filter((u) => u.slug === S.g.slug && !u.done && !u.error);
  if (!list.length && !pending.length) {
    grid.innerHTML = `<div class="empty" style="grid-column:1/-1"><b>${S.filter === 'fav' ? 'O cliente ainda não marcou favoritas' : 'Arrasta fotografias para aqui'}</b>${S.filter === 'fav' ? '' : 'ou usa o botão Carregar. JPG, PNG ou WebP.'}</div>`;
  } else {
    grid.innerHTML = list.map(tileHTML).join('') + pending.map(pendingHTML).join('');
  }
  updateSel();
}
const pendingHTML = (u) => `<div class="ot pending" data-up="${u.id}"><div class="box">${u.preview ? `<img src="${u.preview}" alt="">` : ''}</div><div class="bar"><i style="width:${u.pct}%"></i></div><div class="fn">${esc(u.name)}</div></div>`;

function updateSel() {
  if (!$('#ogrid')) return;
  const n = S.sel.size;
  $('#selc').textContent = n ? `${n} selecionada${n > 1 ? 's' : ''}` : 'Selecionar';
  $('#all').checked = n > 0 && n === visible().length;
  $('#all').indeterminate = n > 0 && n < visible().length;
  document.querySelectorAll('[data-bulk]').forEach((b) => { b.disabled = !n; });
  $('#t-cover').disabled = n !== 1;
  $('#t-dl').disabled = !n;
  document.querySelectorAll('#ogrid .ot[data-name]').forEach((t) => t.classList.toggle('sel', S.sel.has(t.dataset.name)));
  renderInfo();
}

function setupGridEvents() {
  const grid = $('#ogrid');
  const wrap = $('#gwrap');

  grid.addEventListener('click', (e) => {
    const t = e.target.closest('.ot[data-name]');
    if (!t) return;
    const list = visible().map((p) => p.name);
    const name = t.dataset.name;
    const idx = list.indexOf(name);
    if (e.shiftKey && S.last != null) {
      const a = Math.min(S.last, idx), b = Math.max(S.last, idx);
      for (let i = a; i <= b; i++) S.sel.add(list[i]);
    } else if (e.metaKey || e.ctrlKey || e.target.closest('.ck')) {
      S.sel.has(name) ? S.sel.delete(name) : S.sel.add(name);
      S.last = idx;
    } else {
      S.sel = new Set([name]);
      S.last = idx;
    }
    updateSel();
  });
  grid.addEventListener('dblclick', (e) => {
    const t = e.target.closest('.ot[data-name]');
    if (!t) return;
    const list = visible();
    lightbox(list, list.findIndex((p) => p.name === t.dataset.name), urls(S.g), { favs: new Set(S.g.favorites) });
  });
  wrap.addEventListener('click', (e) => { if (e.target === wrap || e.target === grid) { S.sel.clear(); updateSel(); } });

  // Reordenar arrastando
  let dragNames = null;
  grid.addEventListener('dragstart', (e) => {
    const t = e.target.closest('.ot[data-name]');
    if (!t) return;
    if (!S.sel.has(t.dataset.name)) { S.sel = new Set([t.dataset.name]); updateSel(); }
    dragNames = [...S.sel];
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('x-photos', '1');
    const n = dragNames.length;
    if (n > 1) {
      const ghost = document.createElement('div');
      ghost.textContent = `${n} fotografias`;
      ghost.style.cssText = 'position:absolute;top:-100px;padding:8px 14px;background:#4a9eff;color:#fff;border-radius:8px;font:600 13px Inter,sans-serif';
      document.body.append(ghost);
      e.dataTransfer.setDragImage(ghost, 0, 0);
      setTimeout(() => ghost.remove());
    }
    requestAnimationFrame(() => grid.querySelectorAll('.ot.sel').forEach((x) => x.classList.add('dragging')));
  });
  grid.addEventListener('dragend', () => {
    dragNames = null;
    grid.querySelectorAll('.dragging,.drop-before,.drop-after').forEach((x) => x.classList.remove('dragging', 'drop-before', 'drop-after'));
  });
  const clearMarks = () => grid.querySelectorAll('.drop-before,.drop-after').forEach((x) => x.classList.remove('drop-before', 'drop-after'));
  wrap.addEventListener('dragover', (e) => {
    if (e.dataTransfer.types.includes('Files')) { e.preventDefault(); wrap.classList.add('file-over'); return; }
    if (!dragNames || S.filter !== 'all') return;
    const t = e.target.closest('.ot[data-name]');
    e.preventDefault();
    clearMarks();
    if (!t) return;
    const r = t.getBoundingClientRect();
    t.classList.add(e.clientX < r.left + r.width / 2 ? 'drop-before' : 'drop-after');
  });
  wrap.addEventListener('dragleave', (e) => { if (!wrap.contains(e.relatedTarget)) { wrap.classList.remove('file-over'); clearMarks(); } });
  wrap.addEventListener('drop', (e) => {
    wrap.classList.remove('file-over');
    if (e.dataTransfer.files.length) { e.preventDefault(); addUploads([...e.dataTransfer.files]); return; }
    if (!dragNames) return;
    e.preventDefault();
    const t = grid.querySelector('.drop-before,.drop-after');
    clearMarks();
    if (!t) return;
    const moving = new Set(dragNames);
    const rest = S.g.photos.map((p) => p.name).filter((n) => !moving.has(n));
    let at = rest.indexOf(t.dataset.name);
    if (at === -1) return;
    if (t.classList.contains('drop-after')) at++;
    const order = [...rest.slice(0, at), ...S.g.photos.map((p) => p.name).filter((n) => moving.has(n)), ...rest.slice(at)];
    // atualização imediata no ecrã, gravação em segundo plano
    const byName = new Map(S.g.photos.map((p) => [p.name, p]));
    S.g.photos = order.map((n) => byName.get(n));
    drawGrid();
    run(() => photosOp({ op: 'order', names: order }, false));
  });
}

async function photosOp(body, redraw = true) {
  const res = await api(`/api/admin/galleries/${S.g.slug}/photos`, { method: 'POST', body: JSON.stringify(body) });
  const favorites = S.g.favorites.filter((n) => res.photos.some((p) => p.name === n));
  S.g = { ...res, favorites };
  for (const n of [...S.sel]) if (!res.photos.some((p) => p.name === n)) S.sel.delete(n);
  if (redraw) renderMain();
  refreshTree();
  return res;
}

// ============ Painel de informação ============
function renderInfo() {
  const el = $('#info');
  if (!S.g) return el.classList.add('hidden');
  el.classList.remove('hidden');
  const u = urls(S.g);
  const sel = S.g.photos.filter((p) => S.sel.has(p.name));
  if (sel.length === 1) {
    const p = sel[0];
    el.innerHTML = `
      <h3>Fotografia</h3>
      <div class="prev"><img src="${u.web(p)}" alt=""></div>
      <dl class="kv">
        <dt>Ficheiro</dt><dd title="${esc(p.name)}">${esc(p.name)}</dd>
        <dt>Dimensões</dt><dd>${p.w} × ${p.h}</dd>
        <dt>Tamanho</dt><dd>${fmtBytes(p.size)}</dd>
        <dt>Carregada</dt><dd>${esc(fmtDate(p.added))}</dd>
        <dt>Cliente</dt><dd>${S.g.favorites.includes(p.name) ? '<span style="color:var(--heart)">♥ Favorita</span>' : '—'}</dd>
      </dl>
      <div class="field"><label class="lbl">Legenda</label><textarea id="cap" rows="3" placeholder="Visível para quem vê a galeria">${esc(p.caption || '')}</textarea></div>
      <div class="stack">
        <button class="btn" id="i-cover" ${isCover(p) ? 'disabled' : ''}>${I.star}${isCover(p) ? `É a capa ${ORIENT[orient(p)]}` : `Definir como capa ${ORIENT[orient(p)]}`}</button>
        <button class="btn" id="i-hero">${I.img}Usar como imagem principal do site</button>
        <a class="btn" href="${u.original(p)}" target="_blank">${I.eye}Abrir original</a>
        <button class="btn danger" id="i-del">${I.trash}Apagar</button>
      </div>`;
    const cap = $('#cap');
    cap.onchange = () => run(async () => {
      await api(`/api/admin/galleries/${S.g.slug}/photos`, { method: 'POST', body: JSON.stringify({ op: 'caption', name: p.name, caption: cap.value }) });
      p.caption = cap.value;
      toast('Legenda guardada');
      const t = document.querySelector(`.ot[data-name="${CSS.escape(p.name)}"]`);
      if (t) t.outerHTML = tileHTML(p);
    });
    $('#i-cover').onclick = () => run(async () => { await photosOp({ op: 'cover', name: p.name }); toast(`Capa ${ORIENT[orient(p)]} atualizada`); });
    $('#i-hero').onclick = () => run(async () => {
      await api(`/api/admin/galleries/${S.g.slug}/photos`, { method: 'POST', body: JSON.stringify({ op: 'hero', name: p.name }) });
      toast('Imagem principal do site atualizada');
    });
    $('#i-del').onclick = deleteSelected;
  } else if (sel.length > 1) {
    el.innerHTML = `
      <h3>${sel.length} fotografias selecionadas</h3>
      <dl class="kv"><dt>Tamanho total</dt><dd>${fmtBytes(sel.reduce((s, p) => s + (p.size || 0), 0))}</dd>
      <dt>Favoritas</dt><dd>${sel.filter((p) => S.g.favorites.includes(p.name)).length}</dd></dl>
      <p class="muted" style="font-size:13px">Dica: arrasta as fotos selecionadas para outra posição, ou para uma galeria na barra lateral para as mover.</p>
      <div class="stack">
        <button class="btn" id="i-move">${I.move}Mover para…</button>
        <button class="btn" id="i-dl">${I.dl}Descarregar</button>
        <button class="btn danger" id="i-del">${I.trash}Apagar ${sel.length}</button>
      </div>`;
    $('#i-move').onclick = moveModal;
    $('#i-dl').onclick = downloadSelected;
    $('#i-del').onclick = deleteSelected;
  } else {
    const g = S.g;
    el.innerHTML = `
      <h3>Galeria</h3>
      <div class="covers2">${['h', 'v'].map((o) => `
        <figure class="cv-${o}">
          <div class="prev">${g.covers?.[o] ? `<img src="${u.thumb({ name: g.covers[o].name })}" alt="">` : `<span class="muted">Sem foto ${ORIENT[o]}</span>`}</div>
          <figcaption>Capa ${ORIENT[o]}</figcaption>
        </figure>`).join('')}</div>
      <p class="muted" style="font-size:12px;margin:-4px 0 14px">Para trocar, seleciona uma foto e carrega em Capa. Uma foto horizontal muda a capa horizontal, uma vertical muda a vertical.</p>
      <dl class="kv">
        <dt>Endereço</dt><dd>/g/${esc(g.slug)}</dd>
        <dt>Data</dt><dd>${esc(fmtDate(g.date)) || '—'}</dd>
        <dt>Fotografias</dt><dd>${g.photos.length}</dd>
        <dt>Favoritas</dt><dd>${g.favorites.length}</dd>
        <dt>Criada</dt><dd>${esc(fmtDate(g.created))}</dd>
      </dl>
      <div class="stack">
        <button class="btn primary" id="i-share">${I.share}Partilhar com o cliente</button>
        ${g.favorites.length ? `<button class="btn" id="i-favs">♥ Copiar nomes das favoritas</button>` : ''}
      </div>
      <p class="muted" style="font-size:12px;margin-top:16px">Clica numa foto para a selecionar. Shift+clique seleciona várias seguidas, Ctrl/⌘+clique escolhe soltas. Duplo clique abre em grande.</p>`;
    $('#i-share').onclick = () => shareModal();
    $('#i-favs')?.addEventListener('click', () => { navigator.clipboard.writeText(g.favorites.join(', ')); toast('Nomes copiados: cola no Lightroom para filtrar'); });
  }
}

// ============ Ações sobre fotos ============
function deleteSelected() {
  const names = [...S.sel];
  if (!names.length) return;
  if (!confirm(`Apagar ${names.length} fotografia${names.length > 1 ? 's' : ''}? Não dá para desfazer.`)) return;
  run(async () => {
    await photosOp({ op: 'delete', names });
    S.sel.clear();
    updateSel();
    toast('Apagadas');
  });
}
async function movePhotos(names, to) {
  const all = [...names];
  for (let i = 0; i < all.length; i += 50) {
    toast(`A mover… ${Math.min(i + 50, all.length)} de ${all.length}`);
    await photosOp({ op: 'move', names: all.slice(i, i + 50), to }, false);
  }
  S.sel.clear();
  renderMain();
  toast(`${all.length} movida${all.length > 1 ? 's' : ''} para ${S.tree.galleries[to]?.title || to}`);
}
function downloadSelected() {
  const u = urls(S.g);
  const list = S.g.photos.filter((p) => S.sel.has(p.name)).map((p) => ({ name: p.name, url: u.original(p) }));
  if (!list.length) return;
  const bar = document.createElement('div');
  bar.className = 'toast';
  document.body.append(bar);
  downloadMany(list, `${S.g.slug}.zip`, (t) => { bar.textContent = t; })
    .catch((e) => { bar.textContent = e.name === 'AbortError' ? 'Cancelado' : e.message; })
    .finally(() => setTimeout(() => bar.remove(), 3000));
}
function onKey(e) {
  if (!S.g || e.target.closest('input,textarea,select') || $('.modal-bg') || $('.lightbox')) return;
  if ((e.key === 'Delete' || e.key === 'Backspace') && S.sel.size) { e.preventDefault(); deleteSelected(); }
  else if ((e.ctrlKey || e.metaKey) && e.key === 'a') { e.preventDefault(); S.sel = new Set(visible().map((p) => p.name)); updateSel(); }
  else if (e.key === 'Escape') { S.sel.clear(); updateSel(); }
}

// ============ Janelas ============
function modal({ title, body, foot = '', wide = false, tabs = null }) {
  const bg = document.createElement('div');
  bg.className = 'modal-bg';
  bg.innerHTML = `<div class="modal ${wide ? 'wide' : ''}" role="dialog" aria-modal="true">
    <div class="modal-h"><h2>${title}</h2><button data-close title="Fechar">✕</button></div>
    ${tabs ? `<div class="tabs">${tabs.map((t, i) => `<button type="button" data-tab="${i}" class="${i ? '' : 'on'}">${t}</button>`).join('')}</div>` : ''}
    <div class="modal-b">${body}</div>
    ${foot ? `<div class="modal-f"><span class="error" data-err></span>${foot}</div>` : ''}</div>`;
  const close = () => { bg.remove(); document.removeEventListener('keydown', esc_); };
  const esc_ = (e) => { if (e.key === 'Escape') close(); };
  bg.addEventListener('mousedown', (e) => { if (e.target === bg) close(); });
  bg.querySelectorAll('[data-close]').forEach((b) => { b.onclick = close; });
  if (tabs) {
    const panes = bg.querySelectorAll('[data-pane]');
    const show = (i) => {
      bg.querySelectorAll('[data-tab]').forEach((b) => b.classList.toggle('on', +b.dataset.tab === i));
      panes.forEach((p) => p.classList.toggle('hidden', +p.dataset.pane !== i));
    };
    bg.querySelectorAll('[data-tab]').forEach((b) => { b.onclick = () => show(+b.dataset.tab); });
    show(0);
    bg.showTab = show;
  }
  document.addEventListener('keydown', esc_);
  document.body.append(bg);
  bg.close = close;
  bg.fail = (m) => { bg.querySelector('[data-err]').textContent = m; };
  return bg;
}

const folderOptions = (selected) => {
  const out = ['<option value="">— Sem pasta —</option>'];
  const walk = (parent, depth) => {
    for (const f of S.tree.folders.filter((x) => (x.parent || null) === parent).sort((a, b) => a.name.localeCompare(b.name))) {
      out.push(`<option value="${f.id}" ${f.id === selected ? 'selected' : ''}>${'  '.repeat(depth)}${depth ? '└ ' : ''}${esc(f.name)}</option>`);
      walk(f.id, depth + 1);
    }
  };
  walk(null, 0);
  return out.join('');
};

function newGalleryModal(folder) {
  const m = modal({
    title: 'Nova galeria',
    body: `<form id="ng">
      <div class="field"><label class="lbl">Título</label><input name="title" required placeholder="Casamento Ana & João" autofocus></div>
      <div class="row2">
        <div class="field"><label class="lbl">Endereço</label><input name="slug" required pattern="[a-z0-9-]+" placeholder="casamento-ana-joao"></div>
        <div class="field"><label class="lbl">Data</label><input name="date" type="date"></div>
      </div>
      <div class="field"><label class="lbl">Pasta</label><select name="folder">${folderOptions(folder)}</select></div>
      <label class="lbl">Tipo</label>
      <label class="opt"><input type="radio" name="kind" value="client" checked><span><b>Galeria de cliente</b><small>Privada, com palavra-passe e downloads. Para entregar trabalhos.</small></span></label>
      <label class="opt"><input type="radio" name="kind" value="public"><span><b>Portefólio</b><small>Aparece na página inicial do site, sem palavra-passe.</small></span></label>
    </form>`,
    foot: '<button class="btn" data-close>Cancelar</button><button class="btn primary" id="ng-ok">Criar galeria</button>',
  });
  const f = $('#ng', m);
  f.title.oninput = () => { if (!f.slug.dataset.touched) f.slug.value = slugify(f.title.value); };
  f.slug.oninput = () => { f.slug.dataset.touched = 1; };
  const submit = async (e) => {
    e?.preventDefault();
    if (!f.reportValidity()) return;
    const pub = f.kind.value === 'public';
    const pw = pub ? null : randomPassword();
    const body = { create: true, slug: f.slug.value, title: f.title.value, date: f.date.value, folder: f.folder.value || null, public: pub, allowDownload: !pub };
    if (pw) body.password = pw;
    try {
      await api('/api/admin/galleries', { method: 'POST', body: JSON.stringify(body) });
      if (pw) sessionStorage.setItem('pw_' + body.slug, pw);
      if (body.folder) { for (const x of folderPath(body.folder)) S.open.add(x.id); store.set('openFolders', [...S.open]); }
      m.close();
      await refreshTree();
      go(body.slug);
    } catch (er) { m.fail(er.message); }
  };
  f.onsubmit = submit;
  $('#ng-ok', m).onclick = submit;
}

function folderModal(folder = null) {
  const m = modal({
    title: folder ? 'Editar pasta' : 'Nova pasta',
    body: `<form id="nf">
      <div class="field"><label class="lbl">Nome</label><input name="name" required value="${esc(folder?.name || '')}" placeholder="Casamentos 2026" autofocus></div>
      <div class="field"><label class="lbl">Dentro de</label><select name="parent">${folderOptions(folder?.parent || null).replace(`value="${folder?.id}"`, `value="${folder?.id}" disabled`)}</select></div>
    </form>`,
    foot: `<button class="btn" data-close>Cancelar</button><button class="btn primary" id="nf-ok">${folder ? 'Guardar' : 'Criar pasta'}</button>`,
  });
  const f = $('#nf', m);
  const submit = async (e) => {
    e?.preventDefault();
    if (!f.reportValidity()) return;
    try {
      const r = await api('/api/admin/folders', { method: 'POST', body: JSON.stringify({ id: folder?.id, name: f.name.value, parent: f.parent.value || null }) });
      S.open.add(r.id);
      if (r.parent) S.open.add(r.parent);
      store.set('openFolders', [...S.open]);
      m.close();
      await refreshTree();
    } catch (er) { m.fail(er.message); }
  };
  f.onsubmit = submit;
  $('#nf-ok', m).onclick = submit;
}

function deleteFolder(f) {
  if (!confirm(`Apagar a pasta "${f.name}"? As galerias lá dentro não são apagadas, passam para a pasta de cima.`)) return;
  run(async () => { await api(`/api/admin/folders/${f.id}`, { method: 'DELETE' }); await refreshTree(); });
}

function settingsModal(tab = 0) {
  const g = S.g;
  const m = modal({
    title: 'Definições da galeria',
    wide: true,
    tabs: ['Geral', 'Acesso e privacidade', 'Cliente', 'Avançado'],
    body: `<form id="gs">
      <div data-pane="0">
        <div class="field"><label class="lbl">Título</label><input name="title" required value="${esc(g.title)}"></div>
        <div class="row2">
          <div class="field"><label class="lbl">Data do trabalho</label><input name="date" type="date" value="${esc(g.date || '')}"></div>
          <div class="field"><label class="lbl">Pasta</label><select name="folder">${folderOptions(g.folder)}</select></div>
        </div>
        <div class="field"><label class="lbl">Descrição / mensagem para o cliente</label><textarea name="description" rows="4" placeholder="Obrigado por me terem escolhido!">${esc(g.description || '')}</textarea></div>
      </div>
      <div data-pane="1">
        <label class="lbl">Visibilidade</label>
        <label class="opt"><input type="radio" name="vis" value="public" ${g.public ? 'checked' : ''}><span><b>Pública</b><small>Aparece na página inicial (portefólio).</small></span></label>
        <label class="opt"><input type="radio" name="vis" value="unlisted" ${g.public ? '' : 'checked'}><span><b>Não listada</b><small>Só entra quem tiver o link. Ideal para clientes.</small></span></label>
        <div class="field" style="margin-top:16px"><label class="lbl">Palavra-passe ${g.hasPassword ? '· definida (escreve uma nova para a mudar)' : '· nenhuma'}</label>
          <div class="share-box"><input name="password" autocomplete="off" placeholder="${g.hasPassword ? '••••••••' : 'Sem palavra-passe'}"><button type="button" class="btn" id="gen">Gerar</button></div></div>
        ${g.hasPassword ? '<label class="opt"><input type="checkbox" name="nopass"><span><b>Remover palavra-passe</b><small>Quem tiver o link entra sem palavra-passe.</small></span></label>' : ''}
        <div class="field" style="margin-top:12px"><label class="lbl">Disponível até (opcional)</label><input name="expires" type="date" value="${esc(g.expires || '')}" style="max-width:220px"></div>
      </div>
      <div data-pane="2">
        <label class="opt"><input type="checkbox" name="allowDownload" ${g.allowDownload ? 'checked' : ''}><span><b>Permitir descarregar originais</b><small>Botão "Descarregar todas" e download foto a foto.</small></span></label>
        <label class="opt"><input type="checkbox" name="favoritesOn" ${g.favoritesOn !== false ? 'checked' : ''}><span><b>Favoritas</b><small>O cliente marca as preferidas com ♥ e tu vês a seleção aqui.</small></span></label>
        <label class="opt"><input type="checkbox" name="protect" ${g.protect ? 'checked' : ''}><span><b>Proteção contra clique direito</b><small>Dificulta guardar as imagens sem autorização.</small></span></label>
      </div>
      <div data-pane="3">
        <dl class="kv"><dt>Endereço</dt><dd>/g/${esc(g.slug)}</dd><dt>Criada</dt><dd>${esc(fmtDate(g.created))}</dd></dl>
        <div class="opt" style="border-color:var(--danger);cursor:default;display:block">
          <b>Apagar galeria</b><small>Apaga a galeria e todas as fotografias guardadas. Não dá para desfazer.</small><br><br>
          <button type="button" class="btn danger" id="gdel">${I.trash}Apagar galeria</button>
        </div>
      </div>
    </form>`,
    foot: '<button class="btn" data-close>Cancelar</button><button class="btn primary" id="gs-ok">Guardar</button>',
  });
  m.showTab(tab);
  const f = $('#gs', m);
  $('#gen', m).onclick = () => { f.password.value = randomPassword(); };
  $('#gdel', m).onclick = () => run(async () => {
    if (prompt(`Para confirmar, escreve o endereço da galeria: ${g.slug}`) !== g.slug) return;
    await api('/api/admin/galleries/' + g.slug, { method: 'DELETE' });
    m.close();
    await refreshTree();
    go(null);
  });
  $('#gs-ok', m).onclick = async () => {
    if (!f.reportValidity()) return m.showTab(0);
    const body = {
      slug: g.slug, title: f.title.value, date: f.date.value, folder: f.folder.value || null, description: f.description.value,
      public: f.vis.value === 'public', expires: f.expires.value,
      allowDownload: f.allowDownload.checked, favoritesOn: f.favoritesOn.checked, protect: f.protect.checked,
    };
    const pw = f.password.value.trim();
    if (f.nopass?.checked) body.password = '';
    else if (pw) body.password = pw;
    try {
      await api('/api/admin/galleries', { method: 'POST', body: JSON.stringify(body) });
      if (f.nopass?.checked) sessionStorage.removeItem('pw_' + g.slug);
      else if (pw) sessionStorage.setItem('pw_' + g.slug, pw);
      m.close();
      await refreshTree();
      await openGallery(g.slug);
      toast('Definições guardadas');
      if (pw && !f.nopass?.checked) shareModal();
    } catch (er) { m.fail(er.message); }
  };
}

function shareModal() {
  const g = S.g;
  const link = `${location.origin}/g/${g.slug}`;
  const pw = sessionStorage.getItem('pw_' + g.slug);
  const message = () => {
    const p = $('#sh-pw')?.value || pw;
    return [
      'Olá! 😊',
      `As fotografias de "${g.title}" já estão disponíveis:`,
      link,
      p ? `Palavra-passe: ${p}` : g.hasPassword ? 'Palavra-passe: (a que te enviei)' : '',
      g.allowDownload ? 'Podes ver, marcar as tuas favoritas com ♥ e descarregar tudo em alta resolução.' : 'Podes ver e marcar as tuas favoritas com ♥.',
      g.expires ? `A galeria fica disponível até ${fmtDate(g.expires)}.` : '',
    ].filter(Boolean).join('\n');
  };
  const m = modal({
    title: 'Partilhar galeria',
    body: `
      <div class="field"><label class="lbl">Link</label><div class="share-box"><input readonly value="${esc(link)}"><button class="btn" data-copy="link">Copiar</button></div></div>
      ${g.hasPassword ? `<div class="field"><label class="lbl">Palavra-passe</label><div class="share-box">
        <input id="sh-pw" readonly value="${esc(pw || '')}" placeholder="Escondida por segurança">
        <button class="btn" id="sh-new">Gerar nova</button></div>
        ${pw ? '' : '<small class="muted">A palavra-passe fica guardada de forma encriptada e não é possível mostrá-la. Se não a tens, gera uma nova.</small>'}</div>`
      : '<p class="notice">Esta galeria não tem palavra-passe: qualquer pessoa com o link pode vê-la.</p>'}
      <div class="field"><label class="lbl">Mensagem pronta a enviar</label><textarea class="copyarea" id="sh-msg" rows="7"></textarea></div>
      <div style="display:flex;gap:8px;flex-wrap:wrap">
        <button class="btn primary" data-copy="msg">Copiar mensagem</button>
        <a class="btn" id="sh-wa" target="_blank" rel="noopener">WhatsApp</a>
        <a class="btn" id="sh-mail">Email</a>
      </div>`,
  });
  const refresh = () => {
    const t = message();
    $('#sh-msg', m).value = t;
    $('#sh-wa', m).href = 'https://wa.me/?text=' + encodeURIComponent(t);
    $('#sh-mail', m).href = `mailto:?subject=${encodeURIComponent('Fotografias: ' + g.title)}&body=${encodeURIComponent(t)}`;
  };
  refresh();
  m.querySelectorAll('[data-copy]').forEach((b) => {
    b.onclick = () => { navigator.clipboard.writeText(b.dataset.copy === 'link' ? link : $('#sh-msg', m).value); toast('Copiado'); };
  });
  $('#sh-new', m)?.addEventListener('click', () => run(async () => {
    if (!confirm('Gerar uma nova palavra-passe? A antiga deixa de funcionar.')) return;
    const np = randomPassword();
    await api('/api/admin/galleries', { method: 'POST', body: JSON.stringify({ slug: g.slug, password: np }) });
    sessionStorage.setItem('pw_' + g.slug, np);
    $('#sh-pw', m).value = np;
    refresh();
    toast('Nova palavra-passe criada');
  }));
}

function moveModal() {
  const names = [...S.sel];
  if (!names.length) return;
  const others = Object.values(S.tree.galleries).filter((x) => x.slug !== S.g.slug).sort((a, b) => a.title.localeCompare(b.title));
  if (!others.length) return alert('Cria primeiro outra galeria para onde mover as fotos.');
  const m = modal({
    title: `Mover ${names.length} fotografia${names.length > 1 ? 's' : ''}`,
    body: `<label class="lbl">Para a galeria</label><select id="mv">${others.map((g) => `<option value="${g.slug}">${esc(g.title)}</option>`).join('')}</select>`,
    foot: '<button class="btn" data-close>Cancelar</button><button class="btn primary" id="mv-ok">Mover</button>',
  });
  $('#mv-ok', m).onclick = () => { const to = $('#mv', m).value; m.close(); run(() => movePhotos(names, to)); };
}

async function siteModal() {
  const site = await api('/api/site');
  const m = modal({
    title: 'Informação do site',
    body: `<form id="sf">
      <div class="row2"><div class="field"><label class="lbl">Nome</label><input name="name"></div>
      <div class="field"><label class="lbl">Subtítulo</label><input name="tagline" placeholder="Capturing the good stuff, saving the vibes!"></div></div>
      <div class="field"><label class="lbl">Frase da página inicial</label><input name="heroLine" placeholder="Descobre as melhores fotografias do teu último evento!"></div>
      <p class="muted" style="font-size:12px;margin:-6px 0 14px">Imagem principal: abre uma galeria, seleciona uma foto e carrega em "Usar como imagem principal do site".${site.heroV ? ` <button type="button" class="btn" id="sf-hero" style="margin-top:8px">Repor a fotografia original</button>` : ""}</p>
      <div class="field"><label class="lbl">Sobre mim</label><textarea name="about" rows="5"></textarea></div>
      <div class="row2"><div class="field"><label class="lbl">Email</label><input name="email" type="email"></div>
      <div class="field"><label class="lbl">Telefone</label><input name="phone"></div></div>
      <div class="row2"><div class="field"><label class="lbl">Instagram</label><input name="instagram" placeholder="@utilizador"></div>
      <div class="field"><label class="lbl">Localização</label><input name="location" placeholder="Lisboa, Portugal"></div></div>
    </form>`,
    foot: '<button class="btn" data-close>Cancelar</button><button class="btn primary" id="sf-ok">Guardar</button>',
  });
  const f = $('#sf', m);
  for (const [k, v] of Object.entries(site)) if (f[k]) f[k].value = v;
  $('#sf-hero', m)?.addEventListener('click', async (e) => {
    try {
      await api('/api/admin/site', { method: 'DELETE' });
      e.target.remove();
      toast('Fotografia original reposta na página inicial');
    } catch (er) { m.fail(er.message); }
  });
  $('#sf-ok', m).onclick = async () => {
    try {
      await api('/api/admin/site', { method: 'PUT', body: JSON.stringify(Object.fromEntries(new FormData(f))) });
      m.close();
      toast('Site atualizado');
    } catch (er) { m.fail(er.message); }
  };
}

// ============ Carregamento de fotografias ============
const uploads = [];
let uploadId = 0;
let active = 0;
let commitChain = Promise.resolve();
const usedNames = {}; // por galeria, para evitar nomes repetidos

function cleanName(name) {
  const dot = name.lastIndexOf('.');
  const base = (dot > 0 ? name.slice(0, dot) : name).normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^A-Za-z0-9_-]+/g, '-').replace(/^[^A-Za-z0-9]+/, '').slice(0, 120) || 'foto';
  const ext = (dot > 0 ? name.slice(dot + 1) : 'jpg').toLowerCase().replace(/[^a-z0-9]/g, '') || 'jpg';
  return `${base}.${ext}`;
}

function addUploads(files) {
  if (!S.g) return;
  const ok = files.filter((f) => /^image\/(jpeg|png|webp)$/.test(f.type) || /\.(jpe?g|png|webp)$/i.test(f.name));
  const skipped = files.length - ok.length;
  if (skipped) toast(`${skipped} ficheiro(s) ignorado(s): só JPG, PNG ou WebP`);
  const slug = S.g.slug;
  const used = (usedNames[slug] ||= new Set(S.g.photos.map((p) => p.name)));
  for (const file of ok) {
    let name = cleanName(file.name);
    for (let i = 2; used.has(name); i++) name = cleanName(file.name).replace(/(\.[^.]+)$/, `-${i}$1`);
    used.add(name);
    uploads.push({ id: ++uploadId, file, name, slug, pct: 0, status: 'Em espera' });
  }
  if (S.g.slug === slug) drawGrid();
  renderQueue();
  pump();
}

function pump() {
  while (active < 3) {
    const u = uploads.find((x) => x.status === 'Em espera');
    if (!u) break;
    active++;
    u.status = 'A processar…';
    processUpload(u).finally(() => { active--; pump(); renderQueue(); });
  }
  window.onbeforeunload = uploads.some((u) => !u.done && !u.error) ? () => 'Ainda há fotografias a carregar.' : null;
}

async function resize(bmp, max) {
  const s = Math.min(1, max / Math.max(bmp.width, bmp.height));
  const c = document.createElement('canvas');
  c.width = Math.round(bmp.width * s);
  c.height = Math.round(bmp.height * s);
  const ctx = c.getContext('2d');
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(bmp, 0, 0, c.width, c.height);
  return new Promise((r) => c.toBlob(r, 'image/jpeg', 0.86));
}

function put(u, size, blob, onProgress) {
  return new Promise((resolve, reject) => {
    const x = new XMLHttpRequest();
    x.open('PUT', `/api/admin/upload/${u.slug}/${size}/${encodeURIComponent(u.name)}`);
    x.setRequestHeader('content-type', blob.type || 'application/octet-stream');
    if (onProgress) x.upload.onprogress = (e) => e.lengthComputable && onProgress(e.loaded / e.total);
    x.onload = () => {
      if (x.status < 300) return resolve();
      let m = `Erro ${x.status}`;
      try { m = JSON.parse(x.responseText).error || m; } catch {}
      reject(new Error(m));
    };
    x.onerror = () => reject(new Error('Sem ligação'));
    x.send(blob);
  });
}

function setProgress(u, pct, status) {
  u.pct = pct;
  if (status) u.status = status;
  const bar = document.querySelector(`.ot[data-up="${u.id}"] .bar i`);
  if (bar) bar.style.width = pct + '%';
  const row = document.querySelector(`.uq[data-id="${u.id}"]`);
  if (row) { row.querySelector('.b i').style.width = pct + '%'; row.querySelector('.s').textContent = u.status; }
  updateQueueHead();
}

async function processUpload(u) {
  try {
    if (u.file.size > 95 * 1024 * 1024) throw new Error('maior que 95 MB');
    const bmp = await createImageBitmap(u.file, { imageOrientation: 'from-image' });
    const web = await resize(bmp, 2048);
    const thumb = await resize(bmp, 800);
    const w = bmp.width, h = bmp.height;
    bmp.close();
    u.preview = URL.createObjectURL(thumb);
    const pt = document.querySelector(`.ot[data-up="${u.id}"] .box`);
    if (pt) pt.innerHTML = `<img src="${u.preview}" alt="">`;
    setProgress(u, 3, 'A enviar…');
    await put(u, 'thumb', thumb);
    await put(u, 'web', web);
    await put(u, 'original', u.file, (r) => setProgress(u, 5 + Math.round(r * 90)));
    setProgress(u, 97, 'A registar…');
    await commit(u, { name: u.name, w, h, size: u.file.size });
    u.done = true;
    setProgress(u, 100, '✓');
  } catch (e) {
    u.error = e.message;
    setProgress(u, 0, '✕ ' + e.message);
    document.querySelector(`.ot[data-up="${u.id}"]`)?.remove();
  }
}

// As gravações são feitas uma de cada vez para não se sobreporem
function commit(u, photo) {
  const p = commitChain.then(async () => {
    const res = await api(`/api/admin/galleries/${u.slug}/photos`, { method: 'POST', body: JSON.stringify({ op: 'add', photos: [photo] }) });
    if (S.g?.slug === u.slug) {
      S.g = { ...res, favorites: S.g.favorites };
      const tile = document.querySelector(`.ot[data-up="${u.id}"]`);
      const p = res.photos.find((x) => x.name === u.name);
      if (tile && p) tile.outerHTML = tileHTML(p);
      updateBadges();
    }
  });
  commitChain = p.catch(() => {});
  return p;
}

function renderQueue() {
  let q = $('.upq');
  if (!uploads.length) return q?.remove();
  if (!q) {
    q = document.createElement('div');
    q.className = 'upq';
    q.innerHTML = '<div class="upq-head"><span></span><button data-min title="Minimizar">▁</button><button data-x title="Fechar">✕</button></div><div class="upq-total"><i></i></div><div class="upq-list"></div>';
    q.querySelector('[data-min]').onclick = () => q.classList.toggle('min');
    q.querySelector('[data-x]').onclick = () => {
      if (uploads.some((u) => !u.done && !u.error) && !confirm('Cancelar os carregamentos em espera?')) return;
      for (const u of uploads) if (u.status === 'Em espera') { u.error = 'cancelado'; }
      uploads.splice(0, uploads.length, ...uploads.filter((u) => !u.done && !u.error));
      renderQueue();
      if (S.g) drawGrid();
    };
    document.body.append(q);
  }
  const list = q.querySelector('.upq-list');
  list.innerHTML = uploads.slice(-200).reverse().map((u) => `
    <div class="uq" data-id="${u.id}"><span class="n" title="${esc(u.name)}">${esc(u.name)} <span class="muted">· ${esc(S.tree.galleries[u.slug]?.title || u.slug)}</span></span>
    <span class="s ${u.done ? 'ok' : u.error ? 'bad' : ''}">${esc(u.status)}</span><div class="b"><i style="width:${u.pct}%"></i></div></div>`).join('');
  updateQueueHead();
}
function updateQueueHead() {
  const q = $('.upq');
  if (!q) return;
  const done = uploads.filter((u) => u.done).length;
  const bad = uploads.filter((u) => u.error).length;
  const total = uploads.length;
  const left = total - done - bad;
  q.querySelector('.upq-head span').textContent = left
    ? `A carregar ${done + bad + 1} de ${total}`
    : `✓ ${done} carregada${done === 1 ? '' : 's'}${bad ? ` · ${bad} com erro` : ''}`;
  const pct = total ? uploads.reduce((s, u) => s + (u.done ? 100 : u.error ? 100 : u.pct), 0) / total : 0;
  q.querySelector('.upq-total i').style.width = pct + '%';
  if (!left) { window.onbeforeunload = null; refreshTree(); }
}

boot();
