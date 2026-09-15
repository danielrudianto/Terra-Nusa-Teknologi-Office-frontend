# Draf tender jadi BERARTI — FRONTEND

**Pasang zip backend dulu.** Tanpa itu, tombolnya hilang tetapi servernya
masih menerima penawaran atas draf.

> Berkas i18n ikut (3 kunci baru × 3 bahasa). Gabungkan kalau ada perubahan
> i18n lain yang belum di-commit.
>
> `tender-list.component.html` sudah termasuk tampilan nomor dokumen dari zip
> sebelumnya.

---

## 1. Tombol catat penawaran ditahan selama draf

Memakai `dapatMenerimaPenawaran`, **bukan** `dapatDisunting` — dua getter
terpisah, sengaja. Servernya menolak dengan 409; ini cuma supaya tombolnya
tidak menawarkan sesuatu yang pasti gagal. Menyembunyikan tombol bukan
pengamanan.

## 2. Spanduk yang menjelaskan sebabnya

Ikon + blok teks, di tempat yang sama dengan tombol yang hilang. Tanpa itu,
yang membuka tender melihat bagian perbandingan tanpa satu pun cara mengisinya
dan tidak ada apa pun di layar yang menyebut sebabnya.

> **Hapus slip gaji?** Bukan — kalimatnya menyebut sebab DAN tindakan
> lanjutannya: daftar permintaannya masih dapat berubah, setujui & sebarkan
> dulu, perlu level 3.

Warna **keterangan**, bukan peringatan: tidak ada yang salah dan tidak ada
yang rusak — tendernya memang belum sampai tahap itu. Memakai warna peringatan
untuk keadaan normal membuat peringatan yang sungguhan berhenti dibaca.

## 3. Daftar membuka "Aktif" = draf + berjalan

Chip baru, dan ini yang terpilih saat halaman dibuka. Dulu `berjalan` saja —
dan itu menyembunyikan justru yang paling mudah terlupakan. Draf yang tidak
disetujui berarti pemasok tidak pernah diminta harga, **tanpa satu pun galat**,
karena secara sistem tidak ada yang gagal.

Chip `Semua / Draf / Berjalan / Selesai / Batal` tetap ada.

## 4. Lencana tender di menu samping

Jumlah draf yang menunggu disetujui, muncul di menu Tender. Mengikuti aturan
lencana yang sudah ada: hanya untuk yang berwenang, dan bisa nol.

---

Build bersih, `terjemahcek` 0.
