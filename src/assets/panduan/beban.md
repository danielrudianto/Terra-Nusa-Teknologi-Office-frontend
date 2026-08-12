# Beban

Mencatat pengeluaran yang bukan pembelian barang untuk proyek.

Beban dipakai untuk biaya operasional: sewa, utilitas, bahan bakar, gaji-terkait,
denda, biaya bank, dan sejenisnya. Kalau yang dibeli barang untuk proyek dengan
nomor PO, itu masuk **Pembelian**, bukan di sini.

## Alur pengisian

Tiga langkah berurutan, lebih ringkas daripada Pembelian karena beban tidak
punya lampiran wajib.

**Meta Data → Data Nilai → Data Pembayaran**

## Langkah 1: Meta Data

| Isian | Wajib | Catatan |
|---|---|---|
| Nama invoice | Tidak | Isi kalau ada invoice resmi |
| Nama kwitansi | Tidak | Isi kalau buktinya kwitansi |
| Deskripsi | Ya | Jelaskan bebannya untuk apa |
| Tipe beban | Ya | Menentukan pos akuntansinya |
| Lawan transaksi | Tidak | Pihak yang menerima pembayaran |
| Tanggal | Ya | Terisi tanggal hari ini |
| Jatuh tempo | Ya | Terisi tanggal hari ini |

Nama invoice dan kwitansi dua-duanya opsional, tapi jangan dikosongkan
dua-duanya kalau memang ada buktinya — nomor itu yang dicari orang lewat
kotak pencarian di daftar.

### Memilih tipe beban

Tipe beban menentukan beban ini masuk pos apa di pembukuan, jadi salah pilih
akan terbawa sampai laporan. Pilihannya antara lain:

Biaya administrasi · Biaya iklan · Perawatan aset · Pembelian aset ·
Biaya karyawan · Sewa peralatan · Bahan bakar · Biaya kesehatan · Bunga ·
Biaya logistik · Denda · Biaya sosial & kemasyarakatan · Sewa dibayar di muka ·
Utilitas · Perangkat lunak · Pembulatan · Transportasi · Media sosial ·
Biaya rekrutmen · Biaya pelatihan · Tenaga kerja · Material · Lainnya

Hindari **Lainnya** kalau ada tipe yang lebih tepat. Beban yang menumpuk di
Lainnya membuat laporan tidak bisa dibaca.

## Langkah 2: Data Nilai

| Isian | Catatan |
|---|---|
| DPP | Wajib, minimal 0,01 |
| PBBKB | Isi 0 kalau tidak ada |
| Kode PPh, Nama Objek PPh, Persentase PPh | Untuk beban yang dipotong PPh |
| Total | Dihitung otomatis |

Kalau bebannya dipotong PPh, nilai yang ditransfer akan lebih kecil daripada
Total — sama seperti di Pembelian.

## Langkah 3: Data Pembayaran

Rekening tujuan: nama bank, nama rekening, nomor rekening, dan metode
pembayaran (Transfer bank, Virtual Account, atau Cek).

Sakelar **Buat slip pembayaran** langsung membuat slip begitu beban tersimpan,
tanpa perlu masuk lagi lewat menu Pembayaran.

## Setelah tersimpan

Dari daftar Beban, klik baris mana pun untuk melihat rinciannya — rincian
nilai, riwayat pembayaran, dan rekening tujuan.

Menu titik tiga di ujung kanan berisi **Lihat beban** dan **Buat pembayaran**.
Pembuatan pembayaran hanya muncul untuk yang punya akses Pembayaran Keluar.

Daftar bisa disaring dengan rentang tanggal, dan kotak pencarian mencari di
nomor invoice, kwitansi, PO, lawan transaksi, dan faktur pajak sekaligus.
