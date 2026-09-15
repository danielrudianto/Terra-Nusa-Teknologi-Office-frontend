# Arus kas proyek — FRONTEND

**Pasang paket BACKEND dulu** (`terrabot-arus-kas-backend.zip`) — layar ini
memanggil rutenya, dan tanpa itu tabnya akan selalu kosong.

> **Sudah termasuk perbaikan jarak antar kartu** yang Anda minta. Kalau
> `terrabot-jarak-kartu.zip` sudah dipasang, timpa saja.

> **Berkas i18n ikut** (`id/en/zh.json`) karena ada 14 kunci baru. Kalau ada
> perubahan i18n lain yang belum di-commit, gabungkan — jangan timpa mentah.

---

## Bentuknya: kartu bertab, bukan tab keempat di atas

Halaman laporan proyek **sudah** punya bilah tab (Ikhtisar / Arus per minggu).
Yang baru ini **tidak** digabung ke sana. Kartu "Kemajuan pekerjaan" yang jadi
kartu bertab:

```
┌─ Arus kas proyek ───────────────────────────────┐
│  [ Arus kas ] [ Progress vs pengeluaran ]       │
│  KPI · keterangan cakupan · grafik garis        │
└─────────────────────────────────────────────────┘
```

**Kenapa bukan satu bilah berisi empat:** bilah atas memilah *rincian biaya*
dan tunduk pada saringan tahun serta KPI di atasnya. Bilah ini memilah *dua
cara menilai kesehatan proyek*. Digabung, saringan tahun di atasnya tampak
berlaku untuk keempatnya — padahal tidak.

Bentuk bilahnya **sengaja dibedakan**: bilah halaman berupa pil penuh berlatar
brand, bilah kartu hanya garis bawah. Dua bilah yang tampak persis sama pada
satu layar membuat orang mengira keduanya setingkat.

Bilah tab hanya digambar bila **keduanya** dapat dibuka. Bagi divisi yang cuma
punya salah satunya, bilah dengan satu tombol hanya menyiratkan ada sesuatu
yang disembunyikan.

---

## Grafiknya: tiga garis

| garis | apa |
|---|---|
| Kas masuk | penerimaan bulan itu |
| Kas keluar | pembayaran bulan itu |
| **Saldo kas** | posisi kas proyek, kumulatif — **tebal & terisi** |

Ketiganya setara secara visual membuat mata berpindah-pindah tanpa tahu mana
yang harus dibaca. **Saldo adalah jawabannya; masuk dan keluar adalah
sebabnya.**

**Sumbu Y tidak dikunci mulai nol** — kebalikan dari kurva S, dan disengaja.
Saldo kas proyek memang bisa minus, dan justru itu yang dicari. Garis nolnya
dipertegas; perpotongan dengannya adalah inti grafiknya. Bulan pertama saldo
menembus nol juga **disebut sebagai teks** ("Mulai minus sejak Feb 26") —
yang membuka laporan dari layar kecil tidak dapat membaca perpotongan garis
dengan mata.

### Bulanan, bukan mingguan

Tab "arus per minggu" membaca gerak belanja; mingguan tepat di sana. Arus kas
dibaca sepanjang umur proyek — dua tahun mingguan adalah seratus titik lebih,
dan garis sepadat itu berhenti menunjukkan bentuk apa pun.

**Bulan kosong tetap digambar.** Kalau dilewati, Januari dan Juni jadi dua
titik bersebelahan dan kemiringan garis di antaranya berbohong: lima bulan
tanpa penerimaan terbaca sebagai penurunan yang landai.

---

## Satu hal yang hanya ketahuan dengan MERENDER grafiknya

Saya render grafiknya di Chromium sungguhan, dan `tension: 0.25` — nilai yang
dipakai kurva S — membuat chart.js melengkungkan garis **melewati titik
datanya**. Pada deret yang turun ke nol lalu naik lagi (bulan tanpa
penerimaan, yang di sini biasa), lengkungannya **tercelup di bawah nol**: garis
"kas masuk" menggambar penerimaan negatif yang tidak pernah ada.

Diganti `cubicInterpolationMode: 'monotone'` — tetap melengkung, tidak pernah
melampaui datanya. Diukur ulang: titik kendali kurvanya tidak lagi menembus
garis nol.

> **Kurva S punya cacat yang sama** (`tension: 0.25`, dan persen juga tidak
> pernah negatif). **Tidak saya ubah** — itu grafik yang sudah Anda pakai, dan
> saya tidak mau mengubah bentuknya tanpa Anda tahu. Satu baris kalau mau.

---

## Kalau modulnya tidak dipegang divisinya

Rutenya dijaga `payment_outgoing` (level 3). Yang tidak berhak mendapat 403,
dan **tabnya disembunyikan** — bukan kartu kosong, bukan spanduk merah.
Laporan biayanya tetap utuh.

Pilihan tab bertahan antar proyek, jadi ada penjagaan tambahan: tab yang
terkunci tidak pernah menjadi tab aktif. Tanpa itu, yang pernah memilih "arus
kas" lalu membuka proyek dengan modulnya terkunci akan melihat kartu kosong
tanpa satu pun penjelasan.

---

## Uji & penjaga

**42 spec lolos** pada halaman proyek (dari 28); `arus-kas.spec.ts` menyumbang
14. Build bersih, `terjemahcek` 0.

Dibuktikan menggigit:

```
bulan kosong dilewati        → "Expected $.length = 2 to equal 3"
tanggal diurai lewat Date    → "Expected 673 to be 1"   (Date(null) = 1970)
nominal negatif dibiarkan    → "Expected -40 to be 40"
```

### Satu spec yang saya sebut jujur di dalamnya

Uji "tanggal batas bulan" **tidak dapat gagal** di sini: Karma berjalan pada
zona UTC, jadi `new Date('2026-09-01')` memberi jawaban yang sama dengan
pemotongan teks. Yang benar-benar menjaga zona waktu adalah **bentuk kodenya**,
dan itulah yang dijaga `scripts/pemeriksa/aruskascek.py`. Saya tulis
peringatannya di dalam spec-nya supaya tidak ada yang mengira zona waktu sudah
terjaga oleh uji.

`aruskascek.py` juga menjaga penjaga izinnya — menurunkannya ke `purchase`
membuat **seluruh uji tetap hijau**. Dibuktikan menggigit:

```
penjaga diturunkan ke purchase → "rute arus kas TIDAK dijaga payment_outgoing"
titikKas kembali memakai Date  → "pengemberan bulannya bergantung zona waktu"
arusKasTerkunci dari galat apa pun → "galat lain ikut menyembunyikan tabnya"
```
