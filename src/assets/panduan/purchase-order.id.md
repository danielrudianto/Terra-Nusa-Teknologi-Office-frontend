# Purchase Order

Memesan barang ke pemasok, sebelum tagihannya datang.

Purchase Order adalah dokumen pemesanan resmi ke pemasok. Setelah barangnya
datang dan invoicenya terbit, tagihannya dicatat lewat menu **Pembelian**
dengan merujuk nomor PO ini.

> Penting: panduan ini baru mencakup delapan jenis PO — **A, C, D, F, G,
> 5.1.1, 5.1.6, dan 6.3.2**. Jenis lain masih dikembangkan dan sengaja belum
> didokumentasikan supaya panduannya tidak menyesatkan.

## Jenis yang sudah tercakup

Lima yang pertama memakai formulir yang sama; yang membedakan hanya isian
tambahan di bagian akhir. Tiga yang terakhir berbeda bentuknya, dan
dijelaskan di bagiannya sendiri.

| Kode | Untuk | Tambahan |
|---|---|---|
| **G** | Peralatan & perlengkapan penunjang proyek | Tidak ada |
| **5.1.1** | Pembelian aset | Tidak ada |
| **5.1.6** | Dokumen & alat tulis kantor | Tidak ada |
| **C** | Bahan bakar | PBBKB, PPh 22, laporan analisa BBM |
| **F** | Material | Jenis material dan pengujian mutu |
| **A** | Jasa pengiriman barang | Moda angkut, asuransi, baris pengiriman |
| **D** | Tenaga kerja | Komponen upah dan jadwal pembayarannya |
| **6.3.2** | Merchandise promosi | Persetujuan sampel, denda keterlambatan |

Karena G, 5.1.1, dan 5.1.6 formulirnya persis sama, yang menentukan pilihan
adalah **pos biayanya**, bukan tampilan formulirnya. Barang penunjang di
lapangan masuk G, aset yang dicatat sebagai harta masuk 5.1.1, dan keperluan
kantor masuk 5.1.6.

## Bagian yang sama di semua jenis

### Pemasok dan proyek

Pilih pemasok dari daftar; nama, alamat, kota, dan NPWP terisi otomatis.
Lalu isi kode proyek yang menanggung pembelian ini.

### Metode pengiriman

Dua pilihan, dan pilihan ini mengubah label alamat di bawahnya:

- **Franco** — barang dikirim ke lokasi. Kolomnya jadi *alamat pengiriman*
- **Loco** — barang diambil sendiri. Kolomnya jadi *alamat pengambilan*

Salah pilih di sini membuat klausul yang tercetak keliru soal siapa yang
menanggung ongkos angkut.

### PIC

Dua pasang: **PIC Supplier** dan **PIC Kantor**, masing-masing nama dan nomor
telepon. Yang tercetak di dokumen inilah yang dihubungi kalau ada masalah
pengiriman, jadi jangan diisi nama yang tidak bisa dihubungi.

### Termin pembayaran

| Kode | Arti | Jangka Kredit | Prepaid |
|---|---|---|---|
| `CBD` | Cash before delivery | mati | mati |
| `COD` | Cash on delivery | mati | mati |
| `PPD` | Prepaid | aktif | aktif |
| `CR` | Credit | aktif | mati |
| `CRD` | Credit with prepaid | aktif | aktif |

Kolom **Jangka Kredit** dan **Prepaid** menyala atau mati sendiri mengikuti
termin yang dipilih. Kalau salah satunya terkunci dan bernilai nol, itu
memang seharusnya — bukan kolom yang lupa diisi.

### Daftar barang

Tambahkan satu baris per barang: nama, satuan, qty, dan harga satuan.
Subtotal dan total dihitung otomatis.

### PPN

Sakelar **Ada PPN 11%?** menentukan apakah PPN ditambahkan.

Harga satuan yang diketik adalah **DPP** — PPN dihitung di atasnya, bukan
sudah termasuk. Kalau harga dari pemasok sudah termasuk PPN, hitung mundur
dulu sebelum diketik, kalau tidak nilainya akan kelebihan 11%.

### Ketentuan dan poin tambahan

Klausul baku tercetak otomatis mengikuti isian di atas — moda pengiriman,
termin, dan jenis PO. Tidak perlu diketik ulang.

Bagian **Poin Tambahan** hanya untuk kesepakatan khusus di luar ketentuan
baku. Kosongkan kalau tidak ada.

## Khusus C — Bahan bakar

Dua isian tambahan di bagian nilai:

- **PBBKB** — diisi dalam persen, dikalikan subtotal
- **PPh 22** — diisi nominal langsung, bukan persen

Perhatikan bedanya: yang satu persen, yang satu rupiah. Tertukar di sini
membuat total melenceng jauh.

Ada juga centang **Wajibkan Fuel Analysis Report & Sertifikat Kalibrasi**.
Kalau dicentang, dua poin ketentuan tambahan ikut tercetak di dokumen. Lepas
centangnya hanya kalau memang disepakati tidak diperlukan.

## Khusus F — Material

Pilih **Jenis Material** lebih dulu, karena pilihan ini yang menentukan poin
perjanjian yang dibuat otomatis:

| Pilihan | Untuk |
|---|---|
| Beton (ready mix) | Pengadaan beton |
| Besi | Pengadaan besi |
| Material lain | Material di luar keduanya |
| Uji tekan silinder | Jasa pengujian beton |
| Uji tarik & tekuk besi | Jasa pengujian besi |

**Dua pilihan terakhir bukan pembelian barang, melainkan jasa.** Dokumennya
tercetak sebagai **Surat Perintah Kerja (SPK)**, bukan Purchase Order. Jangan
kaget kalau judul dokumennya berbeda — itu memang seharusnya.

Untuk jasa pengujian, isiannya: jumlah benda uji, harga per benda uji, berapa
hari laporan terbit, dan penyerahan benda uji.

Untuk pengadaan beton dan besi, ada centang pengujian mutu. Bila diaktifkan,
klausul "penjual mengganti barang bila gagal uji mutu" ikut tercetak. Khusus
beton, ada pilihan **penanggung biaya uji**: pembeli atau penjual. Sepakati
ini di muka, karena setelah PO terbit sulit dinegosiasikan ulang.

Ada juga dua tanggal opsional: **pengiriman sebelum** dan **pembayaran
sebelum**. Kosongkan kalau tidak disepakati tanggal pastinya.

## Tipe A — Jasa pengiriman

Untuk membayar jasa angkut barang, bukan membeli barangnya. Yang ditagihkan
ongkos kirimnya.

### Baris pengiriman

Berbeda dari jenis lain, isian utamanya bukan daftar barang melainkan
**daftar pengiriman** — satu baris per perjalanan. Tambahkan sebanyak
pengiriman yang ditagihkan.

Tiap baris berisi moda angkut, tanggal kirim, asal, tujuan, dan nilainya.
Isian selanjutnya **berubah mengikuti moda**:

| Moda | Yang diminta |
|---|---|
| **Darat** | Armada, nomor polisi, nama dan NIK supir |
| **Laut** | Penyedia jasa, nomor kontainer |
| **Udara** | Penyedia jasa, nomor AWB atau resi |

Armada hanya wajib pada moda darat. Bila memilih laut atau udara, kolomnya
dilepas sendiri — bukan tertinggal kosong.

Volume dan satuan mengikuti cara vendor menagih. Jasa antar udara kerap
ditagih per kilogram, bukan borongan, sehingga satuannya dapat diganti per
baris.

### Asuransi dan tanggungan risiko

Bagian ini yang paling sering terlewat dibaca, padahal isinya yang menentukan
siapa menanggung bila barang rusak.

**Wajibkan dokumen asuransi** menyalakan poin kewajiban vendor menyerahkan
polisnya. Bila dimatikan, klausulnya tidak tercetak sama sekali — jadi jangan
dimatikan hanya karena polisnya belum diterima saat PO dibuat.

**Risiko pengiriman** dan **risiko bongkar muat** disepakati di muka. Setelah
PO terbit, keduanya sulit dinegosiasikan ulang justru ketika sedang
dibutuhkan.

## Tipe D — Tenaga kerja

Satu SPK untuk **satu pekerja**. Bila memborong beberapa orang, buat SPK
terpisah untuk masing-masing — nama dan komponen upahnya berbeda, dan
dokumen yang menggabungkan keduanya tidak dapat dipakai sebagai dasar
pembayaran per orang.

### Komponen upah

Upah tidak diisi sebagai satu angka. Tambahkan satu baris per komponen —
upah harian, uang makan, tunjangan, lembur — masing-masing dengan nominal
dan jadwal pembayarannya sendiri.

Dipisah begitu karena jadwalnya kerap berbeda: upah harian dibayar mingguan
sementara tunjangannya bulanan. Digabung, salah satunya pasti tercetak dengan
jadwal yang tidak disepakati.

### Empat jadwal pembayaran

| Jadwal | Artinya |
|---|---|
| **Mingguan** | Dibayar tiap pekan pada hari tertentu |
| **Bulan yang sama** | Dibayar tiap bulan pada tanggal X, bulan itu juga |
| **Bulan berikutnya** | Dibayar tiap bulan pada tanggal X di bulan sesudahnya |
| **Dua kali sebulan** | Cut-off tanggal X dan akhir bulan |

Tiap jadwal punya **cut-off** sendiri — batas periode kerja yang dihitung.
Periode berikutnya dimulai otomatis sehari atau sehari setelah cut-off, jadi
tidak ada hari yang terhitung dua kali maupun terlewat.

Pada jadwal dua kali sebulan, cut-off keduanya selalu **akhir bulan** — itulah
yang membedakannya dari jadwal bulanan biasa. Tanggal bayarnya tidak ditulis
sebagai angka, karena bergantung pada hari apa cut-off jatuh.

### Sakelar ketentuan

Beberapa poin perjanjian dinyalakan sesuai kesepakatan: transport pulang,
cuti pulang kampung, pengawalan alat, ketentuan shift, dan kebijakan hari
Minggu.

Yang dimatikan **tetap tercetak dalam keadaan tercoret**, bukan hilang. Itu
disengaja: pembaca dokumen dapat melihat poin itu memang sengaja tidak
dipakai, bukan terlupa dicantumkan.

## Tipe 6.3.2 — Merchandise promosi

Untuk pengadaan barang promosi — kaos, tumbler, payung, dan sejenisnya.
Berbeda dari 6.3.1 yang untuk jasa periklanan.

Barang dan jasa **tidak pernah dicampur dalam satu pesanan**. Jenisnya
ditentukan di muka dan menentukan seluruh bentuk daftar barisnya.

### Persetujuan sampel

**Wajibkan persetujuan sampel** menyalakan poin bahwa produksi massal baru
boleh berjalan setelah sampel disetujui.

Biarkan menyala kecuali memang disepakati sebaliknya. Tanpa poin itu, barang
yang sudah dicetak seribu buah dengan warna yang salah tidak punya dasar
untuk ditolak.

### Denda keterlambatan

Dimatikan secara bawaan. Bila dinyalakan, isilah dua angkanya: **permil per
hari** dan **batas maksimal** dalam persen.

Batas maksimal itu penting. Tanpa batas, denda yang berjalan terus secara
teori dapat melampaui nilai pesanannya sendiri — dan klausul semacam itu
biasanya justru tidak dapat ditegakkan.

### Pengiriman

Karena merchandise berupa barang, klausul Franco/Loco, alamat, dan kontak
kedua pihak ikut berlaku — sama seperti pada pengadaan barang lainnya.

## Memeriksa dokumen sebelum diterbitkan

Dua tombol di bawah formulir, dan keduanya menampilkan dokumen yang sama.

**Pratinjau** membuka dokumennya tanpa menyimpan apa pun. Nomornya masih
bertuliskan *(DRAF — BELUM TERBIT)* karena nomor asli baru diberikan saat
penyimpanan. Boleh dibuka berkali-kali; isian tidak berubah.

**Buat Purchase Order** juga menampilkan dokumennya lebih dulu, tetapi
tombol penerbitannya terkunci sampai pernyataan *"Saya telah membaca dan
memeriksa seluruh isi dokumen ini"* dicentang.

Kuncian itu disengaja. Setelah PO terbit, nomornya sudah terpakai dan isinya
tidak dapat diubah — perbaikan hanya mungkin dengan membatalkan lalu
menerbitkan ulang, dan salinan yang terlanjur dikirim ke pemasok tidak bisa
ditarik. Membaca satu layar sebelum menekan jauh lebih murah daripada
membatalkan sesudahnya.

## Salah pilih jenis PO

Tombol **Ganti jenis** di bagian atas membuka kembali pemilih jenis, tanpa
perlu menekan tombol kembali peramban.

Bila sudah ada isian yang diketik, muncul konfirmasi lebih dulu — pindah
jenis berarti pindah formulir, dan isian yang sudah ada tidak terbawa.

## Kode proyek pada tipe G

Tipe G melekat pada proyek tertentu, sehingga **PUSAT tidak tersedia** di
daftar pilihannya. Beban kantor yang tidak melekat pada proyek dicatat lewat
jenis lain.

Dokumen lama yang terlanjur berkode PUSAT tetap terbaca saat dibuka — yang
disaring hanya sarannya, bukan datanya.

## Setelah PO terbit

Nomor PO yang terbit dipakai saat mencatat tagihannya di menu **Pembelian**.
Formatnya harus sama persis, karena Pembelian memvalidasi polanya dan mengisi
proyek serta tipe biaya dari potongan nomor itu.
