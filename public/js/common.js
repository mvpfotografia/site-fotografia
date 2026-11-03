// Código partilhado entre páginas
export async function api(path, opts = {}) {
  const res = await fetch(path, {
    ...opts,
    headers: opts.body && typeof opts.body === 'string' ? { 'content-type': 'application/json', ...opts.headers } : opts.headers,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const e = new Error(data.error || `Erro ${res.status}`);
    e.status = res.status;
    throw e;
  }
  return data;
}

export const esc = (s) =>
  String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

export function fmtDate(d) {
  if (!d) return '';
  return new Date(`${d.slice(0, 10)}T12:00:00`).toLocaleDateString('pt-PT', { day: 'numeric', month: 'long', year: 'numeric' });
}
export function fmtBytes(b) {
  if (!b) return '0 MB';
  const n = (v, d) => v.toLocaleString('pt-PT', { minimumFractionDigits: d, maximumFractionDigits: d });
  if (b < 1e9) return `${n(b / 1e6, b < 1e7 ? 1 : 0)} MB`;
  return `${n(b / 1e9, b < 1e10 ? 2 : 1)} GB`;
}

// URLs das fotos: base = endereço secreto da galeria
export const urls = (g) => ({
  thumb: (p) => `${g.base}/thumb/${encodeURIComponent(p.name)}`,
  web: (p) => `${g.base}/web/${encodeURIComponent(p.name)}`,
  original: (p) => (g.obase ? `${g.obase}/${encodeURIComponent(p.name)}` : null),
});

export const HEART = '<svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12 21s-7.5-4.6-10-9.2C.3 8.4 2.2 4 6.3 4c2.3 0 3.9 1.3 5.7 3.3C13.8 5.3 15.4 4 17.7 4 21.8 4 23.7 8.4 22 11.8 19.5 16.4 12 21 12 21z"/></svg>';

// Grelha "justificada": cada linha tem a mesma altura e ocupa toda a largura
export function renderGrid(el, photos, u, { onOpen, favs, onFav } = {}) {
  el.innerHTML = '';
  const frag = document.createDocumentFragment();
  photos.forEach((p, i) => {
    const r = p.w / p.h || 1.5;
    const a = document.createElement('a');
    a.className = 'tile';
    a.href = u.web(p);
    a.dataset.name = p.name;
    a.style.flexGrow = r;
    a.style.flexBasis = `calc(${r} * var(--row-h))`;
    a.style.aspectRatio = `${r}`;
    const img = new Image();
    img.loading = 'lazy';
    img.decoding = 'async';
    img.alt = p.caption || p.name;
    img.onload = () => img.classList.add('loaded');
    img.src = u.thumb(p);
    a.append(img);
    a.addEventListener('click', (e) => {
      if (e.target.closest('button')) return;
      e.preventDefault();
      onOpen?.(i);
    });
    if (onFav) {
      const b = document.createElement('button');
      b.className = 'fav' + (favs.has(p.name) ? ' on' : '');
      b.innerHTML = HEART;
      b.title = 'Favorita';
      b.setAttribute('aria-label', 'Marcar como favorita');
      b.onclick = (e) => { e.preventDefault(); onFav(p.name); };
      a.append(b);
    }
    frag.append(a);
  });
  el.append(frag);
}

// Visualizador em ecrã inteiro com teclado e gestos
export function lightbox(photos, start, u, { favs, onFav, allowDownload } = {}) {
  let i = start;
  const box = document.createElement('div');
  box.className = 'lightbox';
  box.innerHTML = `
    <div class="lb-top"><span class="lb-count"></span>
      <div class="lb-actions">
        ${onFav ? `<button class="lb-btn lb-fav" title="Favorita">${HEART}</button>` : ''}
        ${allowDownload ? '<a class="lb-btn lb-dl" title="Descarregar original">⤓</a>' : ''}
        <button class="lb-btn lb-close" title="Fechar (Esc)">✕</button>
      </div></div>
    <button class="lb-btn lb-prev" title="Anterior">‹</button>
    <figure class="lb-fig"><img alt=""><figcaption class="lb-cap"></figcaption></figure>
    <button class="lb-btn lb-next" title="Seguinte">›</button>`;
  const img = box.querySelector('img');
  const show = () => {
    const p = photos[i];
    img.src = u.web(p);
    img.alt = p.caption || p.name;
    box.querySelector('.lb-cap').textContent = p.caption || '';
    box.querySelector('.lb-count').textContent = `${i + 1} / ${photos.length}`;
    box.querySelector('.lb-fav')?.classList.toggle('on', favs.has(p.name));
    const dl = box.querySelector('.lb-dl');
    if (dl) { dl.href = u.original(p) + '?dl=1'; dl.download = p.name; }
    for (const j of [i - 1, i + 1]) if (photos[j]) new Image().src = u.web(photos[j]);
  };
  const go = (d) => { i = (i + d + photos.length) % photos.length; show(); };
  const close = () => { box.remove(); document.removeEventListener('keydown', key); document.body.style.overflow = ''; };
  const key = (e) => {
    if (e.key === 'Escape') close();
    else if (e.key === 'ArrowLeft') go(-1);
    else if (e.key === 'ArrowRight') go(1);
  };
  box.querySelector('.lb-prev').onclick = () => go(-1);
  box.querySelector('.lb-next').onclick = () => go(1);
  box.querySelector('.lb-close').onclick = close;
  box.addEventListener('click', (e) => { if (e.target === box || e.target.classList.contains('lb-fig')) close(); });
  const fb = box.querySelector('.lb-fav');
  if (fb) fb.onclick = () => { onFav(photos[i].name); fb.classList.toggle('on', favs.has(photos[i].name)); };
  let x0 = null;
  box.addEventListener('touchstart', (e) => { x0 = e.touches[0].clientX; }, { passive: true });
  box.addEventListener('touchend', (e) => {
    if (x0 === null) return;
    const dx = e.changedTouches[0].clientX - x0;
    if (Math.abs(dx) > 50) go(dx < 0 ? 1 : -1);
    x0 = null;
  });
  document.addEventListener('keydown', key);
  document.body.style.overflow = 'hidden';
  document.body.append(box);
  show();
}

// Descarregar várias fotos: ZIP direto para o disco (Chrome/Edge) ou uma a uma
export async function downloadMany(list, zipName, say) {
  // list: [{ name, url }]
  if ('showSaveFilePicker' in window) {
    const handle = await showSaveFilePicker({ suggestedName: zipName, types: [{ description: 'Arquivo ZIP', accept: { 'application/zip': ['.zip'] } }] });
    const { downloadZip } = await import('/js/vendor/client-zip.js');
    async function* files() {
      for (const [i, f] of list.entries()) {
        say(`A descarregar ${i + 1} de ${list.length}… não feche esta página`);
        const res = await fetch(f.url);
        if (!res.ok) throw new Error('Falha ao descarregar ' + f.name);
        yield { name: f.name, input: res };
      }
    }
    await downloadZip(files()).body.pipeTo(await handle.createWritable());
    say('✓ Concluído');
  } else {
    for (const [i, f] of list.entries()) {
      say(`A descarregar ${i + 1} de ${list.length}…`);
      const a = document.createElement('a');
      a.href = f.url + '?dl=1';
      a.download = f.name;
      document.body.append(a);
      a.click();
      a.remove();
      await new Promise((r) => setTimeout(r, 900));
    }
    say('✓ Concluído (se o browser pedir, permita várias transferências)');
  }
}
