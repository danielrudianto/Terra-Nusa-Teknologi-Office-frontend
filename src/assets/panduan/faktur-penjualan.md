# Faktur Penjualan

Menagih pekerjaan proyek ke klien.

Faktur Penjualan adalah dokumen tagihan resmi ke klien atas pekerjaan yang
sudah dikerjakan. Pemasukan di luar penagihan proyek — bunga, royalti,
pembulatan — dicatat lewat Pendapatan Lain, bukan di sini.

## Alur pengisian

Tiga langkah berurutan.

**Umum → Nilai → Pembayaran**

## Langkah 1: Umum

Dua bagian: data klien dan detail invoice.

| Isian | Catatan |
|---|---|
| Nama klien | Pilih dari daftar klien |
| Alamat klien | Terisi mengikuti klien |
| NPWP klien | Diperlukan untuk faktur pajak |
| Nomor Invoice | Formatnya dikunci, lihat di bawah |
| Tanggal | Tanggal invoice |
| Nama proyek | Proyek yang ditagihkan |
| Deskripsi | Pekerjaan apa yang ditagih |
| Nomor SPK | Surat perintah kerja yang mendasari |

### Format nomor invoice

```
000-INV-XXXX-BULAN(romawi)-TAHUN
```

Bulannya angka Romawi, bukan angka biasa. Contoh untuk Agustus: `VIII`.

## Langkah 2: Nilai

| Isian | Catatan |
|---|---|
| DPP | Dasar Pengenaan Pajak |
| PPN dan PPN (Rp.) | Nilai rupiahnya dihitung otomatis |
| Kode PPh, Nama Objek Pajak PPh, PPh (%) | Kalau klien memotong PPh |
| BPJS (Rp.) | Kalau ada potongan BPJS |
| Retensi | Bagian tagihan yang ditahan klien |
| Total (Rp.) | Dihitung otomatis |

**Retensi** adalah bagian nilai yang ditahan klien sampai masa pemeliharaan
selesai. Retensi tetap dicatat sebagai bagian tagihan, tetapi belum diterima —
jadi jangan dikurangkan sendiri dari DPP.

Ada juga pilihan **Cetak terpisah?** untuk mengatur apakah dokumennya dicetak
sebagai berkas terpisah.

## Langkah 3: Pembayaran

Pilih rekening AKN yang akan menerima pembayaran, lalu isi total pembayaran.
Terakhir **Kirim & pratinjau** untuk melihat hasilnya sebelum benar-benar
tersimpan.

## Alur setelah faktur dibuat

Faktur yang baru dibuat belum bisa ditagihkan pembayarannya. Urutannya:

1. Faktur dibuat
2. **Konfirmasi faktur** — periksa data, isi nomor faktur pajak, lalu setujui.
   Hanya untuk yang punya izin menyetujui faktur penjualan
3. **Buat pembayaran** — baru aktif setelah faktur dikonfirmasi

Menu Konfirmasi mati kalau faktur sudah dikonfirmasi atau sudah dihapus.
Menu Buat pembayaran mati selama faktur belum dikonfirmasi.

## Bukti potong PPh

Kalau klien memotong PPh, bukti potongnya dicatat lewat menu **Input bukti
potong**.

Menu ini hanya aktif untuk faktur yang statusnya memang menunggu bukti potong.
Kalau menunya mati, berarti fakturnya tidak dipotong PPh atau bukti potongnya
sudah pernah dimasukkan.

Kotak pencarian di daftar mencari di nomor invoice, deskripsi, proyek, dan
nama klien sekaligus.
