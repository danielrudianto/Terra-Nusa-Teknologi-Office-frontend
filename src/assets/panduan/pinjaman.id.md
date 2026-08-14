# Pinjaman

Mencatat utang perusahaan ke kreditur, dan melunasinya bertahap.

Menu ini untuk uang yang **masuk sebagai utang** — pinjaman bank, pinjaman dari
pemegang saham, atau fasilitas pembiayaan. Uang masuk yang bukan utang dicatat
lewat Pendapatan Lain atau Faktur Penjualan.

## Utang dan dana diterima itu dua angka berbeda

Ini yang paling sering keliru, dan formulirnya memang meminta keduanya.

| Isian | Artinya |
|---|---|
| **Utang** | Total yang harus dikembalikan ke kreditur |
| **Diterima** | Uang yang benar-benar masuk ke rekening perusahaan |

Keduanya sering tidak sama. Biaya provisi, administrasi, atau bunga di muka
biasanya dipotong langsung, sehingga pinjaman Rp 100 juta bisa cair Rp 97 juta.
Yang harus dilunasi tetap Rp 100 juta.

Isi **Diterima** sesuai angka di rekening koran, bukan angka di perjanjian.
Kalau disamakan dengan Utang padahal ada potongan, selisihnya tidak pernah
tercatat di mana pun.

## Mencatat pinjaman baru

Tiga bagian dalam satu halaman.

### Kreditur

| Isian | Wajib |
|---|---|
| Nama kreditur | Ya |
| Alamat kreditur | Ya |
| NPWP kreditur | Tidak |

### Detail pinjaman

Tanggal, deskripsi, lalu **Utang** dan **Diterima**. Deskripsi sebaiknya
menyebut dasar perjanjiannya, karena itu yang dicari saat menelusuri
belakangan.

### Rekening penerima

Rekening **perusahaan** tempat dana pinjaman masuk — bukan rekening kreditur.
Pilih banknya, lalu nama dan nomor rekeningnya.

## Mengubah setelah tersimpan

Menu **Ubah data** mengizinkan perbaikan pada data kreditur, deskripsi,
rekening, serta **nilai utang dan jumlah diterima**.

Nilai utang tidak bebas diubah: **tidak boleh turun di bawah jumlah yang sudah
dibayarkan**. Utang Rp 100 juta yang sudah dibayar Rp 80 juta lalu diubah
menjadi Rp 50 juta berarti pinjaman itu terbayar lebih — dan tidak ada tempat
di sistem yang mencatat kelebihannya, sehingga selisih Rp 30 juta menghilang
tanpa jejak. Karena itu perubahan semacam itu ditolak, lengkap dengan
penyebutan berapa yang sudah dibayar.

Keterangan di bawah kolom utang menampilkan jumlah yang sudah dibayarkan, jadi
batas bawahnya terlihat sebelum disimpan.

**Status lunas dihitung ulang setiap kali nilainya berubah.** Menurunkan utang
hingga sama dengan yang sudah dibayar menjadikan pinjaman itu lunas;
menaikkannya kembali membatalkan status itu. Tidak perlu menyetel status lunas
sendiri — dan memang tidak bisa, karena status itu kesimpulan dari angkanya,
bukan isian.

Tanggal pinjaman tetap terkunci.

Menu Ubah data hanya muncul untuk yang punya izin mengubah pinjaman.

## Mencatat pembayaran

Dari daftar, pilih **Buat pembayaran**. Isian: tanggal pembayaran (wajib),
rekening, dan jumlah.

Jumlahnya sudah terisi otomatis sebesar sisa yang belum dibayar, dan ada
tombol **Bayar penuh** untuk mengembalikannya ke angka itu. Kalau membayar
sebagian, ganti angkanya — tetapi tidak bisa melebihi sisa.

Menu ini mati untuk pinjaman yang sudah berstatus **Lunas**.

## Kenapa sisa utang tidak langsung berkurang

Pembayaran yang baru dicatat belum tentu langsung mengurangi sisa utang di
halaman rincian. Yang mengurangi hanya pembayaran yang **sudah disetujui**.

Alasannya: pembayaran yang masih menunggu persetujuan belum tentu jadi.
Memasukkannya ke pelunasan membuat utang terlihat lebih kecil daripada
kenyataannya — dan itu jenis kekeliruan yang tidak terlihat, karena angkanya
tetap tampak wajar.

Akibatnya ada satu selisih yang perlu diketahui:

- **Sisa utang** di halaman rincian dihitung dari pembayaran yang **sudah
  disetujui** saja.
- **Batas maksimal** di formulir pembayaran dihitung dari **seluruh**
  pembayaran yang belum dihapus, termasuk yang masih menunggu persetujuan.

Jadi bisa terjadi: sisa utang masih tertulis Rp 10 juta, tetapi formulir
menolak angka di atas Rp 4 juta — karena ada Rp 6 juta yang sudah diajukan dan
belum disetujui. Itu bukan kesalahan hitung; batas itu sengaja mencegah
pengajuan ganda atas tagihan yang sama.

## Melihat rincian

Klik baris mana pun untuk membuka rinciannya: nilai pinjaman, sisa utang,
persentase pelunasan, data kreditur, rekening, dan riwayat pembayaran.

Ada juga tombol salin untuk WhatsApp yang merangkum total utang, jumlah yang
sudah dibayar, sisa, dan statusnya — berguna saat menjawab pertanyaan kreditur
tanpa perlu membuka aplikasi bersama.
