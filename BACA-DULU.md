# Proyeksi kas 3 bulan di bawah kalender

**Frontend saja, tanpa perubahan skema, tanpa endpoint baru.** Keduanya sudah
ada: `dashboard/cash-position` dan `payment-plans`.

> Berkas i18n ikut (13 kunci baru × 3 bahasa). Gabungkan kalau ada perubahan
> i18n lain yang belum di-commit.

---

## Temuan yang menentukan bentuknya

`purchases` punya `dueDate`, jadi uang **keluar** bisa ditaruh di garis waktu.
Tetapi `sales_invoices` **tidak punya tanggal jatuh tempo maupun termin sama
sekali** — yang diketahui cuma berapa yang belum dibayar, bukan kapan masuknya.

Kalau pengeluaran diambil dari dokumen sementara pemasukan tidak bisa, garisnya
**pesimis palsu**: uang keluar lengkap, uang masuk hampir nol. Itu bukan
proyeksi, itu kecemasan yang digambar.

Jadi (pilihan Anda): **dua-duanya dari rencana kas**. Simetris dan jujur —
kalau satu arah tidak bisa ditempatkan di waktu, yang lain pun jangan.

Batasan itu **dicetak di kartunya**, bukan disimpan di panduan. Keterangan
yang cuma ada di panduan tidak pernah sampai ke orang yang sedang menatap
angkanya.

---

## Tiga keputusan di dalamnya

**1. Mulai dari KAS HARI INI, bukan saldo awal bulan yang sedang dibuka.**
Kartunya tidak ikut berpindah bulan bersama kalender di atasnya. Kalau ikut,
ia berhenti jadi proyeksi dan jadi kalender kedua — dan kalau titik mulainya
bukan uang yang benar-benar ada di rekening, seluruh garis bergeser sebanyak
selisih itu tanpa ada yang menyadarinya.

**2. PEKANAN, bukan bulanan.** Tiga bulan secara bulanan berarti **tiga titik**
— itu bukan garis, itu tiga angka yang dihubungkan. Pekanan memberi 13 titik:
cukup untuk melihat pekan mana kasnya menipis, dan itulah satu-satunya hal
yang dicari orang di sini.

**3. Rencana TERLEWAT masuk ke pekan pertama**, bukan dibuang dan bukan
ditaruh di tanggal aslinya yang sudah lewat. Uangnya belum bergerak,
kewajibannya belum hilang. Dibuang, ia membuat proyeksinya terbaca lebih sehat
daripada keadaannya — tepat pada bulan yang paling perlu diwaspadai.

## Yang ditonjolkan: saldo TERENDAH, bukan saldo akhir

Saldo di ujung proyeksi bisa kembali positif setelah tagihan cair, sementara
kasnya sempat minus di tengah jalan — dan yang minus di tengah itulah yang
harus dibereskan lebih dulu. Angka akhir yang sehat menyembunyikan persis
persoalan yang dicari orang di sini. Pekan pertama menembus nol juga disebut
sebagai kalimat, bukan cuma digambar.

## Hal-hal kecil yang disengaja

- Rekening yang dipilih di kalender **diteruskan** ke kartunya. Dua angka kas
  pada satu halaman yang berbeda karena saringan yang tidak sama adalah cara
  tercepat membuat keduanya berhenti dipercaya.
- Rencana di luar tiga bulan **disebut jumlahnya**. Dibuang tanpa keterangan,
  yang mengisinya akan mengira rencananya hilang — dan mengisinya lagi.
- Rutenya dijaga `bank:read`; yang tidak berhak tidak melihat kartunya sama
  sekali, dan kalendernya tetap utuh.
- Garis **lurus**, sama seperti arus kas proyek sesudah permintaan Anda.
- Permintaan rencananya mulai dari **Senin pekan ini**, bukan dari hari ini —
  kalau tidak, rencana yang jatuh Senin sementara hari ini Rabu tidak pernah
  terambil, dan aturan "terlewat masuk pekan pertama" tidak punya apa-apa
  untuk dipindahkan.

## Uji

9 spec, semuanya lolos. Dibuktikan menggigit:

```
rencana terlewat dibuang  → "TERLEWAT masuk ke pekan pertama" GAGAL
pekan kosong dilewati     → "tepat sebanyak pekan yang diminta" +
                             "saldo berjalan kumulatif" GAGAL
status tidak disaring     → "hanya status `rencana` yang dihitung" GAGAL
```

Build bersih, `terjemahcek` 0.
