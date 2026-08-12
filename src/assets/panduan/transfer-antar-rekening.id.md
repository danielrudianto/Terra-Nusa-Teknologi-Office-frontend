# Transfer Antar Rekening

Mencatat perpindahan dana antar rekening milik perusahaan sendiri.

Menu ini khusus untuk uang yang pindah **dari rekening AKN ke rekening AKN
yang lain** — misalnya menarik dana dari rekening induk ke rekening
operasional proyek. Uang keluar ke pihak lain bukan di sini.

## Bukan untuk apa

Ini yang paling sering keliru. Kalau uangnya keluar ke pihak di luar
perusahaan, menunya bukan ini:

| Uang pindah ke | Menu yang benar |
|---|---|
| Rekening AKN yang lain | **Transfer Antar Rekening** (menu ini) |
| Pemasok atas sebuah invoice | Pembayaran, lewat Pembelian atau Beban |
| Karyawan yang menalangi | Reimbursement |
| Karyawan sebagai gaji | Slip Gaji |

Alasannya bukan sekadar kerapian. Transfer antar rekening **tidak menambah
beban dan tidak menambah pendapatan** — uangnya cuma pindah tempat. Kalau
pembayaran ke pemasok dicatat di sini, bebannya tidak pernah tercatat dan
laporan jadi salah.

## Mencatat transfer

Formulirnya satu halaman, lima isian, semuanya wajib.

| Isian | Catatan |
|---|---|
| Tanggal | Tanggal dana benar-benar berpindah |
| Dari rekening | Rekening AKN asal |
| Ke rekening | Rekening AKN tujuan |
| Jumlah | Minimal 1 |
| Deskripsi | Keterangan singkat maksud transfernya |

Deskripsi sudah terisi **"Setoran kas operasional"** sebagai awalan. Ganti
kalau maksudnya lain — deskripsi inilah yang dibaca saat menelusuri mutasi
belakangan, jadi biarkan apa adanya hanya kalau memang benar.

### Rekening asal dan tujuan tidak boleh sama

Rekening yang sudah dipilih sebagai asal otomatis diredupkan di daftar
tujuan. Kalau tetap dipaksakan, muncul pesan *"Rekening asal dan tujuan tidak
boleh sama."* dan datanya tidak bisa disimpan.

## Menghapus catatan

Tombol hapus ada di ujung kanan tiap baris, dan akan meminta konfirmasi.

**Hanya bisa dihapus pada hari yang sama.** Begitu tanggal transfernya sudah
lewat, tombolnya mati permanen. Ini disengaja: mutasi hari-hari sebelumnya
sudah masuk rekonsiliasi, dan menghapusnya belakangan membuat angka tidak
lagi cocok dengan rekening koran.

Jadi periksa dulu sebelum menyimpan. Kalau salah catat baru ketahuan besoknya,
hubungi bagian akunting — koreksinya tidak bisa lewat menu ini.

Penghapusan pun bukan berarti hilang. Catatannya tetap ada dengan tanda
**Dihapus**, lengkap dengan siapa yang menghapus dan kapan.

## Melihat rincian

Klik baris mana pun untuk membuka detailnya:

- **Jumlah Transfer** — nominal yang dipindahkan
- **Alur Transfer** — rekening asal dan tujuan
- **Detail** — tanggal transaksi dan deskripsi
- **Audit Trail** — siapa yang membuat, dan bila sudah dihapus, siapa yang
  menghapus beserta waktunya

Daftar bisa disaring dengan rentang tanggal lewat tanggal mulai dan tanggal
akhir.
