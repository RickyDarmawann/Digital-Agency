let categories = [], services = [], projects = [];
let svcFilter = 0, prjFilter = 0;

const initials = (n) => n.split(' ').filter(Boolean).slice(0, 2).map((w) => w[0]).join('').toUpperCase();
const stars = (r) => '★'.repeat(r) + '☆'.repeat(5 - r);

function countUp(el, target, decimals = 0) {
  const start = performance.now(), dur = 900;
  (function tick(now) {
    const p = Math.min((now - start) / dur, 1);
    el.textContent = (target * p).toFixed(decimals);
    if (p < 1) requestAnimationFrame(tick);
  })(start);
}

function renderPills(box, current, onPick) {
  box.innerHTML = '';
  [{ id: 0, nama: 'Semua' }, ...categories].forEach((c) =>
    box.append(h('button', { class: 'pill' + (c.id === current ? ' active' : ''), type: 'button', onclick: () => onPick(c.id) }, c.nama)));
}

function renderServices() {
  renderPills($('svcPills'), svcFilter, (id) => { svcFilter = id; renderServices(); });
  const list = services.filter((s) => !svcFilter || s.kategori_id === svcFilter);
  $('svcGrid').replaceChildren(...list.map((s) =>
    h('article', { class: 'card' },
      h('div', { class: 'icon' }, s.ikon || '💼'),
      h('span', { class: 'badge' }, s.nama_kategori),
      h('h3', {}, s.judul),
      h('p', { class: 'muted' }, s.deskripsi),
      h('p', { class: 'price' }, 'Mulai dari ', h('strong', {}, rupiah(s.harga_mulai))),
      h('button', { class: 'btn btn-sm', type: 'button', onclick: () => chooseService(s.id) }, 'Pesan layanan ini'))));
}

function renderProjects() {
  renderPills($('prjPills'), prjFilter, (id) => { prjFilter = id; renderProjects(); });
  const list = projects.filter((p) => !prjFilter || p.kategori_id === prjFilter);
  $('prjGrid').replaceChildren(...list.map((p) =>
    h('article', { class: 'card project' },
      h('div', { class: 'cover' }, p.ikon || '🚀'),
      h('span', { class: 'badge' }, p.judul_layanan + ' • ' + (p.tahun || '')),
      h('h3', {}, p.judul),
      h('p', { class: 'muted' }, p.deskripsi || ''),
      h('p', { class: 'small' }, h('strong', {}, 'Klien: '), p.perusahaan),
      p.tim ? h('p', { class: 'small' }, h('strong', {}, 'Tim: '), p.tim) : null)));
}

function chooseService(id) {
  $('pilihLayanan').value = String(id);
  $('kontak').scrollIntoView({ behavior: 'smooth' });
  $('judul').focus({ preventScroll: true });
}

async function loadAll() {
  try {
    const [stats, cats, svc, prj, team, testi, faqs] = await Promise.all([
      api('/api/statistik'), api('/api/kategori'), api('/api/layanan'), api('/api/proyek'),
      api('/api/tim'), api('/api/testimoni'), api('/api/faq'),
    ]);
    categories = cats; services = svc; projects = prj;

    countUp($('stAhli'), stats.ahli); countUp($('stKlien'), stats.klien);
    countUp($('stProyek'), stats.proyek); countUp($('stRating'), stats.rating, 1);

    renderServices(); renderProjects();
    svc.forEach((s) => $('pilihLayanan').append(h('option', { value: s.id }, s.judul)));

    $('teamGrid').replaceChildren(...team.map((m) =>
      h('article', { class: 'card center' },
        h('div', { class: 'avatar' }, initials(m.nama)),
        h('h3', {}, m.nama), h('span', { class: 'badge' }, m.jabatan), h('p', { class: 'muted' }, m.bio || ''))));

    $('testiGrid').replaceChildren(...testi.map((t) =>
      h('article', { class: 'card' },
        h('div', { class: 'stars' }, stars(t.rating)),
        h('p', {}, '“' + t.komentar + '”'),
        h('p', { class: 'small' }, h('strong', {}, t.nama_klien), ' — ' + t.perusahaan))));

    $('faqList').replaceChildren(...faqs.map((f) =>
      h('details', { class: 'faq' }, h('summary', {}, f.pertanyaan), h('p', { class: 'muted' }, f.jawaban))));
  } catch {
    $('svcGrid').replaceChildren(h('p', { class: 'muted' }, 'Gagal memuat data. Pastikan MySQL Laragon menyala.'));
  }
}

// ---------- Form kontak ----------
function showAlert(type, text) { const a = $('formAlert'); a.className = 'alert ' + type; a.textContent = text; }

$('contactForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const form = e.target, btn = form.querySelector('button');
  btn.disabled = true;
  try {
    const data = await api('/api/pesan', 'POST', Object.fromEntries(new FormData(form)));
    showAlert('success', `Pesan terkirim! Kode Anda: ${data.kode}. Simpan kode ini untuk cek status.`);
    $('tKode').value = data.kode; $('tEmail').value = form.email.value;
    form.reset();
  } catch (err) { showAlert('error', err.message); }
  btn.disabled = false;
});

// ---------- Cek status ----------
$('trackForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const box = $('trackResult');
  try {
    const r = await api(`/api/pesan/status?kode=${encodeURIComponent($('tKode').value)}&email=${encodeURIComponent($('tEmail').value)}`);
    box.replaceChildren(h('div', { class: 'alert success' },
      h('strong', {}, r.kode), ' — ', r.judul, h('br'),
      'Layanan: ' + (r.judul_layanan || 'Konsultasi umum'), h('br'),
      'Dikirim: ' + fmtDate(r.dibuat_pada), h('br'),
      'Status: ', h('span', { class: 'status s-' + r.status.toLowerCase() }, r.status)));
  } catch (err) { box.replaceChildren(h('div', { class: 'alert error' }, err.message)); }
});

// ---------- Navigasi & tema ----------
$('themeBtn').onclick = toggleTheme;
$('menuBtn').onclick = () => $('nav').classList.toggle('open');
$('nav').addEventListener('click', (e) => { if (e.target.tagName === 'A') $('nav').classList.remove('open'); });

loadAll();
