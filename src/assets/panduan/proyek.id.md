# Proyek

Data induk proyek: kode, klien, jadwal, dan nilai kontraknya.

Kode proyek dipakai di hampir setiap dokumen — purchase order, pembelian,
reimbursement, faktur penjualan. Menu ini yang membuat kode-kode itu punya
arti: nama pekerjaannya apa, kliennya siapa, dan nilai kontraknya berapa.

## Kode proyek tidak dapat diubah

Ini yang paling penting.

Kode adalah **satu-satunya penghubung** antara proyek dan seluruh dokumen yang
menyebutnya. Menggantinya akan memutus semua pembelian, PO, dan faktur yang
merujuk kode lama — tanpa galat apa pun, hanya dokumen yang tiba-tiba tidak
punya induk.

Karena itu kode dikunci setelah proyek dibuat. Periksa ejaannya sebelum
menyimpan. Proyek yang kodenya terlanjur salah harus dihapus dan dibuat ulang,
selama belum ada dokumen yang memakainya.

## Membuat proyek

| Isian | Catatan |
|---|---|
| Kode proyek | 4–5 karakter, huruf besar, tidak bisa diubah |
| Nama proyek | Nama lengkap pekerjaan |
| Klien | Pemberi kerja |
| Tanggal mulai & selesai | Jadwal kontrak |

Pembuatan proyek dibatasi akses level 4 ke atas, justru karena kodenya tidak
bisa diperbaiki belakangan.

## Tiga keadaan proyek

| Keadaan | Artinya |
|---|---|
| **Berjalan** | Pekerjaan masih aktif |
| **Selesai** | Pekerjaan rampung |
| **Batal** | Pekerjaan dibatalkan sebelum selesai |

Proyek batal **tidak dihapus**. Biaya yang terlanjur dikeluarkan atasnya tetap
tercatat di pembelian dan reimbursement; kalau proyeknya dihapus, biaya itu
menjadi yatim — terhitung di total perusahaan tetapi tidak ada proyeknya.

Menandai selesai atau batal juga merapikan pemilih kode: keduanya tetap muncul
sebagai pilihan, tetapi diurutkan paling bawah dan diberi label.

## Kontrak dan adendum

Nilai kontrak **bukan satu angka yang diketik**, melainkan jumlah dari
dokumen-dokumen di halaman rincian proyek.

Tambahkan satu baris untuk SPK awal, lalu satu baris lagi untuk tiap adendum.
Riwayat perubahannya jadi utuh — dan pada tahun audit, "mengapa nilai
kontraknya berbeda dari SPK awal" adalah pertanyaan yang harus bisa dijawab
dengan dokumen.

### Mengisi satu dokumen kontrak

| Isian | Catatan |
|---|---|
| Nomor dokumen | Nomor SPK atau adendum |
| Jenis | SPK atau Adendum |
| DPP | Dasar pengenaan pajak, di luar PPN |
| PPN | Persen |
| PPh | Opsional, dipilih dari daftar objek pajak |
| Tanggal | Tanggal dokumen |

Isi **DPP**, bukan nominal yang sudah termasuk PPN. Ringkasan di bawah
formulir menunjukkan nilai PPN, nilai dokumen, dan jumlah yang diterima setelah
PPh — periksa ketiganya sebelum menyimpan.

**Adendum yang mengurangi lingkup kerja diisi negatif.** Nilai kontraknya ikut
berkurang, dan jejak pengurangannya tetap terbaca.

## Nilai kontrak di laporan memakai DPP

Laporan Proyek menghitung margin dari **DPP**, bukan nominal kotor. PPN adalah
titipan negara, bukan pendapatan — memakai nominal yang sudah termasuk PPN
membuat margin setiap proyek tampak lebih besar sekitar sebelas persen dari
kenyataannya.

Itu cukup untuk membuat proyek yang sebenarnya rugi tipis terlihat untung.

## Dua tampilan di Laporan Proyek

**Ikhtisar** menjawab *ke mana uangnya pergi*: komposisi biaya per kategori,
dan tiap kategori bisa dibuka untuk melihat rincian per pemasok.

Batang di bagian atas menunjukkan pembagian nilai kontrak antara biaya dan
margin, dalam persen. Angka di bawah delapan persen sengaja disembunyikan
dari batangnya — pada segmen sempit tulisannya terpotong dan justru tidak
terbaca. Nilai rupiahnya tetap ada di keterangan bawah.

Bila biaya melampaui nilai kontrak, batangnya berubah merah dan menampilkan
seberapa jauh terlampaui.

**Arus per minggu** menjawab pertanyaan yang tidak bisa dijawab Ikhtisar:
*kapan* uangnya keluar, dan apakah penagihan mengejar.

Mingguan, bukan bulanan, karena proyek di sini umumnya berjalan singkat —
bulanan hanya menghasilkan tiga atau empat batang dan tidak menunjukkan
temponya.

Yang perlu diperhatikan di sini:

- **Minggu dihitung mulai Senin.** Pekerjaan lapangan dan penagihan mengikuti
  minggu kerja; memotong di hari Minggu akan membelah satu minggu kerja
  menjadi dua batang.
- **Minggu tanpa transaksi tetap ditampilkan.** Melompatinya membuat jeda tiga
  minggu terlihat serapat dua minggu berturut-turut — padahal justru jeda itu
  yang menandakan pekerjaan berhenti.
- **Biaya kumulatif** dibandingkan terhadap nilai kontrak. Bila garisnya sudah
  mendekati batas sementara pekerjaan baru separuh, itu ketahuan sekarang,
  bukan setelah terlampaui.
