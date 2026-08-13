# Rekening Bank

Mendaftarkan rekening perusahaan dan menelusuri mutasinya.

Rekening yang terdaftar di sini yang muncul sebagai pilihan saat membuat
pembayaran, mencatat pemasukan, dan memindahkan dana antar rekening. Kalau
sebuah rekening tidak muncul di pilihan, biasanya karena belum didaftarkan.

## Mendaftarkan rekening

Tiga isian, semuanya wajib:

| Isian | Catatan |
|---|---|
| Nama Bank | Pilih dari daftar |
| Nama rekening | Nama pemilik sesuai buku tabungan |
| Nomor rekening | Angka saja, tanpa spasi atau tanda hubung |

Isi **nama rekening** persis seperti yang tertera di bank, bukan singkatan
internal. Nama itu ikut tercetak di dokumen pembayaran, dan bank menolak
transfer yang namanya tidak cocok.

Rekening di sini adalah **rekening perusahaan**. Rekening pemasok maupun
rekening karyawan penerima reimbursement tidak didaftarkan di sini — keduanya
diisi langsung di dokumennya masing-masing.

## Melihat mutasi

Menu titik tiga pada tiap baris berisi **Lihat mutasi**. Tampilannya
menampilkan per periode: tanggal, lawan transaksi, dokumen, jumlah, dan saldo
berjalan.

Mutasi ini **disusun dari dokumen yang tercatat di TerraBot**, bukan ditarik
dari bank. Isinya pembayaran keluar, pemasukan, dan transfer antar rekening
yang sudah dimasukkan ke sistem.

Karena itu, mutasi di sini **tidak akan sama persis dengan rekening koran**
selama masih ada dokumen yang belum dicatat. Selisih itu justru berguna: ia
menunjukkan transaksi mana yang belum masuk sistem.

## Mengunduh mutasi

Tombol **Unduh** pada layar mutasi meminta bulan dan tahun, lalu menghasilkan
berkas berisi transaksi periode itu beserta saldo berjalannya. Berguna saat
merekonsiliasi dengan rekening koran atau menyerahkan data ke konsultan.

## Menghapus rekening

Rekening yang sudah tidak dipakai sebaiknya dibiarkan, bukan dihapus, selama
masih ada dokumen lama yang menunjuknya. Dokumen pembayaran menyimpan nama dan
nomor rekening pada dirinya sendiri, tetapi penelusuran ke rekening induknya
akan terputus.

Hapus hanya rekening yang memang salah didaftarkan dan belum pernah dipakai.
