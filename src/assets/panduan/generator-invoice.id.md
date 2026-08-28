# Generator Invoice

Membuatkan invoice dan kuitansi untuk tenaga kerja yang tidak punya kop surat
sendiri.

Menu ini kebalikan dari Faktur Penjualan. Faktur Penjualan adalah tagihan
perusahaan **kepada klien**. Generator Invoice membuatkan dokumen tagihan
**dari pemasok perorangan kepada perusahaan** — biasanya mandor atau tukang
yang memang tidak punya format invoice sendiri.

Dokumen yang dihasilkan tetap milik pemasoknya; perusahaan hanya membuatkan
formatnya agar rapi dan seragam.

## Mengisi

### Informasi

| Isian | Catatan |
|---|---|
| Supplier | Pemasok perorangan yang menagih |
| Kode proyek | Proyek yang dibebani |
| Kota | Tempat dokumen dibuat |
| Tanggal cut-off | Batas akhir pekerjaan yang ditagihkan |
| Tanggal invoice | Tanggal dokumen |
| Nomor dokumen | Nomor invoice |

**Tanggal cut-off** berbeda dari tanggal invoice. Cut-off menandai sampai kapan
pekerjaan dihitung; tanggal invoice adalah kapan dokumennya dibuat. Keduanya
sering berbeda beberapa hari, dan yang menentukan periode pekerjaan adalah
cut-off.

### Rincian pekerjaan

Satu baris per jenis pekerjaan: volume, satuan, harga satuan, dan totalnya.

Volume boleh berdesimal — sampai **empat angka di belakang koma**. Ini untuk
pekerjaan yang volumenya memang pecahan, seperti pengeboran (mis. `12,3456`).
Yang bulat tetap tampil bersih (`7`, bukan `7,0000`).

Tulis uraian pekerjaan seperti yang disepakati di lapangan. Baris inilah yang
dibaca pemasok saat memeriksa tagihannya sendiri — kalau tidak dikenali, dia
akan bertanya, dan itu memperlambat pembayaran.

### Rekening

Nomor dan nama rekening pemasok terisi otomatis dari rekening yang **terakhir
dipakai** pemasok tersebut. Periksa lagi, jangan langsung dipercaya — pemasok
bisa berganti rekening, dan transfer ke rekening lama tidak akan kembali
sendiri.

## PPh

Pilih kode objek pajaknya, lalu sistem menampilkan tiga angka:

| Baris | Artinya |
|---|---|
| DPP | Dasar pengenaan pajak |
| PPh dipotong | Potongan sesuai tarif kode yang dipilih |
| Dibayarkan | Yang benar-benar diterima pemasok |

Beri tahu pemasok angka **Dibayarkan**, bukan DPP. Selisih karena potongan PPh
adalah sumber pertanyaan yang paling sering muncul setelah transfer masuk.

## Sekalian catat sebagai pembelian

Ada sakelar **"Sekalian catat sebagai pembelian"**. Bila dinyalakan, setelah
dokumennya dibuat sistem langsung mencatat pembelian dengan **nomor invoice
yang sama**, dan meminta nomor PO-nya.

Gunakan ini. Membuat dokumen tanpa mencatat pembeliannya berarti tagihan itu
ada di tangan pemasok tetapi tidak ada di sistem — dan biasanya baru ketahuan
saat pemasok menagih pembayaran yang tidak pernah masuk antrean.

Kalau sakelarnya dimatikan, catat pembeliannya manual lewat menu Pembelian
dengan nomor invoice yang sama persis.

## Setelah dibuat

Tombol **Unduh** menghasilkan berkas PDF berisi invoice dan kuitansi. Serahkan
ke pemasok untuk ditandatangani, lalu lampirkan kembali ke pembeliannya sebagai
bukti.
