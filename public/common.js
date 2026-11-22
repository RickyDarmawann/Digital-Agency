// Helper bersama (dipakai halaman publik & admin)
const $ = (id) => document.getElementById(id);

// Buat elemen DOM dengan aman (teks selalu lewat textContent, anti-XSS)
function h(tag, props = {}, ...kids) {
  const e = document.createElement(tag);
  for (const [k, v] of Object.entries(props)) {
    if (k === 'class') e.className = v;
    else if (k.startsWith('on')) e[k] = v;
    else e.setAttribute(k, v);
  }
  kids.flat().filter((k) => k != null && k !== false).forEach((k) => e.append(k));
  return e;
}

async function api(url, method = 'GET', body) {
  const res = await fetch(url, {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || 'Terjadi kesalahan');
  return data;
}

const rupiah = (n) =>
  new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(Number(n) || 0);
const fmtDate = (d) => new Date(d).toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' });

// Tema gelap / terang
function applyTheme(t) { document.documentElement.setAttribute('data-theme', t); }
(function initTheme() {
  let t = 'light';
  try { t = localStorage.getItem('theme') || 'light'; } catch {}
  applyTheme(t);
})();
function toggleTheme() {
  const t = document.documentElement.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
  applyTheme(t);
  try { localStorage.setItem('theme', t); } catch {}
}
