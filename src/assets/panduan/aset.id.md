# Aset

Mendaftarkan barang milik perusahaan dan menelusuri penyusutannya.

Aset adalah barang bernilai yang dipakai bertahun-tahun — alat berat, kendaraan,
perkakas besar. Barang habis pakai dan perlengkapan kecil bukan aset; itu
dicatat sebagai Pembelian biasa.

## Kapan sesuatu dicatat sebagai aset

Patokannya bukan harga, melainkan **umur pakai**. Barang yang habis dalam satu
proyek adalah biaya. Barang yang masih dipakai proyek berikutnya adalah aset.

Aset biasanya dibeli lewat PO bertipe **5.1.1 (Asset purchase)**. Nomor PO itu
yang nanti dirujuk saat mendaftarkan asetnya di sini.

## Mendaftarkan aset

Semua isian wajib kecuali data penjualan.

| Isian | Catatan |
|---|---|
| Nama Aset | Sebutan yang dikenal di lapangan |
| Deskripsi | Penjelas agar tidak tertukar dengan unit sejenis |
| Merek | Contoh: XCMG, Komatsu |
| Tipe Aset | Aset tetap / Peralatan / Perkakas |
| Lokasi | Di mana barangnya berada |
| Penyusutan | Kelompok masa manfaat, lihat di bawah |
| Nama Purchase Order | PO yang mendasari pembelian |
| Tanggal beli | Tanggal perolehan |
| Nilai | Harga perolehan |

### Memilih kelompok penyusutan

Pilihannya mengikuti kelompok masa manfaat yang dipakai perpajakan:

| Pilihan | Untuk |
|---|---|
| 4 tahun (Kelompok 1) | Perkakas, peralatan kecil, perangkat kantor |
| 8 tahun (Kelompok 2) | Kendaraan, mebel, alat berat ringan |
| 16 tahun (Kelompok 3) | Mesin berat, konstruksi tertentu |
| 20 tahun (Kelompok 4) | Bangunan dan sejenisnya |

Pilihan ini bukan sekadar keterangan. Kelompok yang keliru membuat beban
penyusutan tiap tahun ikut keliru, dan itu terbawa sampai laporan keuangan.
Kalau ragu, tanyakan ke bagian akunting sebelum menyimpan — jangan menebak.

## Nilai dan penyusutan

**Nilai** yang diisi adalah harga perolehan, bukan nilai sekarang. Angka itu
tidak berubah seiring waktu; yang berubah adalah nilai bukunya, dan itu
dihitung terpisah di pembukuan.

Perlu diketahui: **TerraBot menyimpan kelompok penyusutannya, tetapi belum
menghitung beban penyusutan tiap periode.** Perhitungannya masih dilakukan di
sistem akunting. Jadi jangan memakai daftar aset di sini sebagai dasar nilai
buku.

## Aset yang sudah dijual

Bagian **Penjualan** di bawah formulir bersifat opsional. Isi **Nilai jual** dan
**Tanggal jual** ketika asetnya benar-benar sudah terjual.

Jangan menghapus aset yang sudah dijual. Riwayatnya masih diperlukan — untuk
menelusuri PO pembeliannya, dan untuk menghitung untung atau rugi
pelepasannya. Menandai penjualan sudah cukup.

## Melihat dan menelusuri

Klik baris mana pun untuk membuka rinciannya. Menu titik tiga berisi **Edit
aset** dan **Lihat purchase order** — yang terakhir membawa langsung ke PO
pembeliannya, berguna saat memeriksa harga perolehan terhadap dokumen asli.

Kotak pencarian mencari di nama, merek, tipe, dan nomor PO sekaligus.
