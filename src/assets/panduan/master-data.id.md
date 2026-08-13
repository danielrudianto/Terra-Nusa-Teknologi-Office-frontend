# Master Data

Data acuan yang dipakai berulang di seluruh dokumen.

Master Data adalah sumber tunggal untuk pemasok, klien, karyawan, barang, dan
alat. Semua dokumen memilih dari sini, bukan mengetik ulang — sehingga satu
perbaikan di sini berlaku ke mana-mana.

Karena dipakai bersama, kekeliruan di sini menyebar. Nama pemasok yang salah
ketik akan muncul di setiap PO, pembelian, dan laporan yang menyebutnya.

## Sebelum menambah data baru

**Cari dulu.** Ini aturan terpenting di seluruh menu ini.

Entri kembar adalah masalah paling sering di data master, dan akibatnya tidak
langsung terlihat. "PT Fuji Bolt" dan "PT. Fuji Bolt Indonesia" akan terhitung
sebagai dua pemasok berbeda di setiap laporan, dan riwayat transaksinya
terpecah dua tanpa ada yang tahu.

Kotak pencarian di tiap sub-menu mencari lintas kolom. Luangkan sepuluh detik
untuk memastikan datanya memang belum ada.

## Pemasok

Siapa pun yang menagih ke perusahaan: badan usaha maupun perorangan.

| Isian | Catatan |
|---|---|
| Awalan | PT, CV, UD, Pribadi, dan seterusnya |
| Nama | Tanpa awalan; awalan diisi terpisah |
| Alamat, Kota, Provinsi | Ikut tercetak di dokumen PO |
| NPWP | Diperlukan bila dipotong PPh |
| Telepon, Email | Untuk dihubungi |
| Barang yang dijual | Membantu pencarian saat membuat PO |
| Area layanan | Wilayah jangkauannya |

Isi **awalan** di kolomnya sendiri, jangan disatukan ke nama. Sistem
menyusunnya kembali saat ditampilkan, dan bila awalan ikut diketik di nama,
hasilnya menjadi "PT PT Fuji Bolt".

## Klien

Pihak yang ditagih perusahaan. Isiannya serupa pemasok, tanpa barang dan area
layanan.

**NPWP klien wajib diisi** untuk klien yang ditagih dengan faktur pajak. Tanpa
itu, faktur pajaknya tidak bisa diterbitkan dan penagihannya tertahan.

## Karyawan

Data orang yang menerima slip gaji.

| Isian | Catatan |
|---|---|
| Nama, NIK | NIK dipakai di slip gaji |
| Tanggal lahir | |
| Jabatan, Departemen | Ikut tercetak di slip |
| Kategori pajak | TK/0 sampai K/3, menentukan PTKP |
| Tanggal masuk | |
| Alamat, Telepon, Email | |

**Kategori pajak** di sini yang terbawa ke slip gaji dan menentukan PPh 21.
Kategori mengikuti keadaan karyawan pada awal tahun pajak, bukan hari ini.

## Item

Katalog barang untuk purchase order. Dipakai oleh jenis PO yang memilih barang
dari daftar — C, F, G, 5.1.1, dan 5.1.6.

Ada **Import CSV** untuk memasukkan banyak barang sekaligus. Periksa hasilnya
setelah impor: baris yang formatnya menyimpang bisa masuk sebagai item baru
alih-alih memperbarui yang ada.

## Peralatan

Katalog alat berat untuk PO sewa alat (tipe B): nama, kategori, kapasitas, dan
merek.

Ini katalog **jenis alat untuk disewa**, berbeda dari menu **Aset** yang
mencatat unit milik perusahaan sendiri. Alat sewaan tidak didaftarkan sebagai
aset.

## Lawan Transaksi

Pihak penerima pembayaran pada menu **Beban** — misalnya PLN, kantor pajak,
atau pemilik gedung. Dipisahkan dari pemasok karena tidak menerbitkan PO dan
tidak memasok barang.

## Menghapus data master

Jangan hapus data yang sudah pernah dipakai dokumen. Dokumen lama akan
kehilangan rujukannya, dan laporan yang mengelompokkan menurut pemasok atau
karyawan menjadi tidak lengkap.

Hapus hanya entri yang salah dibuat dan belum pernah dipakai. Untuk pemasok
yang bermasalah, tersedia penandaan daftar hitam — lebih baik daripada
menghapus, karena riwayatnya tetap utuh.
