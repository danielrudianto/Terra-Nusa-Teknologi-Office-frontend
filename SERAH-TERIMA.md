# TerraBot — Serah Terima

ERP untuk PT Alpha Konstruksi Nusantara. Dokumen ini untuk siapa pun yang
melanjutkan pengembangannya, termasuk sesi percakapan baru.

Seluruh angka dan klaim di sini **diverifikasi terhadap kode**, bukan diingat.
Bila menemukan yang tidak cocok, percayai kodenya dan perbarui dokumen ini.

Terakhir diperiksa: **14 Agustus 2026**

---

## Tumpukan teknologi

**Frontend** — Angular 20, komponen standalone dengan NgModule di akarnya.
Angular Material 20 (tema M3), ngx-translate v17, pdfmake untuk dokumen,
ExcelJS untuk rekap.

**Backend** — FastAPI + Python, SQLAlchemy Core dengan pustaka `databases`
(asinkron), MySQL.

**Repo** — `Terra-Nusa-Teknologi-Office-frontend` dan
`Terra-Nusa-Teknologi-Office`.

### Yang wajib diketahui tentang `databases`

Objek yang dikembalikan `require()` dan `get_current_user()` adalah **Record**,
bukan `dict`. Ia **tidak punya `.get()`** — memanggilnya melempar
`AttributeError` dengan jejak tumpukan yang tidak menyebut sebabnya. Sudah
pernah menjatuhkan satu endpoint. Pakai `user["kolom"]`, dan bungkus dengan
`try/except` bila kolomnya mungkin tidak ada.

**Default kolom sisi-Python tidak pernah berlaku.** `Column(..., default=dt.now)`
dievaluasi mesin SQLAlchemy saat eksekusi; `databases` mengeksekusi kueri yang
sudah dikompilasi, sehingga langkah itu dilewati dan nilainya sampai ke MySQL
sebagai `NULL`. Karena itu **22 tempat mengisi `createdAt` manual** — ikuti pola
itu, jangan mengandalkan default.

---

## Keadaan saat ini

| | |
|---|---|
| Uji backend | **127 lolos**, 1 dilewati |
| Kunci i18n | **3.302**, tiga bahasa selaras |
| Panduan | **21 topik × 3 bahasa** (63 berkas) |
| Varian PO | 16, semuanya punya pratinjau |
| Teks keras di layar | **0** (di luar `pages/engineering`) |

---

## Aturan kerja yang berlaku

Ini bukan preferensi gaya; masing-masing lahir dari kesalahan nyata.

**Tar delta, bukan tar penuh.** Pernah menimpa kerjaan Koko dua kali. Setiap
kiriman hanya berisi perubahan sejak kiriman terakhir, diuji merge lebih dulu.
`env/` dan `data.ms/` tidak pernah ikut.

**Tarik sebelum membangun.** Jangan melaporkan sesuatu selesai tanpa memastikan
string atau fungsinya benar-benar ada di repo.

**Periksa, jangan menebak.** Bila sebuah klaim bisa diverifikasi ke kode,
verifikasi. Beberapa bug di dokumen ini ditemukan justru karena pemeriksaan
ulang, bukan karena dilaporkan.

**Verifikasi harus bisa gagal.** `tsc --noResolve` pernah membuat seluruh galat
lintas-berkas tidak terlihat, dan laporan "typecheck bersih" ternyata tidak
memeriksa apa pun. Bila membuat pemeriksa, uji dulu dengan kerusakan buatan —
pemeriksa yang tidak pernah menemukan apa-apa mungkin memang buta.

**Bandingkan ke remote, bukan ke hitungan absolut.** Menghitung tag pembuka dan
penutup menghasilkan positif palsu di mana-mana. Yang berarti adalah
*perubahan* dibanding versi remote.

**SQL diberikan langsung di percakapan**, bukan sebagai berkas.

**Boolean daripada enum teks** — `isActive`, `isCancelled`.

**Jangan menambah yang tidak diminta** — tidak ada animasi hias, perubahan
huruf, atau elemen tambahan tanpa diminta.

---

## Keputusan rancangan yang tidak boleh dibalik tanpa berpikir

**Dokumen cetak tetap berbahasa Indonesia.** Purchase order, slip gaji, dan
rekap Excel mengikuti bahasa dokumen resminya, bukan bahasa aplikasi. Karena
itu nama bulan punya dua sebutan: `key` untuk layar, `nama` untuk dokumen.
Menyamakannya membuat slip gaji tercetak "Periode January 2026".

**Nilai pilihan bukan label.** Klausul dokumen membaca `value` (`'alat-berat'`),
bukan labelnya — sehingga label boleh diterjemahkan tanpa mengubah isi SPK.
Kecuali pada slip gaji, yang justru menyimpan teksnya sendiri sebagai nilai.

**Nama bahasa tidak diterjemahkan.** "Indonesia", "English", "中文" tetap dalam
bahasanya sendiri, supaya pengguna Mandarin dapat menemukannya di aplikasi
berbahasa Indonesia.

**Yang membuat tidak boleh menyetujui.** Berlaku pada pembayaran keluar.

**Akses gaji tidak mengikuti tangga level** — hanya divisi FAT dan HRD. Karena
itu daftar aktivitas menyeluruh hanya untuk level 5: jejak audit memuat
perubahan gaji beserta angkanya, dan membukanya untuk level 4 akan menjadikan
halaman itu pintu belakang.

**Status disimpulkan, bukan disetel.** `isPaid` pada pinjaman dihitung ulang
dari utang dan pembayaran; ia sengaja tidak ada di daftar kolom yang boleh
disunting.

---

## Peta modul

### Purchase Order — 16 varian

`A B C D F G H 511 5112 512 516 63 641 642 651 652`

Semuanya berbagi pola: `buildPrintData(nomor)` menyusun data, `printPurchaseOrderX()`
mencetak. Semua punya tombol **Pratinjau** dan konfirmasi *"sudah membaca"*
sebelum penerbitan — dokumennya ditampilkan memakai komponen halaman lihat,
bukan PDF, sehingga yang dilihat sebelum terbit sama dengan sesudahnya.

**PO-F menentukan jenis dokumen:**

| Jenis material | Dokumen |
|---|---|
| Beton, besi, material lain | **PURCHASE ORDER** (helper G) |
| Uji tekan silinder, uji tarik & tekuk besi | **SURAT PERINTAH KERJA** (helper B) |

Kedua jenis uji harus disebut di **setiap** tempat yang memutuskan ini —
formulir pembuatan dan cetak ulang dari daftar. Pernah hanya `ujitekan` yang
diperiksa, sehingga uji besi tercetak ulang dengan judul berbeda dari yang
ditandatangani vendor.

Pada jasa pengujian, `deliveryMethod` **tidak wajib** dan disembunyikan —
validatornya disesuaikan lewat `selaraskanValidasi()`. Sebelumnya kolom wajib
yang tak tertampil membuat formulir selamanya tidak sah tanpa satu pun kolom
merah.

**PO-B tipe A** menerima alat berat **dan** kendaraan. Operator vendor hanya
dinyalakan otomatis untuk alat berat.

**PO-D** punya jadwal upah *dua kali sebulan* — cut-off tanggal X dan akhir
bulan, dibayar pada hari tertentu di pekan berikutnya. Tanggal bayarnya sengaja
tidak ditulis sebagai angka.

**PO tipe G** tidak menerima kode proyek `PUSAT`.

### Pembelian

`PUT /purchases/update` — kolom yang boleh diubah **didaftar di repository**,
bukan disalin dari muatan. Nilai dokumen (`dpp`, `ppn`, `pbbkb`, `otherValue`,
`pphPercentage`) dikunci bila pembayarannya sudah ada; hanya level 4 ke atas
yang boleh.

### Pinjaman

Nilai `debt` dan `received` dapat disunting, tetapi `debt` **tidak boleh turun
di bawah jumlah yang sudah dibayarkan** (toleransi 5 rupiah, sama seperti pada
persetujuan pembayaran). Status lunas dihitung ulang dua arah setiap kali
nilainya berubah.

### Aktivitas

Terbuka untuk semua level; **isinya** yang dibatasi. Di bawah level 5, `userID`
dipaksa ke pengguna sendiri **di rutenya** — bukan disembunyikan di layar, agar
tidak dapat dilewati lewat alamat langsung. Level 5 dapat menyaring sampai
**5 pengguna** sekaligus.

### Agenda

`GET /agenda/range?start=&end=` untuk kalender bulanan, dibatasi 62 hari.
Ulang tahun karyawan **nonaktif tidak ditampilkan** — penentunya `endDate`
terisi. Halaman ini tidak ada di menu samping; jalan masuknya lewat kartu
Dashboard.

### Tampilan

Warna aksen pengguna diteruskan ke **69 token Material** (`--mat-*`, bukan
`--mdc-*` — awalan itu berubah sejak Material 20). Warna teks di atas aksen
dihitung dari luminansi WCAG lewat `--on-brand`; nilai bawaannya **wajib ada di
`styles.scss`**, karena berkas itu berlaku sebelum SettingsService berjalan.

`box-sizing` **tidak** disetel global. Petak tujuh kolom karena itu memerlukan
`border-box` lokal dan `minmax(0, 1fr)` — tanpa keduanya, padding tiap sel
menambah lebar dan kolom terakhir terpotong.

---

## Yang belum beres

Urut menurut kepentingan.

### 1. CORS masih `*`

`main.py` masih `allow_origins=["*"]`. Situs mana pun dapat memanggil API
dengan kredensial pengguna yang sedang login. Perbaikannya satu baris; yang
dibutuhkan hanya daftar domain produksinya.

### 2. `env/` dan `data.ms/` ter-commit

**10.496 dari 10.731 berkas** terlacak di repo backend adalah keduanya — 98%.
`env/` berpotensi memuat kredensial. Perlu diperiksa isinya, dimasukkan
`.gitignore`, lalu dikeluarkan dari riwayat bila memang ada rahasia di sana.

### 3. Halaman posisi keuangan

`GET /finance-status` sudah ada, izinnya `finance_status:read` level 4 dan
dipetakan ke divisi FAT. **Layarnya belum dibuat**, jadi quick ratio, umur
piutang, dan utang jatuh tempo belum terlihat di mana pun. Menunggu keputusan
di mana halaman ini ditempatkan.

### 4. Cadangan belum pernah diuji pulih

Skripnya ada. Bila belum pernah dicoba memulihkan, itu asumsi — bukan cadangan.

### 5. Tiga berkas yatim rusak

`pages/bank/supplier/supplier-list`, `pages/engineering/supplier/supplier-list`,
dan `pages/engineering/dashboard/dashboard-body` mengimpor komponen yang tidak
ada. Tidak dirujuk routing sehingga tidak ikut dibangun — tetapi begitu ada yang
menautkannya, build langsung gagal.

### 6. `pages/engineering` sengaja tidak disentuh

Atas permintaan pemilik. Di dalamnya masih ada 11 teks keras dan berkas rusak
di atas.

### 7. `optimization: true` pada konfigurasi development

Membuat `ng serve` mengoptimasi setiap build. Bila tidak disengaja, kembalikan
ke `false` — bedanya terasa pada setiap penyimpanan berkas.

### 8. `moment` dipakai 21 berkas

37 pemanggilan, 25 di antaranya hanya `.format('YYYY-MM-DD')` — yang sudah
dilakukan `tanggalLokal()`. Tetapi `provideMomentDateAdapter` menjadikannya
tulang punggung seluruh datepicker Material, sehingga membuangnya berarti
mengganti adaptor tanggal. Bukan pekerjaan sela; kerjakan tersendiri bila mau.

### 9. Panduan PO baru mencakup 5 dari 16 varian

`C F G 5.1.1 5.1.6`. Sisanya sengaja tidak didokumentasikan agar panduannya
tidak menyesatkan.

---

## Alat pemeriksa

Dibuat selama pengembangan, masing-masing setelah satu kelas kesalahan lolos.
Jalankan sebelum menyatakan sesuatu selesai.

| Pemeriksa | Menangkap |
|---|---|
| kunci i18n | kunci dirujuk kode tetapi tidak ada terjemahannya |
| template | nilai ikatan properti tercemar, atribut hilang dibanding remote |
| sintaks | kurung timpang, ternary tanpa `:`, kata kunci deklarasi diikuti komentar |
| properti | nama properti objek berubah tanpa sengaja |
| impor lintas berkas | simbol diimpor tetapi tidak diekspor berkas tujuannya |
| kontras | pasangan latar/teks di bawah 4,5:1 |

Catatan: `tsc --noResolve` **tidak** memeriksa lintas berkas. Jangan memakainya
sebagai bukti kebenaran.

---

## Catatan operasional

**ACCURATE** adalah pembukuan resmi AKN; TerraBot tidak menggantikannya.
Standar akuntansi yang berlaku **SAK ETAP**, bukan PSAK penuh.

Bila build gagal setelah menerapkan perubahan, curigai **cache Angular** lebih
dulu — sudah tiga kali menyebabkan gejala yang tampak seperti bug:

```bash
rm -rf .angular/cache node_modules/.vite && ng serve
```
