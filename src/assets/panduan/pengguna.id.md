# Pengguna

Membuat akun, mengatur level akses, divisi, dan izin khusus.

Menu ini menentukan siapa bisa melihat dan mengubah apa. Salah setel di sini
akibatnya bukan sekadar layar yang tidak muncul — orang bisa membuka data
yang seharusnya tidak ia lihat.

## Membuat akun

| Isian | Catatan |
|---|---|
| Nama | Nama lengkap |
| Email | Dipakai untuk masuk, harus unik |
| Kata sandi | Minimal 6 karakter |
| Level Akses | Menentukan sejauh mana ia boleh bertindak |

Kata sandi yang diisi di sini hanya untuk pertama kali. Setelah masuk,
pengguna bisa menggantinya sendiri lewat **Pengaturan → Keamanan**, tanpa
melalui admin.

## Level akses

| Level | Sebutan | Kira-kira boleh apa |
|---|---|---|
| 1 | Staff | Membaca dan membuat dokumen harian |
| 2 | Supervisor | Menambah kewenangan mengubah |
| 3 | Manager | Menyetujui sebagian dokumen |
| 4 | General Manager | Menyetujui, menghapus, membuat data induk |
| 5 | Directors & Owner | Seluruh sistem tanpa batas |

Level bekerja bertingkat: yang lebih tinggi mencakup yang lebih rendah. Tiap
modul punya syarat level sendiri untuk tiap tindakan — misalnya membaca
proyek cukup level 1, tetapi membuat dan mengubahnya butuh level 4.

## Divisi

Level menentukan **seberapa jauh**, divisi menentukan **di wilayah mana**.

Pengguna yang punya divisi hanya melihat modul milik divisinya, ditambah modul
umum yang dipakai semua orang. Yang belum punya divisi sama sekali tidak
dibatasi wilayah — hanya dibatasi levelnya.

Dua hal yang perlu diperhatikan:

**Divisi yang belum berisi modul akan mengunci, bukan membuka.** Menempatkan
seseorang di divisi kosong membuat ia hanya melihat beranda dan kalender.
Layar menandai divisi semacam itu; jangan pilih tanpa sadar.

**Level 5 dan 4 tidak diberi divisi.** Pemilik memang perlu melihat seluruh
sistem, dan General Manager wilayahnya seluruh perusahaan — bukan satu divisi.
Memberi mereka divisi hanya tampak membatasi padahal tidak.

**Slip gaji dan data karyawan mengecualikan aturan itu.** Keduanya hanya
terbuka bagi divisi HRD dan FAT, berapa pun levelnya. General Manager tidak
dapat membukanya hanya karena levelnya tinggi.

Bila memang perlu, berikan lewat divisi HRD atau izin khusus. Cara itu
meninggalkan keputusan yang tercatat di jejak audit — sedangkan akses yang
terbuka sendiri tidak pernah diputuskan siapa pun.

## Izin khusus

Di bawah divisi ada **Izin khusus** — pengecualian per modul dan per tindakan
untuk satu orang.

Gunakan sesedikit mungkin. Izin khusus tidak terlihat dari level maupun
divisinya, sehingga saat orang lain memeriksa "kenapa dia bisa membuka ini",
jawabannya tidak ada di tempat yang biasa dilihat. Kalau kebutuhannya
berulang untuk banyak orang, yang perlu diubah adalah divisinya, bukan
menambah pengecualian satu per satu.

Kolom **Hasil** dan **Alasan** menunjukkan keputusan akhir untuk kombinasi
modul dan tindakan tersebut — berguna untuk memastikan pengecualian yang baru
dipasang benar-benar berlaku.

## Menonaktifkan, bukan menghapus

Untuk orang yang sudah tidak bekerja di sini, **nonaktifkan** akunnya. Jangan
dihapus.

Dokumen yang pernah ia buat tetap menyebut namanya di riwayat aktivitas.
Menghapus akunnya membuat jejak itu menunjuk pengguna yang tidak ada, dan
pertanyaan "siapa yang membuat PO ini" jadi tidak terjawab.

## Kalau seseorang tidak melihat menu tertentu

Urutan pemeriksaannya:

1. **Levelnya cukup?** Bandingkan dengan syarat modul itu.
2. **Divisinya mencakup modul itu?** Yang punya divisi dibatasi wilayahnya.
3. **Sudah masuk ulang?** Perubahan izin baru terbaca setelah masuk kembali.

Kalau ketiganya sudah benar dan menunya tetap tidak muncul, kemungkinan
modulnya memang belum dipetakan ke divisi mana pun — itu perlu diperbaiki di
sisi sistem, bukan di layar ini.
