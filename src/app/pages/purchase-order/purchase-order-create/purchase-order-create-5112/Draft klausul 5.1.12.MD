# Draft Klausul — PO 5.1.12 Perangkat Lunak & Langganan

Bahan koreksi. Poin bertanda 🔸 adalah **usulan baru**; sisanya sudah ada dan
tidak diubah.

---

## Yang sudah ada (tetap)

1. Termin pembayaran
2. Langganan (dengan masa berlaku) **atau** beli putus
3. Perpanjangan otomatis: ya / tidak
4. Cara penyerahan lisensi (akun, kunci lisensi, dsb.)
5. Kontak PJ penjual
6. Kontak PJ pembeli
7. Lisensi aktif maksimal 3 hari kerja setelah pembayaran
8. Lampiran tata cara penagihan

Sudah cukup rapi. Yang belum tersentuh justru hal-hal yang baru terasa
**setelah** langganannya berjalan.

---

## Kenapa perlu ditambah

| Risiko                            | Terjadi ketika                                        | Sekarang     |
| --------------------------------- | ----------------------------------------------------- | ------------ |
| **Perpanjangan diam-diam**        | auto-renew menagih tanpa pemberitahuan, di harga baru | tidak diatur |
| **Akun atas nama pribadi**        | staf keluar, akunnya ikut hilang                      | tidak diatur |
| **Data tertinggal saat berhenti** | langganan berakhir, data tidak bisa diambil           | tidak diatur |
| **Jumlah pengguna membengkak**    | tagihan naik karena seat bertambah                    | tidak diatur |

Yang paling sering menggigit AKN kemungkinan yang **kedua**: akun berlisensi
didaftarkan atas email pribadi staf, lalu orangnya berhenti.

---

## 🔸 Usulan tambahan

**A. Kepemilikan akun** ← yang paling gw dorong

> Seluruh lisensi dan akun didaftarkan atas nama PT. Alpha Konstruksi
> Nusantara menggunakan alamat surel resmi perusahaan, bukan atas nama
> perorangan. Kredensial diserahkan kepada penanggung jawab PIHAK PEMBELI.

**B. Jumlah pengguna**

> Nilai pembelian ini berlaku untuk sejumlah pengguna (user/seat) yang
> tercantum dalam tabel. Penambahan pengguna di luar jumlah tersebut
> diperhitungkan sebagai pembelian tambahan dan disepakati tertulis sebelum
> diaktifkan.

**C. Pemberitahuan sebelum perpanjangan** _(hanya bila auto-renew menyala)_

> PIHAK PENJUAL wajib memberitahukan rencana perpanjangan beserta nilainya
> selambat-lambatnya 30 (tiga puluh) hari kalender sebelum periode berjalan
> berakhir. Tanpa pemberitahuan tersebut, perpanjangan otomatis tidak
> mengikat PIHAK PEMBELI.

Ini pasangan wajib dari auto-renew. Tanpanya, "diperpanjang otomatis" berarti
lo bisa ditagih di harga yang belum pernah disetujui.

**D. Perubahan harga perpanjangan** _(hanya bila auto-renew menyala)_

> Perubahan harga pada periode perpanjangan hanya berlaku setelah disetujui
> secara tertulis oleh PIHAK PEMBELI.

**E. Pengambilan data saat berakhir** _(hanya untuk langganan)_

> Pada saat langganan berakhir atau dihentikan, PIHAK PENJUAL wajib
> memberikan akses untuk mengunduh seluruh data milik PIHAK PEMBELI dalam
> format yang lazim terbaca, sekurang-kurangnya 30 (tiga puluh) hari kalender
> sejak tanggal berakhir.

**F. Kerahasiaan data**

> Data yang tersimpan dalam perangkat lunak ini merupakan milik PIHAK PEMBELI
> dan bersifat rahasia. PIHAK PENJUAL tidak diperkenankan mengakses,
> menggunakan, atau menyerahkannya kepada pihak lain selain untuk keperluan
> dukungan teknis atas permintaan PIHAK PEMBELI.

**G. Dukungan teknis**

> PIHAK PENJUAL menyediakan dukungan teknis selama masa berlaku lisensi
> melalui kontak penanggung jawab yang tercantum dalam dokumen ini.

**H. Faktur pajak** _(hanya bila PPN disertakan)_

> Untuk perangkat lunak dari penyedia luar negeri, kewajiban perpajakan
> mengikuti ketentuan yang berlaku dan disepakati tertulis sebelum pembelian.

---

## Yang perlu lo putuskan

**1. Poin B — jumlah pengguna.**
Apakah PO software lo biasanya menyebut jumlah seat di tabel? Kalau selama ini
tidak, poin ini akan merujuk ke sesuatu yang tidak ada.

**2. Poin H — pajak penyedia luar negeri.**
Software langganan sering dari luar negeri, dan perlakuan PPN-nya berbeda. Gw
tulis sangat umum karena ini wilayah konsultan pajak, bukan gw. Bisa juga
dibuang saja kalau semua vendor software lo dalam negeri.

**3. Angka 30 hari** pada poin C dan E — itu kebiasaan umum, bukan dari data
lo.

**4. Poin C dan D hanya muncul bila auto-renew menyala.** Kalau lo mau
selalu tampil, bilang.

---

## Catatan

Gw bukan pengacara. Isinya praktik lazim pembelian perangkat lunak dan
diturunkan dari pola dokumen AKN yang sudah ada. Poin yang paling berdampak
justru yang paling sederhana — **A, kepemilikan akun** — karena itu satu-satunya
yang mencegah lisensi hilang bersama orang yang berhenti.
