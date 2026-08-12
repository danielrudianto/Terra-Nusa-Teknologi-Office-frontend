# Pembelian

Panduan mencatat faktur pembelian dari pemasok.

Menu **Pembelian** dipakai untuk mencatat tagihan yang **sudah diterima** dari
pemasok — bukan untuk memesan barang. Pemesanan dilakukan lewat Purchase Order,
dan nomor PO itulah yang nanti dirujuk di sini.

## Sebelum mulai

Siapkan dulu:

- **Nomor PO** yang jadi dasar pembelian
- **Invoice** dari pemasok (wajib, tidak bisa dilewat)
- **Salinan PO atau kontrak** (wajib)
- Faktur pajak dan kwitansi, kalau ada
- Rekening tujuan pembayaran pemasok

Pemasok juga harus sudah terdaftar. Kalau belum ada, daftarkan lewat menu
Pemasok dulu.

## Alur pengisian

Formulirnya empat langkah berurutan. Tombol **Berikutnya** baru aktif setelah
langkah yang sedang dibuka lengkap, jadi tidak bisa melompat ke depan.

**Data Meta → Data Nilai → Data Lampiran → Data Pembayaran**

## Langkah 1: Data Meta

Identitas dokumen dan kaitannya dengan PO.

| Isian | Wajib | Catatan |
|---|---|---|
| Nama invoice | Ya | Nomor invoice dari pemasok |
| Nama kwitansi | Tidak | Isi kalau kwitansinya terpisah |
| Nama Faktur Pajak | Tidak | Maksimal 17 karakter |
| Pemasok | Ya | Pilih dari daftar |
| Tanggal | Ya | Tanggal invoice |
| Jatuh tempo | Ya | Dipakai penyaring Jatuh Tempo di daftar |
| Nama Purchase Order | Ya | Harus sesuai format, lihat di bawah |
| Proyek | Ya | **Terisi otomatis** dari nomor PO |
| Tipe dokumen | Ya | Pembelian barang / Pembelian lain |
| Status Dokumen | Ya | Siap / Menunggu |

### Format nomor PO

Nomor PO tidak bisa diketik bebas — polanya dikunci:

```
0451-PO-BKS01-6.4.1
 |    |    |     +-- tipe biaya
 |    |    +-------- kode proyek (4-5 huruf/angka kapital)
 |    +------------- PO, SPK, atau PKS
 +------------------ nomor urut (3-4 angka)
```

Tipe biaya yang diterima: `A` `B` `C` `D` `E` `F` `G` `H1` `H2` `5.1.1` `5.1.2`
`5.1.6` `5.1.7` `5.1.12` `6.3.1` `6.3.2` `6.4.1` `6.4.2` `6.5.1`

Begitu nomornya benar, **Proyek dan tipe biaya terisi sendiri** dari potongan
nomor itu. Kalau keduanya tetap kosong setelah diketik, berarti formatnya belum
cocok — periksa lagi jumlah angka di depan atau kode proyeknya.

### Internal purchase

Sakelar di bagian bawah. Aktifkan untuk pembelian internal, yaitu yang bukan
untuk proyek klien. Hanya pembelian bertanda internal yang nanti bisa diubah
lewat menu **Ubah internal** di daftar.

## Langkah 2: Data Nilai

| Isian | Catatan |
|---|---|
| DPP | Dasar Pengenaan Pajak, minimal 1 |
| PPN (%) | 0 sampai 11 |
| PPN (Rp.) | Dihitung otomatis dari DPP |
| PBBKB | Isi 0 kalau tidak ada |
| Kode PPh, Nama Objek PPh, Persentase PPh | Untuk pembelian yang dipotong PPh |
| Nilai lain | Biaya pengiriman, pengemasan, atau administrasi |
| Catatan nilai lain | Jelaskan nilai lain itu untuk apa |

Perhitungannya:

**Total = DPP + PPN + PBBKB + Nilai lain**

**Yang dibayar ke pemasok = Total - PPh**

PPh dipotong dari nilai yang ditransfer, jadi angka di Langkah 4 memang lebih
kecil dari Total di sini. Itu normal, bukan salah hitung.

## Langkah 3: Data Lampiran

Centang dokumen yang benar-benar sudah dipegang. **Dua yang wajib:**

- Invoice
- Salinan Purchase Order / Kontrak

Sisanya opsional: Kwitansi, Faktur pajak, Bukti Pembayaran.

Jangan mencentang dokumen yang belum diterima. Kalau ada yang masih kurang,
lebih baik simpan dengan status **Menunggu** — lihat bagian berikutnya.

## Langkah 4: Data Pembayaran

Rekening tujuan pemasok: nama bank, nama rekening, nomor rekening, dan metode
pembayaran (Transfer Bank atau Virtual Account).

Dua sakelar di bagian bawah:

- **Pembayaran Proxy** — kalau pembayaran ditalangi lewat pihak lain
- **Buat slip pembayaran** — langsung membuat slip pembayaran begitu pembelian
  tersimpan, tanpa perlu masuk lagi lewat menu Pembayaran

## Status dokumen

Ada dua, dan pilihannya menentukan apa yang bisa dilakukan setelahnya.

**Siap** — berkas lengkap, tidak ada yang kurang.

**Menunggu** — masih ada dokumen atau data yang belum masuk. Kalau memilih ini,
kolom keterangan **wajib diisi 10-100 karakter**: tulis apa yang masih kurang,
karena itu yang dibaca orang lain saat menyusulkan berkasnya.

Bedanya di kemudian hari:

- Pembelian berstatus **Menunggu** bisa dilengkapi lewat menu **Ubah status**
  di daftar.
- Pembelian berstatus **Siap** tidak bisa. Menu Ubah status akan mati, dan
  membuka halamannya langsung pun akan ditolak dengan pesan bahwa datanya
  sudah lengkap.

Jadi jangan menandai **Siap** sebelum yakin. Lebih aman memakai Menunggu dan
melengkapi belakangan daripada terlanjur Siap.

## Menyaring daftar pembelian

Chip penyaring di atas tabel bisa dipilih lebih dari satu:

**Jatuh Tempo** - **Belum Jatuh Tempo** - **Lunas** - **Belum Lunas** -
**Draft** - **Siap**

Kotak pencarian mencari di nomor faktur, kwitansi, PO, nama pemasok, dan faktur
pajak sekaligus.

Klik baris mana pun untuk melihat rinciannya. Menu titik tiga di ujung kanan
berisi Ubah status, pembuatan pembayaran, dan Ubah internal.

## Kalau tombolnya tidak ada

Kalau menu yang disebut di panduan ini tidak terlihat, kemungkinan besar memang
belum termasuk hak akses Anda - bukan sistemnya rusak.

Contohnya: menu pembuatan pembayaran hanya muncul untuk yang punya akses
Pembayaran Keluar, dan **Ubah internal** hanya untuk yang punya izin mengubah
data pembelian.

Butuh akses tambahan, hubungi admin sistem. Jangan memakai akun orang lain -
setiap perubahan tercatat di riwayat aktivitas atas nama pemilik akun.
