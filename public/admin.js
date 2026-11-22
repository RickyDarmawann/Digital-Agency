// Konfigurasi tiap resource CRUD: kolom tabel + field form
const R = {
  layanan: { label: 'Layanan',
    cols: [['ikon', 'Ikon'], ['judul', 'Judul'], ['nama_kategori', 'Kategori'], ['harga_mulai', 'Harga mulai', 'money'], ['aktif', 'Aktif', 'bool']],
    fields: [
      { n: 'kategori_id', l: 'Kategori', t: 'select', ref: 'kategori', lab: 'nama', req: 1 },
      { n: 'judul', l: 'Judul', req: 1 }, { n: 'ikon', l: 'Ikon (emoji)' },
      { n: 'harga_mulai', l: 'Harga mulai (Rp)', t: 'number' },
      { n: 'deskripsi', l: 'Deskripsi', t: 'textarea', req: 1 },
      { n: 'aktif', l: 'Tampilkan di website', t: 'checkbox' }] },
  kategori: { label: 'Kategori',
    cols: [['nama', 'Nama'], ['deskripsi', 'Deskripsi']],
    fields: [{ n: 'nama', l: 'Nama kategori', req: 1 }, { n: 'deskripsi', l: 'Deskripsi' }] },
  proyek: { label: 'Portofolio',
    cols: [['judul', 'Proyek'], ['judul_layanan', 'Layanan'], ['perusahaan_klien', 'Klien'], ['tahun', 'Tahun']],
    fields: [
      { n: 'layanan_id', l: 'Layanan', t: 'select', ref: 'layanan', lab: 'judul', req: 1 },
      { n: 'klien_id', l: 'Klien', t: 'select', ref: 'klien', lab: 'perusahaan', req: 1 },
      { n: 'judul', l: 'Judul proyek', req: 1 }, { n: 'tahun', l: 'Tahun', t: 'number' },
      { n: 'deskripsi', l: 'Deskripsi', t: 'textarea' }] },
  klien: { label: 'Klien',
    cols: [['nama', 'Kontak'], ['perusahaan', 'Perusahaan'], ['industri', 'Industri']],
    fields: [{ n: 'nama', l: 'Nama kontak', req: 1 }, { n: 'perusahaan', l: 'Perusahaan', req: 1 }, { n: 'industri', l: 'Industri' }] },
  testimoni: { label: 'Testimoni',
    cols: [['perusahaan_klien', 'Klien'], ['judul_proyek', 'Proyek'], ['rating', 'Rating'], ['komentar', 'Komentar']],
    fields: [
      { n: 'klien_id', l: 'Klien', t: 'select', ref: 'klien', lab: 'perusahaan', req: 1 },
      { n: 'proyek_id', l: 'Proyek (opsional)', t: 'select', ref: 'proyek', lab: 'judul' },
      { n: 'rating', l: 'Rating (1-5)', t: 'number', req: 1, min: 1, max: 5 },
      { n: 'komentar', l: 'Komentar', t: 'textarea', req: 1 }] },
  tim: { label: 'Tim',
    cols: [['nama', 'Nama'], ['jabatan', 'Jabatan'], ['bio', 'Bio']],
    fields: [{ n: 'nama', l: 'Nama', req: 1 }, { n: 'jabatan', l: 'Jabatan', req: 1 }, { n: 'bio', l: 'Bio', t: 'textarea' }] },
  faq: { label: 'FAQ',
    cols: [['urutan', 'Urutan'], ['pertanyaan', 'Pertanyaan']],
    fields: [{ n: 'pertanyaan', l: 'Pertanyaan', req: 1 }, { n: 'jawaban', l: 'Jawaban', t: 'textarea', req: 1 }, { n: 'urutan', l: 'Urutan', t: 'number' }] },
};
const TABS = { dashboard: 'Dashboard', pesan: 'Pesan Masuk', ...Object.fromEntries(Object.entries(R).map(([k, v]) => [k, v.label])) };
let current = 'dashboard', needSetup = false;

// ---------- Login / setup ----------
async function init() {
  const st = await api('/api/admin/status');
  needSetup = st.needSetup;
  if (st.loggedIn) { $('authView').classList.add('hidden'); $('dashView').classList.remove('hidden'); return show(current); }
  $('dashView').classList.add('hidden'); $('authView').classList.remove('hidden');
  $('authTitle').textContent = needSetup ? 'Buat Akun Admin' : 'Login Admin';
  $('authBtn').textContent = needSetup ? 'Buat Akun' : 'Masuk';
}

$('authForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const data = Object.fromEntries(new FormData(e.target));
  try {
    if (needSetup) await api('/api/admin/setup', 'POST', data);
    await api('/api/admin/login', 'POST', data);
    e.target.reset(); $('authAlert').classList.add('hidden'); init();
  } catch (err) { $('authAlert').textContent = err.message; $('authAlert').classList.remove('hidden'); }
});
$('logoutBtn').onclick = async () => { await api('/api/admin/logout', 'POST'); init(); };
$('themeBtn').onclick = toggleTheme;

// ---------- Navigasi ----------
function renderSidebar() {
  $('sidebar').replaceChildren(...Object.entries(TABS).map(([k, label]) =>
    h('button', { class: 'side-btn' + (k === current ? ' active' : ''), type: 'button', onclick: () => show(k) }, label)));
}
async function show(tab) {
  current = tab; renderSidebar();
  const box = $('content'); box.replaceChildren();
  try {
    if (tab === 'dashboard') await dashboard(box);
    else if (tab === 'pesan') await pesanMasuk(box);
    else await crud(box, tab);
  } catch (err) { box.replaceChildren(h('div', { class: 'alert error' }, err.message)); }
}

const table = (head, rows) => h('div', { class: 'table-wrap' }, h('table', {},
  h('thead', {}, h('tr', {}, head.map((t) => h('th', {}, t)))), h('tbody', {}, rows)));

// ---------- Dashboard ----------
function bars(title, rows) {
  const max = Math.max(...rows.map((r) => r.total), 1);
  return h('div', { class: 'card' }, h('h3', {}, title), rows.map((r) =>
    h('div', { class: 'bar-row' }, h('span', {}, r.name),
      h('div', { class: 'bar' }, h('i', { style: `width:${(r.total / max) * 100}%` })), h('b', {}, String(r.total)))));
}
async function dashboard(box) {
  const d = await api('/api/admin/dashboard');
  const stat = (n, l) => h('div', { class: 'card stat' }, h('strong', {}, String(n)), h('span', {}, l));
  box.replaceChildren(h('h2', {}, 'Dashboard'),
    h('div', { class: 'grid g4' }, stat(d.total.pesan, 'Total Pesan'), stat(d.total.proyek, 'Proyek'),
      stat(d.total.klien, 'Klien'), stat(d.total.layanan, 'Layanan')),
    h('div', { class: 'grid g2' }, bars('Pesan per Status', d.perStatus), bars('Layanan Paling Diminati', d.perLayanan)));
}

// ---------- Pesan masuk ----------
async function pesanMasuk(box) {
  const statuses = await api('/api/admin/daftar-status');
  const filter = h('select', { onchange: () => load() },
    h('option', { value: '' }, 'Semua status'), statuses.map((s) => h('option', { value: s.id }, s.nama)));
  const holder = h('div');
  box.replaceChildren(
    h('div', { class: 'bar-head' }, h('h2', {}, 'Pesan Masuk'),
      h('div', { class: 'btn-row' }, filter, h('a', { class: 'btn btn-sm', href: '/api/admin/pesan/export' }, '⬇ Export CSV'))),
    holder);

  async function load() {
    const rows = await api('/api/admin/pesan' + (filter.value ? '?status_id=' + filter.value : ''));
    holder.replaceChildren(table(['Kode', 'Tanggal', 'Pengirim', 'Layanan', 'Pesan', 'Status', 'Aksi'],
      rows.length ? rows.map((m) => {
        const sel = h('select', { onchange: async () => { try { await api('/api/admin/pesan/' + m.id, 'PATCH', { status_id: sel.value }); } catch (e) { alert(e.message); } } },
          statuses.map((s) => h('option', { value: s.id }, s.nama)));
        sel.value = m.status_id;
        return h('tr', {},
          h('td', {}, m.kode || '-'), h('td', {}, fmtDate(m.dibuat_pada)),
          h('td', {}, h('b', {}, m.nama), h('br'), m.email, m.telepon ? h('br') : null, m.telepon),
          h('td', {}, m.judul_layanan || '-'),
          h('td', {}, h('b', {}, m.judul), h('br'), m.isi_pesan),
          h('td', {}, sel),
          h('td', {}, h('button', { class: 'btn btn-sm danger', type: 'button', onclick: async () => {
            if (confirm('Hapus pesan ini?')) { await api('/api/admin/pesan/' + m.id, 'DELETE'); load(); } } }, 'Hapus')));
      }) : [h('tr', {}, h('td', { colspan: 7 }, 'Belum ada pesan.'))]));
  }
  load();
}

// ---------- CRUD generik ----------
function fmtCell(v, type) {
  if (type === 'money') return rupiah(v);
  if (type === 'bool') return v ? 'Ya' : 'Tidak';
  const s = String(v ?? '-');
  return s.length > 70 ? s.slice(0, 70) + '…' : s;
}
async function crud(box, key) {
  const cfg = R[key];
  const rows = await api('/api/admin/data/' + key);
  box.replaceChildren(
    h('div', { class: 'bar-head' }, h('h2', {}, cfg.label), h('button', { class: 'btn btn-sm', type: 'button', onclick: () => openForm(key) }, '+ Tambah')),
    table([...cfg.cols.map((c) => c[1]), 'Aksi'], rows.length ? rows.map((r) => h('tr', {},
      cfg.cols.map((c) => h('td', {}, fmtCell(r[c[0]], c[2]))),
      h('td', { class: 'nowrap' },
        h('button', { class: 'btn btn-sm btn-ghost', type: 'button', onclick: () => openForm(key, r) }, 'Edit'), ' ',
        h('button', { class: 'btn btn-sm danger', type: 'button', onclick: async () => {
          if (!confirm('Hapus data ini?')) return;
          try { await api(`/api/admin/data/${key}/${r.id}`, 'DELETE'); show(key); } catch (e) { alert(e.message); } } }, 'Hapus'))))
      : [h('tr', {}, h('td', { colspan: cfg.cols.length + 1 }, 'Belum ada data.'))]));
}

async function openForm(key, row) {
  const cfg = R[key], form = $('dlgForm');
  form.replaceChildren(h('h3', {}, (row ? 'Edit ' : 'Tambah ') + cfg.label));
  for (const f of cfg.fields) {
    let input;
    if (f.t === 'select') {
      const opts = await api('/api/admin/data/' + f.ref);
      input = h('select', { name: f.n }, f.req ? null : h('option', { value: '' }, '- kosong -'),
        opts.map((o) => h('option', { value: o.id }, o[f.lab])));
    } else if (f.t === 'textarea') input = h('textarea', { name: f.n, rows: 4 });
    else if (f.t === 'checkbox') input = h('input', { type: 'checkbox', name: f.n });
    else input = h('input', { name: f.n, type: f.t === 'number' ? 'number' : 'text', step: 'any', min: f.min ?? '', max: f.max ?? '' });
    if (f.req) input.required = true;
    if (f.t === 'checkbox') input.checked = row ? !!row[f.n] : true;
    else if (row) input.value = row[f.n] ?? '';
    form.append(f.t === 'checkbox' ? h('label', { class: 'check' }, input, ' ' + f.l) : h('label', {}, f.l), f.t === 'checkbox' ? null : input);
  }
  form.append(h('div', { class: 'btn-row' },
    h('button', { class: 'btn', type: 'submit' }, 'Simpan'),
    h('button', { class: 'btn btn-ghost', type: 'button', onclick: () => $('dlg').close() }, 'Batal')));
  form.onsubmit = async (e) => {
    e.preventDefault();
    const body = {};
    cfg.fields.forEach((f) => { const el = form.elements[f.n]; body[f.n] = f.t === 'checkbox' ? (el.checked ? 1 : 0) : el.value; });
    try {
      await api(row ? `/api/admin/data/${key}/${row.id}` : `/api/admin/data/${key}`, row ? 'PUT' : 'POST', body);
      $('dlg').close(); show(key);
    } catch (err) { alert(err.message); }
  };
  $('dlg').showModal();
}

init();
