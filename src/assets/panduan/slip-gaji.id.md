# Slip Gaji

Menyusun slip gaji bulanan karyawan, dari gaji pokok sampai PPh 21.

Slip gaji memuat data yang paling sensitif di TerraBot. Aksesnya dibatasi, dan
sebaiknya tidak dibuka di layar yang bisa dilihat orang lain.

## Alur pengisian

Formulirnya beberapa bagian dalam satu halaman:

**Karyawan → Pendapatan → Tunjangan Lain → Potongan → Bank & Pembayaran →
Ringkasan & Pajak**

## Karyawan dan periode

Pilih karyawan dan periode (bulan serta tahun). Nama, NIK, jabatan, dan
departemen terisi dari data karyawan — kalau ada yang keliru, perbaiki di
Master Data → Karyawan, bukan di sini.

### Kategori pajak

Ini yang menentukan PTKP, dan salah pilih langsung mengubah PPh 21:

| Kode | Arti |
|---|---|
| TK/0 – TK/3 | Tidak kawin, dengan 0–3 tanggungan |
| K/0 – K/3 | Kawin, dengan 0–3 tanggungan |

Kategori mengikuti keadaan karyawan **pada awal tahun pajak**, bukan keadaan
hari ini. Karyawan yang menikah di bulan Juni tetap memakai status awal tahun
sampai tahun pajak berikutnya.

## Pendapatan

Gaji pokok, lalu tiga komponen yang dihitung dari jumlah dikali tarif:

| Komponen | Jumlah | Tarif |
|---|---|---|
| Uang makan | Berapa hari | Per hari |
| Transportasi | Berapa hari | Per hari |
| Lembur | Berapa jam | Per jam |

Isi jumlah dan tarifnya terpisah, jangan hasil kalinya. Rinciannya ikut
tercetak di slip, dan karyawan biasanya memeriksa hitungannya sendiri.

## Tunjangan dan potongan

Tunjangan lain ditambahkan satu per satu — bonus kinerja, tunjangan jabatan,
THR, tunjangan kesehatan, dan seterusnya. Potongan juga: BPJS, keterlambatan,
surat peringatan, cuti.

### Sakelar "Dihitung untuk PPh"

Tiap tunjangan dan potongan punya sakelar ini, dan **inilah bagian yang paling
sering keliru**.

Tidak semua tunjangan menambah dasar pengenaan PPh 21, dan tidak semua
potongan menguranginya. Sakelar yang salah membuat PPh 21 ikut salah — nilainya
tetap tampak wajar, sehingga kekeliruannya baru ketahuan saat rekonsiliasi
tahunan.

Kalau ragu untuk satu komponen, tanyakan ke bagian akunting sebelum
menyimpan. Menebak di sini lebih mahal daripada bertanya.

## Bank dan pembayaran

Rekening tujuan karyawan: nama bank, nomor, dan nama rekening. Ada juga
metode pembayaran.

Pastikan nama rekening cocok dengan yang terdaftar di bank. Transfer gaji yang
tertolak karena nama tidak cocok berarti karyawan menunggu lebih lama.

## Ringkasan dan pajak

Bagian terakhir menampilkan **Total gaji (kotor)**, **PPh 21**, dan **Gaji
bersih**. Ketiganya dihitung otomatis dari isian di atas.

Periksa ketiganya sebelum menyimpan. Setelah slip dibuat dan dibayarkan,
mengoreksinya berarti membatalkan pembayaran — bukan sekadar mengubah angka.

## Setelah slip dibuat

Menu titik tiga di daftar berisi:

- **Lihat slip gaji** — rincian lengkap
- **Buat pembayaran** — menyiapkan pembayaran gajinya
- **Cetak ulang slip gaji** — kalau perlu dicetak lagi
- **Kirim slip gaji** — mengirimkan ke karyawan

Rekap PPh 21 dari seluruh slip satu periode bisa ditarik lewat **Perpajakan →
PPh (Salary)**.
