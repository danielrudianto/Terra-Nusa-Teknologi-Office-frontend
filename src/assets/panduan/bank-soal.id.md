# Bank Soal Rekrutmen

Kumpulan pertanyaan ujian saringan masuk, dipakai ulang untuk setiap gelombang
rekrutmen.

Soalnya **esai** — menuntut penjelasan, bukan pilihan — dan dinilai orang.
Tidak ada kunci jawaban yang disimpan di sini.

## Siapa yang dapat membukanya

Hanya **divisi HRD** dan **pemilik**. Level tinggi saja tidak cukup: seorang
General Manager tanpa divisi HRD tetap ditolak, sama seperti pada slip gaji.

Alasannya bukan kerahasiaan soalnya, melainkan apa yang tersimpan di sebelahnya
— jawaban pelamar dan penilaiannya, yang menentukan seseorang diterima atau
tidak.

## Paket ujian

Soal dikelompokkan per **paket ujian**. Satu paket adalah satu lembar ujian
utuh dengan durasi pengerjaannya sendiri.

Soal yang dipindahkan dari sistem lama tersusun dalam empat paket, masing-masing
memuat tiga kategori:

| Kategori | Isinya |
|---|---|
| `civil` | Teknik sipil umum — beton, besi, metode kerja |
| `geo` | Geoteknik — daya dukung, penyelidikan tanah, fondasi |
| `drawing` | Gambar teknik; menerima unggahan berkas |

## Menambah soal

Tekan **Tambah soal**, pilih paketnya, lalu isi pertanyaannya.

**Urutan tidak perlu diisi.** Soal baru diletakkan di belakang yang sudah ada.

**Catatan** dipakai untuk standar atau batasan yang harus diikuti saat menjawab
— misalnya "Lakukan berdasarkan standar minimum SNI-03-2874-2002". Isinya ikut
dicari ketika Anda mengetik di kotak pencarian, sehingga sebagian soal hanya
dapat ditemukan lewat catatannya.

**Lampiran** berupa HTML: tabel berat besi, potongan gambar, dan sejenisnya —
hal yang menyatu dengan soalnya dan tidak berarti bila dipisahkan.

## Terima unggahan berkas

Menyala sendiri ketika kategorinya `drawing`, dan tetap dapat disunting.

Sebaiknya **tidak** dinyalakan pada soal lain. Membukanya pada soal esai
mengundang jawaban dikirim sebagai foto tulisan tangan — dan tulisan tangan
pada layar ponsel kerap tidak dapat dibaca ulang saat dinilai.

## Menyunting soal

Paket ujiannya **tidak dapat dipindah** setelah soal dibuat. Memindahkannya
membuat nomor urutnya bertabrakan dengan soal di paket tujuan, sementara
jawaban lama tetap menunjuk ke soal itu — sehingga satu lembar jawaban akan
memuat soal dari dua ujian sekaligus.

Bila sebuah soal memang milik paket lain, buat soal baru di sana dan hapus yang
lama.

## Menghapus soal

Soal **ditandai terhapus**, bukan dibuang dari basis data.

Jawaban pelamar menunjuk ke soal ini. Membuang barisnya membuat lembar jawaban
yang sudah dinilai kehilangan pertanyaannya — dan nilai tanpa pertanyaan tidak
dapat ditinjau ulang oleh siapa pun, termasuk oleh yang memberi nilai itu.

Menghapus memerlukan **level 5**.

## Yang perlu diingat

- Soal yang sedang dipakai pada ujian berjalan tetap dapat disunting; yang
  sudah membuka lembarnya akan melihat versi yang lama sampai ia memuat ulang
- Nilai maksimal per soal menentukan bobotnya saat penilaian; seluruh soal yang
  dipindahkan dari sistem lama bernilai maksimal 5
- Pencarian menyentuh pertanyaan **dan** catatannya
