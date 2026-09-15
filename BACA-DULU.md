# Tiga hal: transisi halaman, dialog hapus, saringan reimbursement

**Frontend saja, tanpa perubahan skema.** Ekstrak, commit, deploy.

---

## 1. Transisi halaman — dan kenapa terasa kaku

Ternyata bukan karena tidak ada. **Sudah ada** — tetapi hanya di sub-layout
**Data Master**, ditulis di dalam komponennya. Kerangka utama, yang dipakai
SETIAP perpindahan dari menu samping, tidak punya apa-apa.

Jadi berpindah di dalam Data Master ada gerakannya, sementara Tender → Kalender
berganti begitu saja. **Ketidakkonsistenan itu yang membuatnya terasa kaku** —
lebih kaku daripada kalau memang tidak ada di mana-mana, karena mata sudah
tahu aplikasi ini bisa bergerak.

Definisinya dipindah ke `src/app/animations/transisi-rute.ts`, dipakai
keduanya. Dua definisi yang "mirip" akan berbeda dalam sebulan, dan bedanya
terasa tanpa dapat ditunjuk.

### Bentuknya: dua ketukan

| | |
|---|---|
| **Ketukan 1** | isi halaman naik 14px sambil muncul, skala 0.985 → 1 |
| **Ketukan 2** | judul halaman menyusul **70ms** kemudian |

300ms, `cubic-bezier(0.22, 1, 0.36, 1)` — melambat panjang di ujung, berhenti
lembut alih-alih mendadak.

Ketukan kedua itu yang membuatnya terbaca sebagai sesuatu yang **dirancang**,
bukan sekadar fade. Satu gerakan serentak selalu terasa seperti tirai; gerakan
bertahap terasa seperti halaman yang menyusun dirinya.

> **Filmstrip terlampir** — 5 bingkai pada 0/60/120/200/300ms, dibekukan dari
> animasi sungguhan di Chromium, bukan ilustrasi.
>
> **Satu hal yang saya lihat di situ dan mungkin Anda tidak suka:** pada 60ms,
> angka-angka KPI sudah terbaca sementara JUDULnya belum muncul sama sekali.
> Jadi mata sempat mendarat di angka sebelum tahu ini halaman apa. Bisa
> dibalik (judul dulu, isi menyusul) atau jedanya dipangkas jadi ~40ms —
> keduanya satu baris. Saya tidak memilih sendiri karena ini bagian yang
> memang soal selera.

### Yang sengaja TIDAK dilakukan

Tidak ada `:leave`, tidak ada `position: absolute`. Halaman lama tidak ditahan
untuk beranimasi keluar — menahannya berarti dua halaman di DOM sekaligus, dan
pada halaman berisi grafik dan tabel panjang itu dua kali kerja render tepat
pada saat paling sibuk. `position: absolute` untuk menumpuknya juga merusak
tinggi halaman dan posisi gulir.

Hanya `opacity` dan `transform` yang digerakkan — keduanya ditangani
compositor, jadi tidak memicu layout ulang.

### `prefers-reduced-motion` dihormati

Angular tidak membacanya sendiri. Bagi yang menyalakannya di sistem
operasinya, gerakan halaman bukan soal selera — gerakan besar dapat memicu
pusing dan mual. Durasinya jadi 0.

### Dua animasi yang dulu akan bertabrakan

Membuka Data Master menjalankan animasi kerangka utama **dan** animasi outlet
di dalam Master. Keduanya memudar dari nol, jadi opasitasnya **berkalian** dan
isinya sampai lebih lambat daripada yang dimaksudkan keduanya. Tidak rusak —
hanya terasa berat, dan "terasa berat" tidak pernah muncul di keluaran uji
mana pun.

Versi bersarang karena itu tidak menganimasikan kemunculan pertamanya.
Berpindah DI DALAM Master tetap beranimasi.

### Penjaga

`scripts/pemeriksa/transisicek.py`. Animasi Angular yang salah pasang **tidak
melempar galat** — ia hanya diam, dan "diam" persis sama tampaknya dengan
"memang belum dibuat". Empat cara kehilangannya, semuanya tanpa pesan:

```
trigger dipindah ke <router-outlet> → "halaman disisipkan sebagai SAUDARA
                                       outlet, bukan anaknya"
kunci dari routeConfig.path         → "beberapa rute ber-path: '' — kuncinya
                                       tidak berubah dan animasinya tidak menyala"
`optional: true` dicabut            → "satu halaman tanpa elemen itu akan
                                       MELEMPAR dan menjatuhkan animasinya"
`void => *` bersarang dihidupkan    → "DUA animasi sekaligus, opasitasnya
                                       berkalian, halamannya terasa berat"
```

> **Penjaganya sendiri sempat bocor.** Regex `query\(([^)]*)\)` berhenti di `)`
> pertama, padahal `query()` berisi `style({ ... })` — jadi `optional: true`
> di ekornya tidak pernah terlihat dan cek itu hijau apa pun isinya. Ketahuan
> waktu saya merusaknya sengaja, bukan waktu membacanya ulang. Sudah diganti
> pemindai kurung berimbang.

---

## 2. Dialog hapus — ruang kosong di kanan

Komponennya memaksakan lebarnya sendiri:

```scss
.dc { width: min(380px, 92vw); }   /* angka mati */
```

Pemanggilnya membuka dialog dengan `width: '440px'` atau `'460px'`. Jadi
kartunya 380px di dalam panel 460px — 80px sisa. Dan karena ini blok tanpa
margin otomatis, **seluruh sisanya jatuh ke satu sisi**: ruang kosong di
kanan, persis yang Anda lihat.

Tidak ada galat, dan pada pemanggil yang kebetulan tidak menyetel lebar
tampilannya benar — sehingga cacatnya cuma muncul di sebagian dialog.

Sekarang `width: 100%` + `max-width` + `margin-inline: auto`: mengisi panel
berapa pun lebarnya, tetap menjaga lebar baca, dan kalau panelnya memang lebih
lebar, sisanya terbagi rata alih-alih menumpuk di satu sisi.

Berlaku untuk **semua** dialog konfirmasi, bukan cuma slip gaji.

---

## 3. Reimbursement — bawaan tanpa yang ditolak

Bawaannya sekarang **Disetujui + Menunggu**. Chip "Ditolak" tetap ada dan
tinggal ditekan; bedanya cuma pada apa yang muncul tanpa diminta.

Yang ditolak tidak menuntut tindakan apa pun — ia sudah selesai, dan selesainya
dengan tidak terjadi. Menampilkannya secara bawaan membuat daftar yang dibuka
untuk *mengerjakan* sesuatu berisi baris yang justru tidak dapat dikerjakan,
dan pada bulan yang ramai baris itulah yang paling banyak.

**Bawaan tidak menimpa pilihan Anda.** Begitu satu chip disentuh, URL memuat
seluruh kunci — jadi hadirnya satu kunci sudah berarti pilihannya disengaja,
termasuk pilihan mengosongkan semuanya. Tanpa aturan ini, chip yang baru
dimatikan akan menyala lagi, dan halamannya terbaca sebagai menolak diatur.

`isPaid`/`isUnpaid` sengaja dibiarkan mati — itu saringan **pembayaran**, dan
server memperlakukannya sebagai kelompok OR tersendiri. Menyalakannya ikut akan
mempersempit daftarnya dua kali.

### Bonus: satu spec rusak diperbaiki

`reimbursement-list.component.spec.ts` masih scaffold `ng generate`:
`declarations: [KomponenStandalone]` — yang **melempar**. Spec itu sudah merah
sejak lama tanpa pernah menguji apa pun. Diganti jadi `imports` + tiruan
seperlunya, dan diisi 4 uji untuk saringan bawaannya. Dibuktikan menggigit:

```
bawaan dikembalikan semua false        → "tanpa parameter URL" GAGAL
bawaan dipaksa walau URL sudah menyebut → "mengosongkan semua chip" + "URL
                                          MENANG atas bawaan" GAGAL
```

> Ini satu dari tumpukan spec scaffold yang rusak dengan galat yang sama. Yang
> lain belum saya sentuh — bilang kalau mau disapu sekalian.

---

## Uji

Build bersih. `transisicek`, `terjemahcek`, `aruskascek`, `snavlencanacek`,
`kalendersaldocek` — semuanya 0. Spec reimbursement 4 lolos.
