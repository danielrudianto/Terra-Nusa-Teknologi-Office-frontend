# Pembelian & Purchase Order

Panduan untuk staf yang membuat dan mengurus PO di TerraBot.

> ⚠️ **Perlu dicek sebelum dipakai.** Bagian bertanda seperti ini disusun dari
> catatan pengembangan, belum dicocokkan dengan tampilan akhir. Hapus tandanya
> setelah diverifikasi.

## Sekilas

Purchase Order (PO) adalah dokumen resmi yang menyatakan AKN memesan barang atau
jasa dari pemasok. Sekali disetujui, PO menjadi dasar penagihan — jadi pastikan
isinya benar **sebelum** minta persetujuan.

Yang perlu disiapkan sebelum mulai:

- pemasok sudah terdaftar di sistem
- harga sudah disepakati (penawaran/negosiasi selesai)
- syarat pembayaran sudah jelas
- untuk pengiriman: moda angkut dan jadwalnya sudah pasti

## Memilih tipe PO

Ini keputusan pertama dan paling menentukan, karena tiap tipe menampilkan kolom
dan klausul yang berbeda. Salah pilih tipe berarti mengisi ulang dari awal.

| Tipe  | Dipakai untuk                        | Ciri khas                                                             |
| ----- | ------------------------------------ | --------------------------------------------------------------------- |
| **A** | Pengadaan barang yang perlu diangkut | Ada moda angkut (darat/laut/udara), jadwal per baris, opsi asuransi   |
| **B** | Sewa alat                            | Kuota jam pemakaian per periode. Bisa juga diterbitkan sebagai tipe A |
| **D** | Jasa / subkontrak                    | Klausul terbagi empat bagian                                          |
| **H** | Pengadaan berkala / berlangganan     | Ada pemilihan tanggal cutoff penagihan                                |

> ⚠️ **Perlu dicek:** tipe bernomor (`5.1.1`, `5.1.2`, `5.1.1.2`, `6.3`, `6.4.1`)
> mengikuti kode kategori biaya. Tolong isi tabel di atas dengan padanan yang
> benar — kapan staf harus pakai yang mana.

**Catatan penting:** sewa alat angkut **tidak lagi** dibuat lewat tipe A. Sejak
pembaruan terakhir, semuanya lewat **tipe B**. PO lama yang terlanjur pakai
tipe A tetap bisa dibuka dan dicetak seperti biasa.

## Membuat PO baru

### 1. Isi kepala dokumen

Pemasok, tanggal, dan syarat pembayaran. Bagian ini yang muncul di bagian atas
dokumen cetak.

### 2. Tambahkan baris barang atau jasa

Tiap baris berdiri sendiri — punya volume, satuan, dan harganya masing-masing.

Satuan (`Ls`, `kg`, `m³`, dan seterusnya) bisa dipilih dari daftar **atau**
diketik langsung kalau satuan yang dibutuhkan belum ada di daftar.

### 3. Isi jadwal per baris (tipe A)

Kolom jadwal menyesuaikan moda angkut:

- **Darat & udara** — tanggal kirim dan tanggal bongkar
- **Laut** — closing, ETD, dan ETA

Satu PO boleh memuat lebih dari satu moda. Klausulnya otomatis ikut moda yang
benar-benar dipakai, jadi tidak perlu menghapus klausul yang tidak relevan
secara manual.

> **Kalau klausul pengiriman belum muncul:** itu normal. Klausul baru tampil
> setelah baris pertama diisi. Sistem belum tahu moda apa yang dipakai sebelum
> ada isinya.

### 4. PIC pengiriman (opsional)

PIC diisi **per baris pengiriman**, bukan satu untuk seluruh kontrak. Kosongkan
kalau memang tidak ada penanggung jawab khusus untuk baris itu.

### 5. Asuransi (opsional)

Kalau barang diasuransikan, aktifkan opsinya lalu isi nilai pertanggungan.

## Syarat pembayaran

Syarat pembayaran disimpan sebagai kode, bukan teks bebas:

| Kode   | Arti                                                |
| ------ | --------------------------------------------------- |
| `CASH` | Tunai                                               |
| `COD`  | Cash on delivery — bayar saat barang diterima       |
| `CBD`  | Cash before delivery — bayar sebelum barang dikirim |
| `PPD`  | Prepaid — dibayar di muka                           |
| `CR`   | Kredit                                              |
| `CRD`  | Kredit dengan jangka waktu tertentu                 |

> ⚠️ **Perlu dicek:** tolong konfirmasi arti `CR` vs `CRD` sesuai praktik AKN,
> dan tambahkan berapa hari tempo standarnya.

PO lama yang syarat pembayarannya masih berupa teks bebas tetap terbaca dan
tercetak apa adanya — tidak perlu diperbaiki.

## PPN

Ada dua pilihan tarif:

- **11%** — tarif normal untuk pengadaan barang dan jasa pada umumnya
- **1,1%** — untuk jasa pengurusan transportasi / _freight forwarding_, yang
  memakai DPP nilai lain

Pilih 1,1% **hanya** kalau tagihannya memang jasa freight forwarding. Kalau
ragu, tanyakan ke bagian akunting dulu — salah tarif akan terbawa sampai ke
pembukuan dan sulit dikoreksi belakangan.

## Setelah PO dibuat

> ⚠️ **Perlu diisi:** urutan status setelah PO disimpan (draft → diajukan →
> disetujui → ditutup?), siapa yang menyetujui, dan apakah PO yang sudah
> disetujui masih bisa diubah. Ini bagian yang paling sering ditanyakan staf,
> jadi jangan dilewat.

Untuk mencetak, buka PO lalu gunakan tombol cetak di toolbar. Dokumen keluar
mengikuti tipe PO-nya — klausul dan tata letaknya sudah otomatis menyesuaikan.

> ⚠️ **Perlu dicek:** beberapa varian PO belum punya helper cetak. Sebutkan di
> sini varian mana saja yang belum bisa dicetak, supaya staf tidak bingung
> mengira sistemnya rusak.

## Kalau tombolnya tidak ada

Kalau menu atau tombol yang disebut di panduan ini tidak terlihat, kemungkinan
besar memang belum termasuk hak akses Anda — bukan sistemnya error.

Hak akses di TerraBot dibagi per modul dan per tindakan (lihat, buat, ubah,
hapus, setujui). Contoh: staf procurement bisa membuat PO, tetapi tidak bisa
menghapus atau menyetujui.

Butuh akses tambahan? Hubungi admin sistem. Jangan memakai akun orang lain —
setiap perubahan tercatat di riwayat aktivitas atas nama pemilik akun.
