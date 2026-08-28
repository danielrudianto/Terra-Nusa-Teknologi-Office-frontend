# Certificate of Payment (CoP)

Berita acara progres atas sebuah SPK — dasar penagihan pekerjaan yang
dikerjakan bertahap.

Certificate of Payment mencatat **volume pekerjaan yang sudah terlaksana**
pada sebuah SPK (Surat Perintah Kerja), lalu menghitung nilai yang boleh
ditagihkan atasnya. Satu SPK bisa memiliki banyak CoP — satu untuk tiap
periode progres (mingguan, per termin, dan seterusnya).

> Penting: CoP hanya untuk **SPK**, bukan purchase order pembelian barang.
> Barang diterima sekali dan ditagih sekali lewat menu **Pembelian**; progres
> mingguan atasnya tidak berarti apa-apa. Jenis **A** dan **D** juga
> dikecualikan — penagihannya sudah ditangani jalur lain.

<a id="alur-empat-tahap"></a>

## Alur empat tahap

Ini bagian terpenting. CoP melewati **empat tahap** dengan **dua persetujuan**,
dan tiap tahap dikerjakan tangan yang berbeda — sengaja, supaya yang mencatat
progres bukan yang memutuskan progres itu sah, bukan pula yang mengisi
harganya, bukan pula yang menerbitkan tagihannya.

| Tahap | Siapa | Yang dikerjakan |
|---|---|---|
| **1. BAP dibuat** | Lapangan (engineering **level 1**) | Mengisi **volume** pekerjaan. Harga tidak pernah sampai ke sini. |
| **2. Setujui BAP** | **Level 4 ke atas** | Mengesahkan progres lapangannya. Baru **setelah ini** harga boleh diisi. |
| **3. CoP dibuat** | Pemeriksa (engineering **level 2** ke atas) | Mengisi **harga & potongan** (uang muka, retensi, denda, tambahan). |
| **4. Setujui CoP** | **Level 4 ke atas** | Menyetujui nilai akhirnya. Setelah ini **siap ditagih**. |

Dua persetujuannya (BAP dan CoP) **tidak boleh dikerjakan orang yang sama**,
dan tidak boleh oleh pembuatnya sendiri. Ini yang menjaga "dua mata" atas tiap
dokumen.

BAP dan CoP adalah **dua dokumen** dalam satu berkas: **BAP** menyatakan APA
YANG TERLAKSANA (volume, dibawa ke lapangan untuk diperiksa), **CoP**
menyatakan BERAPA YANG DIBAYAR. Karena itu masing-masing punya "Dibuat oleh"
dan "Disetujui oleh" sendiri.

<a id="mengisi-volume"></a>

## Tahap 1 — mengisi volume (lapangan)

Orang lapangan membuka SPK yang sudah disetujui, lalu mengisi **volume** tiap
baris pekerjaan untuk periode ini. Yang tampil hanya volume dan sisa pagu —
**harga satuan tidak pernah dikirim ke layar lapangan**, jadi tidak bisa
terbaca siapa pun di sana.

Setiap baris punya **pagu**: volume kontrak baris itu dikurangi yang sudah
disertifikasi CoP lain. Volume yang melebihi sisa pagu **ditolak** — bila
pekerjaannya memang bertambah, SPK-nya harus **diadendum** lebih dahulu
(adendum adalah dokumen tersendiri berisi selisih, dengan barisnya sendiri).

Periode pekerjaan (tanggal awal–akhir) **wajib** diisi. Bila periodenya
bertindih dengan CoP lain atas SPK yang sama, sistem **memperingatkan** —
tetapi tidak menolak, karena sertifikasi ulang setelah perbaikan kadang memang
memakai rentang yang sama.

<a id="setujui-bap"></a>

## Tahap 2 — Setujui BAP

Setelah volumenya benar, **level 4 ke atas** menekan **Setujui BAP**. Ini
mengesahkan bahwa progres di lapangan memang terjadi. Sebelum langkah ini:

- Harga dan potongan **belum bisa** diisi sama sekali.
- Volume **masih boleh** disunting.

Setelah BAP disetujui, volumenya terkunci (untuk mengubahnya, batalkan dulu
persetujuan BAP-nya).

<a id="buat-cop"></a>

## Tahap 3 — Buat CoP (isi harga & potongan)

Di sinilah **nilai rupiah pertama kali muncul**. Pemeriksa (engineering level
2 ke atas) membuka lembar CoP dan mengisi **potongan** serta **tambahan**:

| Potongan | Untuk |
|---|---|
| **Uang muka** | Amortisasi uang muka yang sudah dibayarkan di awal. |
| **Retensi** | Ditahan sampai masa pemeliharaan berakhir. |
| **Denda** | Keterlambatan atau mutu. |
| **Lain-lain** | Yang tak terduga (wajib diberi keterangan). |

Tambahan dipakai untuk biaya **di luar kontrak** (penggantian ongkos kirim,
mobilisasi tak terduga). Tambahan **tidak** boleh menampung volume pekerjaan —
pekerjaan yang bertambah tetap lewat adendum.

> **PPh** sengaja **tidak** ada di daftar potongan CoP. Ia dipotong sekali
> pada **Pembelian**, bukan di sini. Pada lembar CoP, PPh tetap **tampak**
> sebagai keterangan tarif yang berlaku, tapi tidak ikut dijumlahkan pada
> pengurangan — supaya tidak terpotong dua kali.

Potongan uang muka dan retensi punya **pagu**: seluruh pengembaliannya tidak
boleh melebihi yang benar-benar dibayarkan/disepakati. Sistem menghitung
saran nominalnya secara proporsional.

<a id="setujui-cop"></a>

## Tahap 4 — Setujui CoP

**Level 4 ke atas** (bukan yang menyetujui BAP tadi) menekan **Setujui CoP**.
Sejak ini CoP **siap ditagihkan**, dan potongan/tambahannya terkunci — nilai
yang disetujui adalah nilai yang akan ditagih.

<a id="penomoran"></a>

## Penomoran

Nomor CoP disusun otomatis dengan pola:

```
[urut]-[ID vendor]-[kode proyek]-[tahun]
```

Contohnya **`002-042-R501-2026`** — CoP urutan kedua untuk vendor 42 pada
proyek R501 tahun 2026. Urutannya berjalan **per vendor + proyek**, dan ID
vendornya dipad tiga digit. Nomor ini tercetak sebagai **No. CoP** maupun
**No. BAP** pada berkasnya.

<a id="mencetak"></a>

## Mencetak

- **BAP** boleh diunduh **kapan saja**, bahkan sebelum diproses — ia menyatakan
  volume, bukan nilai, dan justru itulah lembar yang dibawa ke lapangan untuk
  diperiksa.
- **CoP** baru bisa diunduh **setelah dibuat** (harga & potongannya terisi) —
  sebelum itu angkanya belum ditelaah siapa pun, dan lembar yang terlanjur
  keluar dari pencetak tidak bisa dibedakan dari yang sudah benar.

Level 1 (lapangan) tidak dapat mengunduh lembar CoP: ia memuat harga satuan
dan nilai kontrak.

<a id="dari-ponsel"></a>

## Menyetujui dari ponsel

Kedua persetujuan — **Setujui BAP** dan **Setujui CoP** — bisa dilakukan dari
aplikasi mobile lewat menu **Persetujuan CoP**. Yang masih menunggu keputusan
akan muncul dengan penanda tahapnya ("Menunggu setuju BAP" / "Menunggu setuju
CoP"). Pengisian harganya tetap di komputer kantor — tabel pagu berkolom banyak
tidak bisa diisi dengan benar sambil berjalan.

<a id="menagihkan"></a>

## Menagihkan CoP

CoP yang **sudah disetujui dan belum ditagihkan** muncul di formulir
**Pembelian** sebagai dasar tagihan. Satu CoP hanya boleh menjadi dasar SATU
pembelian yang aktif — menghapus pembeliannya membuka kembali CoP-nya dengan
sendirinya.
