# Draft Pembelian

Menyiapkan data pembelian lebih dulu, sebelum berkasnya lengkap.

Draft dipakai saat pembelian sudah pasti terjadi tetapi belum semua yang
dibutuhkan Pembelian tersedia — misalnya jatuh tempo belum disepakati atau
rekening tujuan belum dikirim pemasok. Isi seadanya dulu di sini, lengkapi
nanti lewat konversi.

## Kapan pakai draft, kapan langsung Pembelian

Pakai **Pembelian** langsung kalau invoice, salinan PO, dan data pembayaran
sudah lengkap di tangan.

Pakai **Draft Pembelian** kalau belum. Draft tidak menuntut jatuh tempo dan
data rekening, jadi datanya tidak menggantung di catatan pribadi sambil
menunggu berkas menyusul.

## Mengisi draft

Isiannya lebih ringkas daripada Pembelian:

| Isian | Wajib | Catatan |
|---|---|---|
| Deskripsi | Ya | Keterangan singkat isi pembelian |
| Nama Faktur Pajak | Tidak | Maksimal 17 karakter |
| Pemasok | Ya | Pilih dari daftar |
| Tanggal | Ya | Tanggal invoice atau kesepakatan |
| Nama Purchase Order | Ya | Format sama dengan Pembelian |
| Proyek | Ya | Terisi otomatis dari nomor PO |
| DPP, PPN, PBBKB | Ya | Boleh angka sementara, bisa diubah saat konversi |

Format nomor PO-nya sama persis dengan yang di Pembelian — nomor urut, jenis
dokumen, kode proyek, lalu tipe biaya. Proyek dan tipe biaya terisi sendiri
begitu nomornya cocok.

Perhatikan: draft **tidak** menanyakan jatuh tempo, lampiran, maupun rekening
tujuan. Ketiganya baru diminta saat konversi.

## Mengkonversi jadi pembelian

Setelah berkasnya lengkap, buka draft lalu pilih **Konversi ke pembelian**.

Yang terjadi: data yang sudah ada dipindahkan, lalu sistem meminta bagian yang
belum pernah diisi — jatuh tempo, lampiran, dan data pembayaran. Nilai DPP,
PPN, dan lainnya masih bisa dikoreksi di tahap ini, jadi angka sementara di
draft bukan masalah.

Sesudah dikonversi, catatannya hidup sebagai Pembelian biasa dan mengikuti
seluruh aturan di panduan Pembelian — termasuk status Siap yang tidak bisa
dibatalkan.

## Menghapus draft

Draft yang batal dibeli sebaiknya dihapus, bukan dibiarkan menumpuk. Draft
yang menggantung lama membuat daftar sulit dibaca dan gampang tertukar dengan
yang benar-benar menunggu berkas.
