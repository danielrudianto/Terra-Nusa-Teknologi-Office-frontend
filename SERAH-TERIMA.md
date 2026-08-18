# TerraBot — Serah Terima

ERP untuk PT Alpha Konstruksi Nusantara. Dokumen ini untuk siapa pun yang
melanjutkan pengembangannya, termasuk sesi percakapan baru.

Seluruh angka dan klaim di sini **diverifikasi terhadap kode**, bukan diingat.
Bila menemukan yang tidak cocok, percayai kodenya dan perbarui dokumen ini.

Terakhir diperiksa: **18 Agustus 2026**

---

## Hal terpenting yang harus dibaca lebih dulu

**Tidak ada manusia lain yang memahami sistem ini selain pemiliknya.**

Kode ditulis oleh sesi-sesi asisten yang tidak saling mengingat. Setiap sesi
baru mulai tanpa ingatan apa pun tentang keputusan yang sudah diambil — mengapa
level 4 tidak boleh menyetujui dokumennya sendiri, mengapa `PUSAT` harus selalu
ada di pemilih proyek, mengapa HDD dicabut dari situs.

Dokumen inilah satu-satunya yang bertahan di antara sesi. Ia bukan catatan untuk
pengembang berikutnya; ia **ingatan sistem ini**. Memperbaruinya bukan
kerapian, melainkan syarat agar pekerjaan berikutnya tidak mengulang atau
membatalkan yang sudah benar.

---

## Tumpukan teknologi

**Frontend** — Angular 20, komponen standalone dengan NgModule di akarnya.
Angular Material 20 (tema M3), ngx-translate v17, ngx-mask, pdfmake untuk
dokumen, ExcelJS untuk rekap.

**Backend** — FastAPI + Python, SQLAlchemy Core dengan pustaka `databases`
(asinkron), MySQL. Redis untuk pembatas laju, Meilisearch untuk pencarian.

**Repo** — `Terra-Nusa-Teknologi-Office-frontend` dan
`Terra-Nusa-Teknologi-Office`.

### Yang wajib diketahui tentang `databases`

Objek yang dikembalikan `require()` dan `get_current_user()` adalah **Record**,
bukan `dict`. Ia **tidak punya `.get()`** — memanggilnya melempar
`AttributeError` dengan jejak tumpukan yang tidak menyebut sebabnya. Sudah
pernah menjatuhkan satu endpoint. Pakai `user["kolom"]`, dan bungkus dengan
`try/except` bila kolomnya mungkin tidak ada.

**Divisi tidak ada di objek `require()`.** Baca lewat `await _departments(user_id)`.

**Default kolom sisi-Python tidak pernah berlaku.** `Column(..., default=dt.now)`
dievaluasi mesin SQLAlchemy saat eksekusi; `databases` mengeksekusi kueri yang
sudah dikompilasi, sehingga langkah itu dilewati dan nilainya sampai ke MySQL
sebagai `NULL`. Karena itu **22 tempat mengisi `createdAt` manual** — ikuti pola
itu, jangan mengandalkan default.

---

## Keadaan saat ini

| | |
|---|---|
| Uji backend | **355 lolos**, 1 dilewati |
| Kunci i18n | **3.896**, tiga bahasa selaras |
| Panduan | **24 topik x 3 bahasa** (72 berkas) |
| Varian PO | 16, semuanya punya pratinjau |
| CORS | berdaftar (`_asal_diizinkan()`), bukan `*` |

---

## Aturan kerja yang berlaku

Ini bukan preferensi gaya; masing-masing lahir dari kesalahan nyata.

**Tar delta, bukan tar penuh.** Setiap kiriman hanya berisi perubahan sejak
kiriman terakhir, diuji merge lebih dulu. `env/` dan `data.ms/` tidak pernah ikut.

**Tarik sebelum membangun.** Jangan melaporkan sesuatu selesai tanpa memastikan
string atau fungsinya benar-benar ada **di repo pemiliknya**, bukan di salinan
kerja sendiri. Ini pernah keliru: pemeriksaan dilakukan terhadap cabang sendiri
yang sudah memuat perbaikannya, lalu disimpulkan "sudah beres" padahal repo
pemiliknya belum — dan build gagal untuk kedua kalinya.

**Periksa, jangan menebak.** Bila sebuah nama bisa dibaca dari kode, baca. Dalam
satu sesi, lima kali nama metode, larik, atau kelas ditebak dan kelimanya salah:
`JENIS_PERTANGGUNGAN` (yang benar `insuranceTypes`), `departmentCode`
(`department`), `utils.log` (`utils.logger_utils`), dan dua lainnya. Menebak
menghabiskan lebih banyak waktu daripada membaca.

**Sapu seluruhnya, jangan perbaiki satu-satu.** Ketika satu varian PO
bermasalah, periksa keenam belasnya sebelum memperbaiki. Pola sebaliknya —
memperbaiki yang dilaporkan lalu menunggu laporan berikutnya — pernah membuat
pemilik menemukan kesalahan yang sama tiga kali berturut-turut di varian
berbeda, dan itu wajar membuat marah.

**Verifikasi harus bisa gagal.** Setiap pemeriksa diuji dengan kerusakan buatan
lebih dulu: dirusak harus menyala, dipulihkan harus bersih. Pemeriksa yang tidak
pernah menemukan apa-apa mungkin memang buta — dua kali dalam satu sesi, uji
"berhasil" ternyata tidak menguji apa pun karena kerusakan buatannya tidak
mengenai sasaran.

**Pemeriksa yang tidak bekerja lebih buruk daripada tidak ada.** Satu pemeriksa
backtick dibuang setelah terbukti tidak dapat menangkap kasusnya; `tipecek`
sudah menutupinya.

**SQL diberikan langsung di percakapan**, bukan sebagai berkas.

**Boolean daripada enum teks** — `isActive`, `isCancelled`.

**Jangan menambah yang tidak diminta** — tidak ada animasi hias, perubahan
huruf, atau elemen tambahan tanpa diminta.

---

## Keputusan rancangan yang tidak boleh dibalik tanpa berpikir

**Dokumen cetak tetap berbahasa Indonesia.** Purchase order, slip gaji, dan
rekap Excel mengikuti bahasa dokumen resminya, bukan bahasa aplikasi. Karena itu
nama bulan punya dua sebutan: `key` untuk layar, `nama` untuk dokumen.

**Nilai pilihan bukan label.** Klausul dokumen membaca `value` (`'alat-berat'`),
bukan labelnya — sehingga label boleh diterjemahkan tanpa mengubah isi SPK.

**Nama bahasa tidak diterjemahkan.** "Indonesia", "English", "中文" tetap dalam
bahasanya sendiri.

**Yang membuat tidak boleh menyetujui.** Berlaku pada pembayaran keluar dan
pemeriksaan PO. Level 4 tidak boleh menyetujui dokumennya sendiri; level 5 boleh.

**Akses gaji tidak mengikuti tangga level** — hanya divisi FAT dan HRD.

**Status disimpulkan, bukan disetel.** `isPaid` pada pinjaman dihitung ulang dari
utang dan pembayaran.

**Adendum tidak boleh mengubah bentuk dokumennya.** Jenis PO, jenis subkontraktor
(H1/H2), mode pekerjaan, jalur penutupan asuransi, lingkup pekerjaan, dan
pemasok semuanya dikunci saat menyunting atau mengadendum. Alasannya dari
pemilik: *"kalau udah sampai ubah tipe PO mah mendingan batalin aja"* — dokumen
yang berubah bentuk bukan adendum lagi, melainkan perjanjian lain yang kebetulan
bernomor turunan.

**Volume pada adendum dikosongkan, pada koreksi disalin.** Adendum memuat
SELISIH; menyalin volume induk membuat yang mengisi tinggal menekan simpan dan
menggandakan seluruh pekerjaan tanpa menyadarinya.

**Timer ujian dihitung server.** Waktu dari layar dapat diubah lewat DevTools.
`startedAt` yang sudah ada tidak pernah ditimpa — menutup peramban lalu
membukanya kembali tidak memberi tambahan waktu.

**Alamat pakai textarea, bukan input satu baris.** Berlaku di seluruh aplikasi;
`alamatcek` menjaganya.

---

## Peta modul

### Purchase Order — 16 varian

`A B C D F G H 511 5112 512 516 63 641 642 651 652`

Semuanya berbagi pola: `buildPrintData(nomor)` menyusun data,
`printPurchaseOrderX()` mencetak. Semua punya **Pratinjau** dan konfirmasi
*"sudah membaca"* sebelum penerbitan.

**`remarks_1`-`remarks_6` BERBEDA ARTI tiap varian.** Pada PO-A `remarks_1`
adalah lokasi asal; pada PO-B tanggal mulai sewa; pada PO-511 catatan barang.
Tidak ada satu pemetaan bersama yang benar — `terapkanNilaiBaris` yang lama
menghasilkan baris tertukar isi tanpa galat apa pun.

Dua berkas menyimpan pemetaannya:

- `constants/balik-baris-po.ts` — dari baris dokumen ke isian formulir
  (dipakai saat memuat adendum)
- `constants/baris-tampil-po.ts` — dari baris dokumen ke keterangan terbaca
  (dipakai dialog lihat, supaya tidak perlu membuka PDF)

Keduanya disusun langsung dari `formatData()` masing-masing varian. **Bila
`formatData()` berubah, keduanya harus ikut berubah.**

**Sebagian varian menyimpan lariknya di `customData`, bukan `items`:**
`coverages` dan `premiums` (642), `officialFees` (641), `workers` dan `subType`
(H), `additionalClauses` (semua). `barisInduk()` hanya membaca `items` — larik
itu harus dibaca sendiri lewat `larikCustom()`.

**PO-F menentukan jenis dokumen:** beton/besi/material lain → PURCHASE ORDER;
uji tekan silinder dan uji tarik & tekuk besi → SURAT PERINTAH KERJA. Kedua
jenis uji harus disebut di **setiap** tempat yang memutuskan ini.

**PO tipe G tidak menerima kode proyek `PUSAT`.**

**PO-D**: `isFieldStaff` menambah seksi "Waktu Bekerja" (8 poin) dan mengubah
bentuk lembur — bagi staf lapangan, melewati jam batas diganti uang makan satu
hari, bukan dihitung per jam. Jamnya dapat disetel; bawaannya 20:00, 08:00-17:00,
Sabtu 08:00-15:00, cuti 7 hari, resign 30 hari.

**PENTING:** PO-D punya DUA penyusun klausul. `D_CLAUSES` **tidak dipakai siapa
pun**; yang dipakai cetakan, pratinjau, dan dialog lihat adalah
`buildManpowerClauses`. Pernah memperbaiki yang salah.

**G, 5.1.1, dan 5.1.6 berbagi `G_CLAUSES`**; 6.3.2 membangun di atasnya. Satu
perubahan menutup keempatnya — itu disengaja.

### Rekrutmen HR

Modul `hr_recruitment`, hanya HRD dan pemilik. Bank soal, pelamar, dan
pengerjaan ujian.

**Rute ujian TERBUKA tanpa akun** — pelamar bukan karyawan. Seluruh penjagaan
ada di server; tidak ada satu pun yang boleh bergantung pada layar.

`GET /employees/pilihan-pic` sengaja dijaga `purchase_order:create`, **bukan**
`employees:read`. Modul `employees` termasuk `MODUL_WILAYAH_MUTLAK` — isinya
susunan keluarga, riwayat kesehatan, gaji. Rute ini hanya mengembalikan nama,
telepon, dan jabatan karyawan **aktif**.

### Proyek

Kolom `address` (TEXT) menyimpan alamat lokasi; dipakai mengisi alamat
pengiriman PO **Franco** secara otomatis. Loco mengisi dari alamat pemasok.
Kontak PIC pemasok diisi pada **kedua** metode.

**15 proyek aktif belum diisi alamatnya** (per 18 Agu 2026). Sekali kerja lewat
layar Proyek → Ubah.

---

## Rute terbuka — seluruhnya, per 18 Agu 2026

```
POST /                          masuk
POST /refresh                   perpanjang sesi
GET  /isi/{token}               pengisian formulir karyawan
PUT  /isi/{token}
GET  /exam/{token}              periksa token ujian (tanpa soal)
POST /exam/{token}/mulai        mulai; soal baru dikirim di sini
PUT  /exam/{token}/jawaban      simpan berkala
POST /exam/{token}/kirim        kirim akhir
```

Setiap penambahan rute terbuka akan menggagalkan
`test/hr_soal_test.py::test_seluruh_rute_dijaga_modul_rekrutmen` sampai
disebutkan di daftarnya. **Itu disengaja** — supaya rute terbuka berikutnya
tidak lolos diam-diam.

Semuanya berpembatas laju, mencatat percobaan gagal, dan menjawab tiga jenis
kegagalan dengan pesan yang sama.

---

## Alat pemeriksa — RISIKO TERBESAR SAAT INI

Selama pengembangan dibangun **66 pemeriksa**, masing-masing setelah satu kelas
kesalahan lolos ke produksi. Semuanya berada di `/tmp` pada mesin sesi, dan
**nol di antaranya ada di repo**.

Artinya: setiap kelas kesalahan yang pernah ditemukan **tidak dijaga apa pun** di
luar sesi yang membangunnya. Ini pekerjaan pertama yang layak dikerjakan
berikutnya — memindahkannya ke `scripts/` dan menjalankannya sebelum setiap push.

Yang menangkap kesalahan nyata, dan sebabnya:

| Pemeriksa | Menangkap |
|---|---|
| `metodetemplatcek` | metode dipanggil templat tetapi tidak ada di komponen — **penyebab build gagal**, dan `tipecek` tidak menangkapnya karena hanya membaca berkas TypeScript |
| `warisancek` | larik `customData` yang tidak ikut diwarisi saat adendum |
| `adendumcek` | `muatAdendum()` dipanggil dari penangan tombol, bukan `ngOnInit` |
| `pemilihcek` | layar pemilih muncul lagi saat menyunting dokumen lama |
| `namabarangcek` | nama barang kosong karena server melabelinya `item_description` |
| `maskcek` | isian bermask bertipe `number` — masknya tidak pernah tampak |
| `muatancek` | isian formulir yang tidak ikut dikirim ke server |
| `alamatcek` | isian alamat memakai input satu baris |
| `navcek` | navigasi ke rute yang tidak terdaftar |
| `tampilcek` | varian PO tanpa keterangan baris pada dialog lihat |
| `svgcek` | ikon menu menunjuk berkas di direktori yang salah |
| `dialogcek` | dialog menyimpang dari pola bersama |
| `kuncicek` | kunci i18n dirujuk tetapi tidak ada terjemahannya |
| `blokcek` | blok `@if`/`@for` tidak seimbang |

Catatan: `tsc --noResolve` **tidak** memeriksa lintas berkas, dan `tipecek`
**tidak** memeriksa templat. Keduanya bukan bukti kebenaran.

---

## Yang belum beres

Urut menurut kepentingan.

### 1. 66 pemeriksa tidak ada di repo

Lihat bagian di atas. Ini yang paling menentukan.

### 2. Cadangan belum pernah diuji pulih

Skripnya ada. Bila belum pernah dicoba memulihkan, itu asumsi — bukan cadangan.
Dan yang ketahuan saat benar-benar diperlukan adalah waktu paling buruk untuk
mengetahuinya.

### 3. Client secret Azure kedaluwarsa

Seluruh pengiriman surel gagal dengan `invalid_client`. Perbaikannya di Azure
Portal → App registrations → Certificates & secrets → buat secret baru, salin
**Value** (bukan Secret ID), ganti `MICROSOFT_CLIENT_SECRET` di `.env`, hidupkan
ulang backend, lalu otorisasi ulang token sekali.

Undangan yang tokennya sudah terbit **tetap sah** — tautannya dapat disalin dan
dikirim lewat jalan lain.

### 4. Unggah berkas pada ujian

Soal berkategori `drawing` meminta gambar, tetapi unggahan belum ada. Layarnya
menyebut hal itu terus terang. Batas 10 MB sudah diputuskan; **jenis berkasnya
belum** — dan rute ini terbuka tanpa akun, sehingga menerima apa pun berarti
seseorang dapat menyimpan berkas sembarang di server.

### 5. Layar penilaian HRD

Jawaban sudah tersimpan tetapi belum dapat dinilai. Perlu juga penghapusan
berkas setelah keputusan diambil.

### 6. Halaman posisi keuangan

`GET /finance-status` sudah ada, izinnya `finance_status:read` level 4. Layarnya
belum dibuat.

### 7. 16 dialog belum seragam

Kepala berikon dan `appDialogGeser`. Daftar: `delete-confirmation`,
`fleet-info-dialog`, `salary-payment-create`, `pph-selector`,
`supplier-selector`, `calendar-day-selector`, `employee-update`, `expense-view`,
`loans-view`, `purchase-draft-view`, `purchase-view`, `reimbursement-view`,
`salary-slip-view`, `sales-invoice-view`, `supplier-update`.

Gaya bersamanya sudah ada di `styles.scss` (`.dlg__head`). **Kerjakan satu per
satu dengan tangan** — bentuk kepala keenam belasnya berbeda-beda, dan satu
skrip yang menyeragamkan semuanya pernah merusak berkas: kepala lama tersisip di
dalam yang baru dan `appDialogGeser` hilang.

### 8. `pages/engineering` sengaja tidak disentuh

Atas permintaan pemilik. Di dalamnya masih ada teks keras dan berkas yatim yang
mengimpor komponen tidak ada — tidak dirujuk routing, tetapi begitu ditautkan,
build langsung gagal.

### 9. `moment` dipakai 21 berkas

`provideMomentDateAdapter` menjadikannya tulang punggung seluruh datepicker
Material. Membuangnya berarti mengganti adaptor tanggal — bukan pekerjaan sela.

---

## Kesalahan yang pernah terjadi — jangan diulang

**Memeriksa cabang sendiri, bukan repo pemiliknya.** Disimpulkan "sudah beres"
padahal `origin/main` belum memuatnya; build gagal untuk kedua kalinya.

**Memperbaiki satu varian ketika enam belas bermasalah.** Pemilik menemukan
kesalahan yang sama berulang kali di varian berbeda. Audit satu perintah sudah
cukup untuk melihat seluruhnya sejak awal.

**Menebak nama alih-alih membacanya.** Lima kali dalam satu sesi.

**Uji yang tidak menguji apa pun.** Kerusakan buatan tidak mengenai sasaran,
sehingga "pemeriksa tidak menangkap" disalahartikan sebagai pemeriksanya rusak.
Uji ulang dengan berkas buatan yang dikendalikan penuh.

**`toISOString()` di WIB memundurkan tanggal sehari.** Selalu susun dari bagian
waktu setempat.

**Backtick di dalam komentar CSS pada templat literal** menutup literalnya lebih
awal; galatnya muncul sebagai `',' expected` di baris yang tidak berhubungan.

**Muatan simpan yang menyebut kolom satu per satu** tidak membawa isian baru
dengan sendirinya. Alamat proyek tersimpan sebagai `NULL` karenanya.

**Berkas isi tanpa hash nama** (`assets/i18n/`, `assets/panduan/`) harus
`no-cache` di nginx. Yang kena cache 30 hari membuat topik panduan baru tidak
dikenali, dan panelnya terbuka di daftar topik alih-alih halaman yang dibuka.

**`type="number"` melumpuhkan ngx-mask.** Atributnya terbaca benar di kode,
tetapi peramban menolak teks berformat sehingga masknya tidak pernah tampak.

---

## Catatan operasional

**ACCURATE** adalah pembukuan resmi AKN; TerraBot tidak menggantikannya. Standar
yang berlaku **SAK ETAP**, bukan PSAK penuh.

**Uji backend:** `pytest test/ -q` dari akar backend, 355 uji di bawah 3 detik.
Jalankan sebelum setiap push.

**Deploy:** `./scripts/deploy.sh` dan `./scripts/deploy-fe.sh` dari repo backend.
Backend dulu bila keduanya berubah — frontend yang memanggil rute belum ada
hanya menghasilkan layar kosong tanpa sebab yang terlihat.

Bila build gagal setelah menerapkan perubahan, curigai **cache Angular** lebih
dulu:

```bash
rm -rf .angular/cache node_modules/.vite && ng serve
```
