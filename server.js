const express = require('express');
const session = require('express-session');
const bcrypt = require('bcryptjs');
const mongoose = require('mongoose');
const path = require('path');

const app = express();
app.use(express.json());

// Konfigurasi Session (untuk Vercel/HTTPS gunakan proxy trust & secure cookie bila di production)
const isProd = process.env.NODE_ENV === 'production' || !!process.env.VERCEL;
if (isProd) {
  app.set('trust proxy', 1);
}

app.use(session({
  secret: process.env.SESSION_SECRET || 'ganti-dengan-teks-rahasia-kamu',
  resave: false,
  saveUninitialized: false,
  cookie: {
    httpOnly: true,
    sameSite: 'lax',
    secure: isProd,
  },
}));

app.use(express.static(path.join(__dirname, 'public')));

// ============================================================
//  KONEKSI MONGODB & MODEL MONGOOSE
// ============================================================
let isConnected = false;

async function connectDB() {
  if (mongoose.connection.readyState === 1) return;
  if (isConnected && mongoose.connection.readyState === 2) {
    await new Promise((resolve) => mongoose.connection.once('connected', resolve));
    return;
  }
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    throw new Error('MONGODB_URI belum diatur di Environment Variables.');
  }
  await mongoose.connect(uri);
  isConnected = true;
}

const baseOpts = { strict: false, timestamps: false };

const Admin = mongoose.models.Admin || mongoose.model('Admin', new mongoose.Schema({
  id: Number,
  username: { type: String, required: true, unique: true },
  kata_sandi_hash: { type: String, required: true },
}, baseOpts), 'admin');

const KategoriLayanan = mongoose.models.KategoriLayanan || mongoose.model('KategoriLayanan', new mongoose.Schema({
  id: Number,
  nama: String,
  deskripsi: String,
}, baseOpts), 'kategori_layanan');

const Layanan = mongoose.models.Layanan || mongoose.model('Layanan', new mongoose.Schema({
  id: Number,
  kategori_id: Number,
  judul: String,
  deskripsi: String,
  ikon: { type: String, default: '💼' },
  harga_mulai: { type: Number, default: 0 },
  aktif: { type: Number, default: 1 },
}, baseOpts), 'layanan');

const Klien = mongoose.models.Klien || mongoose.model('Klien', new mongoose.Schema({
  id: Number,
  nama: String,
  perusahaan: String,
  industri: String,
}, baseOpts), 'klien');

const AnggotaTim = mongoose.models.AnggotaTim || mongoose.model('AnggotaTim', new mongoose.Schema({
  id: Number,
  nama: String,
  jabatan: String,
  bio: String,
}, baseOpts), 'anggota_tim');

const Proyek = mongoose.models.Proyek || mongoose.model('Proyek', new mongoose.Schema({
  id: Number,
  layanan_id: Number,
  klien_id: Number,
  judul: String,
  deskripsi: String,
  tahun: Number,
}, baseOpts), 'proyek');

const TimProyek = mongoose.models.TimProyek || mongoose.model('TimProyek', new mongoose.Schema({
  id: Number,
  proyek_id: Number,
  anggota_id: Number,
}, baseOpts), 'tim_proyek');

const Testimoni = mongoose.models.Testimoni || mongoose.model('Testimoni', new mongoose.Schema({
  id: Number,
  klien_id: Number,
  proyek_id: Number,
  rating: Number,
  komentar: String,
}, baseOpts), 'testimoni');

const Faq = mongoose.models.Faq || mongoose.model('Faq', new mongoose.Schema({
  id: Number,
  pertanyaan: String,
  jawaban: String,
  urutan: { type: Number, default: 0 },
}, baseOpts), 'faq');

const StatusPesan = mongoose.models.StatusPesan || mongoose.model('StatusPesan', new mongoose.Schema({
  id: Number,
  nama: String,
}, baseOpts), 'status_pesan');

const PesanMasuk = mongoose.models.PesanMasuk || mongoose.model('PesanMasuk', new mongoose.Schema({
  id: Number,
  kode: String,
  layanan_id: Number,
  status_id: { type: Number, default: 1 },
  nama: String,
  email: String,
  telepon: String,
  judul: String,
  isi_pesan: String,
  dibuat_pada: { type: Date, default: Date.now },
}, baseOpts), 'pesan_masuk');

// Pastikan koneksi DB aktif sebelum menangani rute API
app.use('/api', async (req, res, next) => {
  try {
    await connectDB();
    next();
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Gagal terhubung ke database MongoDB.' });
  }
});

// ============================================================
//  Helper & Middleware
// ============================================================
const fail = (status, error) => Object.assign(new Error(error), { status, error });

const wrap = (fn) => (req, res, next) => fn(req, res, next).catch((err) => {
  if (err.status) return res.status(err.status).json({ error: err.error });
  if (err.code === 11000) return res.status(409).json({ error: 'Data duplikat sudah ada.' });
  console.error(err);
  res.status(500).json({ error: 'Terjadi kesalahan server' });
});

const requireAdmin = (req, res, next) =>
  req.session && req.session.admin ? next() : res.status(401).json({ error: 'Belum login' });

// Helper ID numerik agar tetap kompatibel dengan frontend berbasis ID angka
async function nextNumericId(Model) {
  const last = await Model.findOne({ id: { $type: 'number' } }).sort({ id: -1 }).lean();
  return last && typeof last.id === 'number' ? last.id + 1 : 1;
}

function toPlain(doc) {
  if (!doc) return null;
  const { _id, __v, ...rest } = doc;
  return { id: rest.id ?? String(_id), ...rest };
}

function matchIdQuery(rawId) {
  const num = Number(rawId);
  if (!Number.isNaN(num) && String(num) === String(rawId).trim()) {
    return { $or: [{ id: num }, { _id: mongoose.isValidObjectId(rawId) ? new mongoose.Types.ObjectId(rawId) : null }] };
  }
  return mongoose.isValidObjectId(rawId) ? { _id: new mongoose.Types.ObjectId(rawId) } : { id: rawId };
}

// ============================================================
//  API PUBLIK
// ============================================================
app.get('/api/statistik', wrap(async (req, res) => {
  const [ahli, klien, proyek, testimoniList] = await Promise.all([
    AnggotaTim.countDocuments(),
    Klien.countDocuments(),
    Proyek.countDocuments(),
    Testimoni.find({}).lean(),
  ]);

  const ratings = testimoniList
    .map((t) => Number(t.rating))
    .filter((r) => !Number.isNaN(r));

  const avgRating = ratings.length
    ? Math.round((ratings.reduce((a, b) => a + b, 0) / ratings.length) * 10) / 10
    : 0;

  res.json({
    ahli,
    klien,
    proyek,
    rating: Number(avgRating),
  });
}));

app.get('/api/kategori', wrap(async (req, res) => {
  const rows = await KategoriLayanan.find({}).sort({ id: 1, _id: 1 }).lean();
  res.json(rows.map(toPlain));
}));

app.get('/api/layanan', wrap(async (req, res) => {
  const [layananRows, kategoriRows] = await Promise.all([
    Layanan.find({ aktif: { $in: [1, true] } }).sort({ id: 1, _id: 1 }).lean(),
    KategoriLayanan.find({}).lean(),
  ]);

  const kategoriMap = new Map(kategoriRows.map((k) => [String(k.id ?? k._id), k]));
  const result = layananRows.map((l) => {
    const plain = toPlain(l);
    const kat = kategoriMap.get(String(l.kategori_id));
    return {
      ...plain,
      nama_kategori: kat ? kat.nama : null,
    };
  });

  res.json(result);
}));

app.get('/api/proyek', wrap(async (req, res) => {
  const [proyekRows, layananRows, klienRows, timProyekRows, anggotaRows] = await Promise.all([
    Proyek.find({}).sort({ tahun: -1, id: -1, _id: -1 }).lean(),
    Layanan.find({}).lean(),
    Klien.find({}).lean(),
    TimProyek.find({}).lean(),
    AnggotaTim.find({}).sort({ id: 1 }).lean(),
  ]);

  const layananMap = new Map(layananRows.map((l) => [String(l.id ?? l._id), l]));
  const klienMap = new Map(klienRows.map((k) => [String(k.id ?? k._id), k]));
  const anggotaMap = new Map(anggotaRows.map((a) => [String(a.id ?? a._id), a]));

  const rows = proyekRows.map((p) => {
    const plain = toPlain(p);
    const lyn = layananMap.get(String(p.layanan_id));
    const kln = klienMap.get(String(p.klien_id));
    const pid = p.id ?? String(p._id);

    const timNames = timProyekRows
      .filter((tp) => String(tp.proyek_id) === String(pid))
      .map((tp) => anggotaMap.get(String(tp.anggota_id))?.nama)
      .filter(Boolean);

    return {
      id: plain.id,
      judul: plain.judul,
      deskripsi: plain.deskripsi,
      tahun: plain.tahun,
      judul_layanan: lyn ? lyn.judul : null,
      ikon: lyn ? lyn.ikon : null,
      kategori_id: lyn ? lyn.kategori_id : null,
      nama_klien: kln ? kln.nama : null,
      perusahaan: kln ? kln.perusahaan : null,
      tim: timNames.length ? timNames.join(', ') : null,
    };
  });

  res.json(rows);
}));

app.get('/api/tim', wrap(async (req, res) => {
  const rows = await AnggotaTim.find({}).sort({ id: 1, _id: 1 }).lean();
  res.json(rows.map(toPlain));
}));

app.get('/api/testimoni', wrap(async (req, res) => {
  const [testiRows, klienRows, proyekRows] = await Promise.all([
    Testimoni.find({}).sort({ id: -1, _id: -1 }).lean(),
    Klien.find({}).lean(),
    Proyek.find({}).lean(),
  ]);

  const klienMap = new Map(klienRows.map((k) => [String(k.id ?? k._id), k]));
  const proyekMap = new Map(proyekRows.map((p) => [String(p.id ?? p._id), p]));

  const rows = testiRows.map((t) => {
    const plain = toPlain(t);
    const kln = klienMap.get(String(t.klien_id));
    const prj = proyekMap.get(String(t.proyek_id));
    return {
      id: plain.id,
      rating: plain.rating,
      komentar: plain.komentar,
      nama_klien: kln ? kln.nama : null,
      perusahaan: kln ? kln.perusahaan : null,
      judul_proyek: prj ? prj.judul : null,
    };
  });

  res.json(rows);
}));

app.get('/api/faq', wrap(async (req, res) => {
  const rows = await Faq.find({}).sort({ urutan: 1, id: 1, _id: 1 }).lean();
  res.json(rows.map(toPlain));
}));

// Kirim pesan / permintaan layanan
app.post('/api/pesan', wrap(async (req, res) => {
  const b = req.body || {};
  const nama = (b.nama || '').trim();
  const email = (b.email || '').trim();
  const judul = (b.judul || '').trim();
  const isiPesan = (b.isi_pesan || '').trim();
  const telepon = (b.telepon || '').trim() || null;
  const layananId = b.layanan_id ? parseInt(b.layanan_id, 10) : null;
  const emailOk = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

  if (!nama || !judul || !isiPesan || !emailOk || (b.layanan_id && Number.isNaN(layananId))) {
    throw fail(400, 'Data belum lengkap atau email tidak valid.');
  }

  const newId = await nextNumericId(PesanMasuk);
  const kode = 'INQ-' + String(newId).padStart(4, '0');

  await PesanMasuk.create({
    id: newId,
    kode,
    layanan_id: layananId,
    status_id: 1,
    nama,
    email,
    telepon,
    judul,
    isi_pesan: isiPesan,
    dibuat_pada: new Date(),
  });

  res.json({ ok: true, kode });
}));

// Cek status pesan (kode + email)
app.get('/api/pesan/status', wrap(async (req, res) => {
  const kode = (req.query.kode || '').trim().toUpperCase();
  const email = (req.query.email || '').trim().toLowerCase();

  const pm = await PesanMasuk.findOne({
    kode,
    email: new RegExp(`^${email.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i'),
  }).lean();

  if (!pm) throw fail(404, 'Kode atau email tidak ditemukan.');

  const [st, lyn] = await Promise.all([
    StatusPesan.findOne({ id: pm.status_id }).lean(),
    pm.layanan_id ? Layanan.findOne({ id: pm.layanan_id }).lean() : null,
  ]);

  res.json({
    kode: pm.kode,
    judul: pm.judul,
    dibuat_pada: pm.dibuat_pada,
    status: st ? st.nama : null,
    judul_layanan: lyn ? lyn.judul : null,
  });
}));

// ============================================================
//  ADMIN: autentikasi
// ============================================================
app.get('/api/admin/status', wrap(async (req, res) => {
  const total = await Admin.countDocuments();
  res.json({
    needSetup: total === 0,
    loggedIn: !!(req.session && req.session.admin),
    username: (req.session && req.session.admin) || null,
  });
}));

app.post('/api/admin/setup', wrap(async (req, res) => {
  const total = await Admin.countDocuments();
  if (total > 0) throw fail(403, 'Admin sudah ada.');
  const { username = '', password = '' } = req.body || {};
  if (!username.trim() || password.length < 6) {
    throw fail(400, 'Username wajib diisi dan password minimal 6 karakter.');
  }
  const newId = await nextNumericId(Admin);
  await Admin.create({
    id: newId,
    username: username.trim(),
    kata_sandi_hash: await bcrypt.hash(password, 10),
  });
  res.json({ ok: true });
}));

app.post('/api/admin/login', wrap(async (req, res) => {
  const { username = '', password = '' } = req.body || {};
  const admin = await Admin.findOne({ username: username.trim() }).lean();
  if (!admin || !(await bcrypt.compare(password, admin.kata_sandi_hash))) {
    throw fail(401, 'Username atau password salah.');
  }
  req.session.admin = admin.username;
  res.json({ ok: true });
}));

app.post('/api/admin/logout', (req, res) => {
  if (!req.session) return res.json({ ok: true });
  req.session.destroy(() => res.json({ ok: true }));
});

// ============================================================
//  ADMIN: dashboard & pesan masuk
// ============================================================
app.get('/api/admin/dashboard', requireAdmin, wrap(async (req, res) => {
  const [pesanCount, proyekCount, klienCount, layananCount, statusList, pesanList, layananList] =
    await Promise.all([
      PesanMasuk.countDocuments(),
      Proyek.countDocuments(),
      Klien.countDocuments(),
      Layanan.countDocuments(),
      StatusPesan.find({}).sort({ id: 1 }).lean(),
      PesanMasuk.find({}).lean(),
      Layanan.find({}).lean(),
    ]);

  const total = {
    pesan: pesanCount,
    proyek: proyekCount,
    klien: klienCount,
    layanan: layananCount,
  };

  const perStatus = statusList.map((st) => ({
    nama: st.nama,
    total: pesanList.filter((pm) => String(pm.status_id) === String(st.id)).length,
  }));

  const layananMap = new Map(layananList.map((l) => [String(l.id ?? l._id), l.judul]));
  const layananCounts = new Map();
  for (const pm of pesanList) {
    const nama = pm.layanan_id && layananMap.get(String(pm.layanan_id))
      ? layananMap.get(String(pm.layanan_id))
      : 'Umum / belum pilih layanan';
    layananCounts.set(nama, (layananCounts.get(nama) || 0) + 1);
  }

  const perLayanan = Array.from(layananCounts.entries())
    .map(([nama, cnt]) => ({ nama, total: cnt }))
    .sort((a, b) => b.total - a.total)
    .slice(0, 5);

  res.json({ total, perStatus, perLayanan });
}));

app.get('/api/admin/daftar-status', requireAdmin, wrap(async (req, res) => {
  const rows = await StatusPesan.find({}).sort({ id: 1, _id: 1 }).lean();
  res.json(rows.map(toPlain));
}));

async function getPesanEnriched(filter = {}) {
  const [pesanRows, statusRows, layananRows] = await Promise.all([
    PesanMasuk.find(filter).sort({ dibuat_pada: -1, id: -1, _id: -1 }).lean(),
    StatusPesan.find({}).lean(),
    Layanan.find({}).lean(),
  ]);

  const statusMap = new Map(statusRows.map((s) => [String(s.id ?? s._id), s.nama]));
  const layananMap = new Map(layananRows.map((l) => [String(l.id ?? l._id), l.judul]));

  return pesanRows.map((pm) => {
    const plain = toPlain(pm);
    return {
      ...plain,
      nama_status: statusMap.get(String(pm.status_id)) || null,
      judul_layanan: pm.layanan_id ? (layananMap.get(String(pm.layanan_id)) || null) : null,
    };
  });
}

app.get('/api/admin/pesan', requireAdmin, wrap(async (req, res) => {
  const sid = parseInt(req.query.status_id, 10);
  const filter = Number.isNaN(sid) ? {} : { status_id: sid };
  const rows = await getPesanEnriched(filter);
  res.json(rows);
}));

app.get('/api/admin/pesan/export', requireAdmin, wrap(async (req, res) => {
  const rows = (await getPesanEnriched({})).sort((a, b) => (a.id ?? 0) - (b.id ?? 0));
  const esc = (v) => '"' + String(v ?? '').replace(/"/g, '""') + '"';
  const head = ['Kode', 'Tanggal', 'Nama', 'Email', 'Telepon', 'Layanan', 'Judul', 'Pesan', 'Status'];
  const lines = rows.map((r) => [
    r.kode,
    r.dibuat_pada ? new Date(r.dibuat_pada).toLocaleString('id-ID') : '',
    r.nama,
    r.email,
    r.telepon,
    r.judul_layanan,
    r.judul,
    r.isi_pesan,
    r.nama_status,
  ].map(esc).join(','));

  res.set({
    'Content-Type': 'text/csv; charset=utf-8',
    'Content-Disposition': 'attachment; filename="pesan-masuk.csv"',
  });
  res.send('\ufeff' + [head.map(esc).join(','), ...lines].join('\r\n'));
}));

app.patch('/api/admin/pesan/:id', requireAdmin, wrap(async (req, res) => {
  const statusId = parseInt(req.body.status_id, 10);
  if (Number.isNaN(statusId)) throw fail(400, 'Status tidak valid.');
  await PesanMasuk.updateOne(matchIdQuery(req.params.id), { $set: { status_id: statusId } });
  res.json({ ok: true });
}));

app.delete('/api/admin/pesan/:id', requireAdmin, wrap(async (req, res) => {
  await PesanMasuk.deleteOne(matchIdQuery(req.params.id));
  res.json({ ok: true });
}));

// ============================================================
//  ADMIN: CRUD generik (whitelist resource ke Model Mongoose)
// ============================================================
const RES = {
  kategori: {
    Model: KategoriLayanan,
    fields: ['nama', 'deskripsi'],
    required: ['nama'],
    sort: { id: 1, _id: 1 },
  },
  layanan: {
    Model: Layanan,
    fields: ['kategori_id', 'judul', 'deskripsi', 'ikon', 'harga_mulai', 'aktif'],
    required: ['kategori_id', 'judul', 'deskripsi'],
    defaults: { ikon: '💼', harga_mulai: 0, aktif: 1 },
    sort: { id: 1, _id: 1 },
  },
  proyek: {
    Model: Proyek,
    fields: ['layanan_id', 'klien_id', 'judul', 'deskripsi', 'tahun'],
    required: ['layanan_id', 'klien_id', 'judul'],
    sort: { id: 1, _id: 1 },
  },
  klien: {
    Model: Klien,
    fields: ['nama', 'perusahaan', 'industri'],
    required: ['nama', 'perusahaan'],
    sort: { id: 1, _id: 1 },
  },
  testimoni: {
    Model: Testimoni,
    fields: ['klien_id', 'proyek_id', 'rating', 'komentar'],
    required: ['klien_id', 'rating', 'komentar'],
    sort: { id: 1, _id: 1 },
  },
  tim: {
    Model: AnggotaTim,
    fields: ['nama', 'jabatan', 'bio'],
    required: ['nama', 'jabatan'],
    sort: { id: 1, _id: 1 },
  },
  faq: {
    Model: Faq,
    fields: ['pertanyaan', 'jawaban', 'urutan'],
    required: ['pertanyaan', 'jawaban'],
    defaults: { urutan: 0 },
    sort: { urutan: 1, id: 1, _id: 1 },
  },
};

const getDef = (req) => RES[req.params.res] || (() => { throw fail(404, 'Data tidak ditemukan.'); })();

function pickValues(def, body) {
  const obj = {};
  for (const f of def.fields) {
    let v = body[f];
    if (v === undefined || v === '') v = null;
    if (v === null && def.defaults && f in def.defaults) v = def.defaults[f];
    if (v === null && def.required.includes(f)) throw fail(400, `Kolom "${f}" wajib diisi.`);
    obj[f] = v;
  }
  return obj;
}

async function enrichAdminList(resKey, docs) {
  const plainList = docs.map(toPlain);

  if (resKey === 'layanan') {
    const kategoris = await KategoriLayanan.find({}).lean();
    const kMap = new Map(kategoris.map((k) => [String(k.id ?? k._id), k.nama]));
    return plainList.map((item) => ({
      ...item,
      nama_kategori: kMap.get(String(item.kategori_id)) || null,
    }));
  }

  if (resKey === 'proyek') {
    const [layanans, kliens] = await Promise.all([Layanan.find({}).lean(), Klien.find({}).lean()]);
    const lMap = new Map(layanans.map((l) => [String(l.id ?? l._id), l.judul]));
    const cMap = new Map(kliens.map((c) => [String(c.id ?? c._id), c.perusahaan]));
    return plainList.map((item) => ({
      ...item,
      judul_layanan: lMap.get(String(item.layanan_id)) || null,
      perusahaan_klien: cMap.get(String(item.klien_id)) || null,
    }));
  }

  if (resKey === 'testimoni') {
    const [kliens, proyeks] = await Promise.all([Klien.find({}).lean(), Proyek.find({}).lean()]);
    const cMap = new Map(kliens.map((c) => [String(c.id ?? c._id), c.perusahaan]));
    const pMap = new Map(proyeks.map((p) => [String(p.id ?? p._id), p.judul]));
    return plainList.map((item) => ({
      ...item,
      perusahaan_klien: cMap.get(String(item.klien_id)) || null,
      judul_proyek: item.proyek_id ? (pMap.get(String(item.proyek_id)) || null) : null,
    }));
  }

  return plainList;
}

app.get('/api/admin/data/:res', requireAdmin, wrap(async (req, res) => {
  const def = getDef(req);
  const docs = await def.Model.find({}).sort(def.sort).lean();
  const rows = await enrichAdminList(req.params.res, docs);
  res.json(rows);
}));

app.post('/api/admin/data/:res', requireAdmin, wrap(async (req, res) => {
  const def = getDef(req);
  const data = pickValues(def, req.body || {});
  data.id = await nextNumericId(def.Model);
  await def.Model.create(data);
  res.json({ ok: true });
}));

app.put('/api/admin/data/:res/:id', requireAdmin, wrap(async (req, res) => {
  const def = getDef(req);
  const data = pickValues(def, req.body || {});
  await def.Model.updateOne(matchIdQuery(req.params.id), { $set: data });
  res.json({ ok: true });
}));

app.delete('/api/admin/data/:res/:id', requireAdmin, wrap(async (req, res) => {
  const def = getDef(req);
  await def.Model.deleteOne(matchIdQuery(req.params.id));
  res.json({ ok: true });
}));

// ============================================================
//  START SERVER (Lokal) & EXPORT APP (Vercel Serverless)
// ============================================================
if (require.main === module) {
  const PORT = process.env.PORT || 3000;
  connectDB()
    .then(() => {
      app.listen(PORT, () => console.log(`Server jalan di http://localhost:${PORT}`));
    })
    .catch((err) => {
      console.error('Gagal koneksi MongoDB saat start:', err);
    });
}

module.exports = app;