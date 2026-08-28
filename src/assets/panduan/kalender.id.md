# Kalender Pembayaran

Melihat jadwal pembayaran per hari, memastikan saldo cukup, lalu menyetujui
sekaligus.

Kalender menjawab pertanyaan yang sulit dijawab dari daftar biasa: **hari mana
uangnya berat, dan apakah saldo rekening cukup untuk membayar semuanya.**

## Tampilan bulanan

Tiap tanggal menampilkan tiga angka: **Pengeluaran**, **Pemasukan**, dan
**Saldo**. Berguna untuk melihat hari yang menumpuk sebelum menjanjikan
tanggal bayar ke pemasok.

Klik satu tanggal untuk membuka rincian harinya.

## Rincian harian

Di sini pembayaran hari itu dikelompokkan per rekening bank. Pilih rekening di
sisi kiri, lalu daftar pembayarannya muncul di kanan.

Tiap pembayaran bisa dicentang. Yang tercentang dijumlahkan di **Total Jumlah**,
dan bisa disetujui atau ditolak sekaligus.

### Saldo awal, saldo akhir, dan kekurangan

Bagian saldo menunjukkan:

| Baris | Artinya |
|---|---|
| Saldo awal | Saldo rekening sebelum pembayaran hari itu |
| Est. biaya admin | Perkiraan biaya transfer |
| Saldo akhir | Sisa setelah pembayaran yang dipilih dan biayanya |
| Kurang | Muncul bila saldo tidak mencukupi |

**Kalau muncul "Kurang", jangan disetujui.** Transfer yang ditolak bank karena
saldo tidak cukup tetap tercatat sebagai disetujui di sistem, sementara uangnya
tidak berpindah — dan selisih itu baru ketahuan saat rekonsiliasi.

Kurangi pilihannya, atau pindahkan sebagian ke tanggal lain lebih dulu.

### Estimasi biaya transfer

Banner di atas daftar memberi tahu berapa transfer yang keluar ke bank lain dan
berapa biayanya per transaksi. Transfer sesama bank gratis.

Angkanya **estimasi**, bukan biaya sebenarnya. Kalau ada transfer yang bank
tujuannya belum terisi, sistem menganggapnya kena biaya — lebih baik
memperkirakan lebih daripada kurang, karena yang berbahaya adalah saldo yang
ternyata tidak cukup.

Banner ini juga **mengingatkan** untuk mencatat biaya adminnya: begitu ada
transfer antar-bank, jangan lupa mencatat beban administrasinya lewat tombol
**Tambah beban administrasi** di menu Beban — kalau tidak, biaya itu tidak
pernah masuk pembukuan.

## Memindahkan tanggal bayar

Menu **Pindah tanggal bayar** menggeser jatuh tempo sebuah pembayaran ke
tanggal lain. Gunakan ini, bukan menolak lalu membuat ulang — dokumen asalnya
tetap sama dan riwayatnya tidak terputus.

## Menyetujui sekaligus

Persetujuan borongan meminta centang pernyataan sebelum tombolnya aktif. Itu
disengaja: menyetujui sepuluh pembayaran sekaligus sama beratnya dengan
menyetujui satu per satu, dan lebih mudah terlewat.

Sebelum menyetujui, pastikan tiga hal:

1. Rekeningnya benar — pembayaran dikelompokkan per rekening, dan mudah
   tertukar bila punya beberapa rekening di bank yang sama
2. Saldo mencukupi, tidak ada tanda "Kurang"
3. Yang tercentang memang yang dimaksud

Penolakan **tidak dapat dibatalkan**. Pembayaran yang terlanjur ditolak harus
dibuat ulang dari dokumen asalnya.

## Agenda: ulang tahun dan pengingat

Berbeda dari kalender pembayaran, **Agenda** berisi catatan pribadi dan ulang
tahun rekan. Tidak ada uang di sana.

Kartu Agenda di Dashboard hanya menampilkan tujuh hari ke depan. Tombol
kalender di sudut kartu membuka tampilan bulanan penuh — tanggal berapa ada
apa, dan bulan depan seperti apa.

Klik satu tanggal untuk melihat rinciannya, dan tombol **Tambah di tanggal
ini** membuat pengingat dengan tanggalnya sudah terisi.

Pengingat bisa diklik untuk diubah. Ulang tahun tidak bisa — datanya berasal
dari Master Data Karyawan, jadi perbaikannya di sana.

**Ulang tahun karyawan yang sudah tidak aktif tidak ditampilkan.** Yang
menentukan adalah tanggal terakhir bekerja pada data karyawan: begitu terisi,
ulang tahunnya berhenti muncul.

Agenda tidak ada di menu samping. Halaman ini bersifat pribadi, dan jalan
masuknya lewat kartu di Dashboard.

## Yang tidak dilakukan kalender

Kalender tidak melakukan transfer. Persetujuan di sini menandai bahwa
pembayaran boleh dijalankan; transfernya tetap dikerjakan lewat bank seperti
biasa.
