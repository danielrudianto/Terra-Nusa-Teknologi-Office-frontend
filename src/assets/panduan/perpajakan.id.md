# Perpajakan

Menarik rekap pajak dari data yang sudah tercatat di sistem.

Menu ini **tidak menghitung pajak terutang** dan tidak menggantikan pembukuan.
Yang dilakukannya adalah mengumpulkan angka yang sudah ada di pembelian,
faktur penjualan, dan slip gaji, lalu menyusunnya per bulan agar tinggal
dicocokkan.

## Alur pemakaian

Pilih **periode** — bulan dan tahun — sekali di halaman Pusat Pajak. Periode
itu terbawa ke semua rekap, jadi tidak perlu dipilih ulang di tiap laporan.

Lalu buka rekap yang dibutuhkan.

## Empat rekap yang tersedia

| Rekap | Sumbernya | Untuk |
|---|---|---|
| **PPN** | Data pembelian | Rekap PPN masukan |
| **PPh (Purchase)** | Data pembelian | Rekap PPh yang dipotong atas pembelian |
| **PPh (Salary)** | Slip gaji | Rekap PPh 21 atas gaji karyawan |
| **Laporan Bulanan** | Seluruh modul | Rekap menyeluruh sebulan |

**Laporan Bulanan** memuat bagian yang lebih luas: utang usaha, piutang
usaha, mutasi bank, aset, pinjaman, pembelian, dan penjualan. Ini yang
biasanya diserahkan ke konsultan pajak.

## Angkanya hanya sebaik dokumennya

Rekap ini membaca apa yang sudah tercatat. Kalau ada yang keliru di hulu,
rekapnya ikut keliru tanpa peringatan apa pun.

Yang paling sering menjadi sumbernya:

**Tarif PPN salah pilih.** Pembelian jasa pengurusan transportasi memakai
1,1%, selebihnya 11%. Salah pilih di sini langsung terbawa ke rekap PPN.

**Kode PPh tidak diisi.** Pembelian yang seharusnya dipotong PPh tetapi kode
objek pajaknya dikosongkan tidak akan muncul di rekap PPh, dan potongannya
seolah tidak pernah ada.

**Faktur pajak belum bernomor.** Faktur penjualan yang nomor faktur pajaknya
belum diisi ditandai **Faktur belum terbit** — itu bukan kesalahan sistem,
melainkan pengingat bahwa dokumennya memang belum lengkap.

## Status pajak

Pada faktur penjualan ada penanda tahap:

| Status | Artinya |
|---|---|
| **Faktur belum terbit** | Nomor faktur pajak belum diisi |
| **Menunggu pembayaran** | Faktur sudah terbit, uangnya belum masuk |
| **Bukti potong belum ada** | Klien memotong PPh, buktinya belum diterima |
| **Selesai** | Seluruh dokumen dan pembayarannya lengkap |

**Bukti potong belum ada** yang menumpuk perlu ditagih ke klien. Tanpa bukti
potong, PPh yang sudah dipotong tidak dapat dikreditkan — perusahaan
menanggung dua kali.

## Sebelum menyerahkan ke konsultan

Periksa dulu untuk periode yang bersangkutan:

- Tidak ada faktur penjualan yang masih berstatus **Faktur belum terbit**
- Tidak ada pembelian berstatus **Menunggu** yang seharusnya sudah lengkap
- Bukti potong dari klien sudah dimasukkan lewat menu di Faktur Penjualan

Lebih mudah memperbaiki dokumen sekarang daripada menjelaskan selisihnya
belakangan.

## Yang tidak dilakukan menu ini

Menu ini tidak menyetorkan pajak, tidak menghitung kurang atau lebih bayar,
dan tidak menggantikan SPT. Angkanya bahan baku untuk itu semua — penyusunan
dan pelaporannya tetap dikerjakan bersama konsultan pajak.
