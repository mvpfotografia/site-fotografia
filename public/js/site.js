// Cabeçalho e rodapé comuns às páginas públicas
import { api, esc } from '/js/common.js';

const MENU = '<svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 6h18M3 12h18M3 18h18"/></svg>';

export async function initSite(active, { overlay = false } = {}) {
  const site = await api('/api/site').catch(() => ({ name: 'MVP Fotografia' }));
  const header = document.createElement('header');
  header.className = 'site-header' + (overlay ? ' over' : '');
  const links = [['inicio', '/', 'Início'], ['fotos', '/fotos', 'Fotos'], ['sobre', '/sobre', 'Sobre'], ['contacto', '/sobre#contacto', 'Contacto']];
  header.innerHTML = `<div class="bar">
    <a class="logo" href="/"><img src="/img/logo-mvp.png" alt="${esc(site.name)}" width="600" height="206"></a>
    <button class="menu-toggle" aria-label="Menu">${MENU}</button>
    <nav class="nav">${links.map(([k, h, t]) => `<a href="${h}" class="${k === active ? 'on' : ''}">${t}</a>`).join('')}</nav>
  </div>`;
  header.querySelector('.menu-toggle').onclick = () => header.querySelector('.nav').classList.toggle('open');
  document.body.prepend(header);
  document.querySelectorAll('[data-site-foot]').forEach((f) => {
    f.textContent = footLine(site);
  });
  return site;
}

export const footLine = (site) => [site.location, `${site.name} © ${new Date().getFullYear()}`].filter(Boolean).join(' // ');

// Carrega a imagem com transição suave
export function fadeImg(img) {
  if (img.complete && img.naturalWidth) img.classList.add('loaded');
  else img.onload = () => img.classList.add('loaded');
}
