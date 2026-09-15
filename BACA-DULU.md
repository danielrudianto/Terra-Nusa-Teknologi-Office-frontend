# Arus kas, tab progress, dan nomor tender — FRONTEND

**Pasang zip backend tender dulu** (termasuk SQL-nya), lalu yang ini.

---

## 1. Arus kas: garis LURUS

`tension: 0`. Sempat melengkung, dan lengkungannya menimbulkan masalahnya
sendiri — chart.js menarik kurva **melewati** titik datanya, sehingga pada
bulan tanpa penerimaan garis "kas masuk" tercelup di bawah nol dan menggambar
penerimaan negatif yang tidak pernah ada. Saya sempat menambalnya dengan
`cubicInterpolationMode: 'monotone'`.

**Garis lurus membuat seluruh persoalan itu tidak ada**: segmen lurus tidak
dapat melampaui kedua ujungnya. Dan memang lebih jujur untuk data bulanan —
tidak ada yang tahu apa yang terjadi di antara dua bulan, dan kurva yang halus
menyiratkan perjalanan yang tidak pernah diukur. Usul Anda lebih baik daripada
tambalan saya.

## 2. Jendela otomatis: ~10 titik di layar Anda

Dulu **~64px per titik**, dengan alasan "di bawah itu label bulan bertumpuk".
Itu benar sebagai **batas bawah**, tetapi salah dipakai sebagai ukuran yang
nyaman: ia menjejalkan sebanyak mungkin bulan sampai tepat sebelum labelnya
rusak, dan hasilnya padat tanpa ada yang memintanya.

Sekarang **~160px per titik**, ditetapkan dari layar nyata: pada 1920×1200
wadah grafiknya sekitar 1590px (layar dikurangi menu samping dan padding), dan
1590/160 ≈ **10**. Dibatasi 5..20. Presetnya jadi `Otomatis · 6 · 10 · 18`.

> Kalau jumlahnya masih terasa aneh, sebutkan angkanya — `lebarWadahTerukur`
> menyimpan lebar yang benar-benar terbaca, jadi kita bisa langsung tahu
> apakah yang meleset pengukurannya atau ambangnya.

## 3. Tab progress: dua hal yang Anda tunjuk

**`%` yang hilang pada SELISIH.** Dua sel di sebelahnya berbunyi "6,35%" dan
"8,9%"; sel ini selisih keduanya, jadi satuannya sama. Tanpa `%`, "-2,6" di
antara dua persen terbaca sebagai entah apa — dan pembacanya mengira
selisihnya kecil sekali.

**Tanggal mentah.** `2026-09-12` → `12 Sep 2026`, di KPI dan di daftar
riwayatnya. `YYYY-MM-DD` bentuk penyimpanan, bukan bentuk baca.

Diurai **sebagai teks**, bukan lewat `new Date(...)`: `new Date('2026-09-12')`
adalah tengah malam UTC dan di zona barat UTC mundur jadi 11 September.
Tanggal opname yang meleset sehari tidak akan pernah dicurigai — dan kekeliruan
yang sama sudah dua kali muncul di sistem ini (kurva kalender, pengemberan
bulan arus kas).

## 4. Nomor tender tampil

Daftar dan layar tender memakai `documentNumber`, dengan `number` sebagai
jaring pengaman — kalau SQL-nya belum dijalankan, jatuh ke nomor lama jauh
lebih baik daripada "—" di seluruh daftar, yang terbaca seperti data hilang.

---

## Uji

**55 spec lolos** pada halaman proyek (dari 52). Empat uji baru: garis lurus
(`tension: 0` dan tidak ada `cubicInterpolationMode`), tanggal terbaca,
jendela otomatis pada beberapa lebar, dan penjepitannya di kedua ujung.

> Satu uji saya sempat merah dan itu menemukan cacat sungguhan:
> `tanggalBaca('bukan tanggal')` mengembalikan `'bukan tang'` — saya memotong
> 10 huruf SEBELUM mencocokkan pola. Nilai yang bukan tanggal jadi
> dikembalikan terpenggal, menambah keanehan kedua di atas yang pertama.
