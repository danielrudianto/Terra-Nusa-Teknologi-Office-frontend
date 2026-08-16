# TerraBot — Frontend

Antarmuka sistem manajemen PT Alpha Konstruksi Nusantara: purchase order,
pembelian, pembayaran, penggajian, dan pelaporan proyek.

Angular 20 · Angular Material · ngx-translate

---

## Keadaan

| | |
|---|---|
| Komponen | 222 |
| Layanan | 16 |
| Halaman | 30 |
| Varian purchase order | 16 |
| Kunci i18n | 3.665 |
| Bahasa | 3 — Indonesia, English, 中文 |
| Panduan dalam aplikasi | 22 topik × 3 bahasa |

---

## Menjalankan

Angular 20 memerlukan **Node 20 atau 22**. Yang bawaan Ubuntu terlalu tua.

```bash
git clone https://github.com/danielrudianto/Terra-Nusa-Teknologi-Office-frontend.git
cd Terra-Nusa-Teknologi-Office-frontend

npm install
npx ng serve
```

Alamat API disetel di `src/environments/`:

```
environment.development.ts   dipakai saat `ng serve`
environment.ts               dipakai saat build produksi
```

Build:

```bash
npx ng build --configuration production
```

Hasilnya di `dist/terra-nusa-teknologi-office-frontend/browser/`, disalin apa
adanya ke server. Tidak ada langkah lain — Nginx menyajikannya sebagai berkas
statis.

Build memakan memori besar, sering di atas 2 GB. Pada server kecil ia dapat
menjatuhkan proses lain; bangun di mesin sendiri lalu salin hasilnya.

---

## Susunan

```
pages/           satu folder per halaman, dimuat lewat lazy loading
components/      yang dipakai lintas halaman
services/        panggilan API, izin, pengaturan, panduan
helpers/         penyusun dokumen cetak dan perhitungan
directives/      perilaku yang menempel pada elemen
guards/          penjaga rute
pipes/           pemformat tampilan
constants/       daftar tetap: entitas audit, jenis dokumen
utils/           fungsi kecil tanpa ketergantungan
assets/i18n/     terjemahan tiga bahasa
assets/panduan/  panduan dalam aplikasi, markdown
```

---

## Keputusan yang tidak boleh dibalik tanpa berpikir

Masing-masing lahir dari kesalahan nyata.

**Dokumen cetak tetap berbahasa Indonesia.** Purchase order, slip gaji, dan
rekap Excel mengikuti bahasa dokumen resminya, bukan bahasa antarmuka. Karena
itu nama bulan punya dua sebutan: `key` untuk layar, `nama` untuk dokumen.
Menyamakannya membuat slip gaji tercetak "Periode January 2026".

**Klausul dokumen membaca `value`, bukan label.** Sehingga label boleh
diterjemahkan tanpa mengubah isi SPK yang ditandatangani vendor.

**Nama bahasa tidak diterjemahkan.** "Indonesia", "English", "中文" tetap dalam
bahasanya sendiri, supaya pengguna Mandarin dapat menemukannya di aplikasi
berbahasa Indonesia.

**Status disimpulkan, bukan disetel.** `isPaid` dihitung ulang dari nilai
dokumen dan pembayarannya — dua arah, sehingga pembayaran yang dibatalkan
mengembalikannya menjadi belum lunas.

**Slide toggle, bukan checkbox.** Banner, bukan hint kecil, untuk hal penting.

---

## Hal yang mudah salah

**Pratinjau harus memakai komponen yang sama dengan cetaknya.** Yang dilihat
sebelum terbit wajib sama dengan sesudahnya; pratinjau yang disusun terpisah
akan menyimpang tanpa ada yang menyadarinya.

**Adendum dan koreksi memakai layar yang sama, tetapi berbeda perilaku.**
Adendum menerbitkan dokumen baru berisi selisih — volumenya dikosongkan.
Koreksi menimpa dokumen yang belum pernah terbit — volumenya disalin apa
adanya. Satu penanda yang salah dibaca membuat dokumen terbit ketika
seharusnya dibetulkan.

**Nilai mungkin-kosong tidak boleh diikat ke input yang wajib berisi.**
`[entityId]="data?.id"` menghasilkan `number | undefined` dan ditolak Angular
saat membangun — tetapi hanya saat membangun. Typecheck biasa tidak melihat
templat sama sekali.

**Direktif atribut perlu modulnya juga.** `<span [matTooltip]>` tanpa
`MatTooltipModule` gagal dengan NG8002, dan itu tidak terlihat sampai
`ng build` dijalankan.

**Nama entity jejak audit harus sama persis dengan nama tabel di server.**
Bentuk jamak buatan sendiri membuat riwayatnya selalu kosong, tanpa galat.

---

## Purchase order

Enam belas varian: `A B C D F G H 511 5112 512 516 63 641 642 651 652`.

Semuanya berbagi pola: `buildPrintData()` menyusun data, `printPurchaseOrderX()`
mencetak. Semuanya punya tombol **Pratinjau** dan konfirmasi *"sudah membaca"*
sebelum penerbitan.

**PO-F menentukan jenis dokumen dari materialnya:** beton dan besi menjadi
PURCHASE ORDER; uji tekan silinder dan uji tarik besi menjadi SURAT PERINTAH
KERJA. Kedua jenis uji harus disebut di **setiap** tempat yang memutuskan ini
— formulir pembuatan dan cetak ulang dari daftar. Pernah hanya salah satu yang
diperiksa, dan dokumennya tercetak ulang dengan judul berbeda dari yang
ditandatangani vendor.

Dokumen berstatus draf dapat **diubah**; yang sudah disetujui hanya dapat
diadendum. Nomor revisinya bertambah setiap kali disimpan.

---

## i18n

Tiga bahasa di `src/assets/i18n/`. Ketiganya harus selaras — kunci yang ada di
satu bahasa tetapi tidak di bahasa lain menampilkan kunci mentahnya di layar,
tanpa galat.

Teks keras di dalam templat tidak diperkenankan. Yang dikecualikan hanya
dokumen cetak, yang memang selalu berbahasa Indonesia.

---

## Panduan dalam aplikasi

`src/assets/panduan/` berisi 22 topik dalam tiga bahasa. Tiap judul punya
jangkar id tetap:

```html
<a id="bagian-yang-sama-di-semua-jenis"></a>

## Bagian yang sama di semua jenis
```

Jangkar itu wajib. Tanpanya, id bagian dihitung dari slug judulnya — dan judul
berbeda di tiap bahasa, sehingga rujukan dari routing berhenti bekerja begitu
bahasanya diganti.

Rute menunjuk topik dan bagiannya lewat `data`:

```ts
data: { panduan: 'purchase-order', panduanBagian: 'tipe-a-jasa-pengiriman' }
```

---

## Tampilan

Warna aksen pengguna diteruskan ke token Material `--mat-*` — bukan `--mdc-*`,
awalan itu berubah sejak Material 20. Warna teks di atas aksen dihitung dari
luminansi WCAG.

Warna status memakai `--ok-*`, `--warn-*`, `--bad-*`, yang punya nilai
tersendiri untuk mode gelap. **Jangan mengarang nama variabel baru** —
`var(--nama-karangan, #fdecea)` jatuh ke nilai cadangannya, dan nilai cadangan
itu tetap terang di mode gelap sehingga tulisannya tidak terbaca.

Ukuran teks mengikuti `--app-text-scale`, yang dinaikkan sendiri pada layar
kecil dan dapat disetel pengguna lewat Pengaturan.

`box-sizing` **tidak** disetel global. Petak berkolom banyak karena itu
memerlukan `border-box` lokal dan `minmax(0, 1fr)`; tanpa keduanya, padding
tiap sel menambah lebar dan kolom terakhir terpotong.

---

## Yang belum beres

**Tampilan layar kecil.** Sebagian besar layar dibangun untuk desktop. Yang
paling terasa: dialog berlebar tetap, tabel berkolom banyak, dan navigasi
samping yang memakan dua pertiga layar ponsel.

**`pdfjs-dist` masih 3.11.** Naik ke 5.x menyentuh penampil PDF, rotasi,
anotasi, dan thumbnail lampiran sekaligus.

**`xlsx` sudah diganti `xlsx-js-style`,** tetapi `exceljs` masih menahan
`uuid` versi lama. Perbaikannya menurunkan `exceljs` satu versi mayor, jadi
ditunda.
