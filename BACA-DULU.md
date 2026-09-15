# Kalender: rencana masuk perhitungan saldo

**Tidak ada perubahan skema.** Frontend saja.

> **Berkas i18n ikut** (`id/en/zh.json`) karena ada 6 kunci baru. Kalau Anda
> punya perubahan i18n lain yang belum di-commit, gabungkan — jangan timpa
> begitu saja.

---

## Dulu: Anda benar, ini belum pernah saya kerjakan

Bukan gagal deploy. Kita membahasnya, Anda mengusulkan bentuk yang lebih baik,
lalu kita belok ke panduan dan saya tidak pernah kembali. `viewMode` masih
`'expense' | 'income' | 'balance'`, dan `dataForDay()` untuk saldo hanya
memakai pembayaran + pemasukan yang SUDAH terjadi.

Peringatan rencana terlewat memang sudah ada — ingatan Anda benar.

## Yang lebih buruk, dan baru ketahuan sambil mengerjakannya

**Berkas unduhannya sudah menghitung rencana sejak dulu.** Jadi kalender di
layar dan Excel-nya melaporkan **saldo berbeda untuk bulan yang sama**,
keduanya menyebut diri "saldo", dan tidak ada yang menyebutkan bedanya.

Itu harus dibereskan bersamaan — memperbaiki layarnya saja hanya memindahkan
ketidakcocokannya ke arah lain.

---

## Mode sekarang: Pengeluaran · Saldo (rencana) · Saldo (aktual)

Persis usul Anda. `Pemasukan` dilepas — pemasukan per hari sudah terbaca dari
selisih saldo, dan mode yang jarang dibuka membuat dua mode yang penting jadi
lebih jauh dijangkau. Bilang kalau ternyata dipakai; mengembalikannya mudah.

| mode | dasar | untuk apa |
|---|---|---|
| **Pengeluaran** | seperti dulu | "hari ini bayar apa saja" |
| **Saldo (rencana)** | realisasi **+ rencana kas yang masih menunggu** | **memutuskan**: bulan ini kasnya sampai atau tidak |
| **Saldo (aktual)** | realisasi saja | mencocokkan ke rekening |

Merahnya justru intinya: hari pertama saldo menembus nol adalah satu-satunya
angka yang benar-benar dicari orang di layar ini.

---

## Tiga keputusan yang saya ambil — silakan tolak yang mana pun

**1. Rencana TERLEWAT ikut dihitung.**
Sesuai kata Anda: *"gapapa lanjut aja bang perhitungannya, minus minus deh ga
masalah."* Rencana yang terlewat bukan rencana yang batal — ia kewajiban yang
belum dikerjakan. Spanduk peringatannya tetap ada, jadi ia dihitung **tanpa**
menjadi tidak terlihat.

**Ini juga mengubah ringkasan bulanan.** Sebelumnya yang terlewat disaring
keluar dari total rencana. Kalau dibiarkan, ringkasan bulan dan saldo di kisi
kalender akan melaporkan dua angka berbeda dari data yang sama.

**2. Saldo kini AKHIR hari, bukan awal hari.**
Yang lama mengecualikan transaksi hari itu sendiri. Untuk mode yang ada justru
supaya orang tahu *"tanggal 30 kasnya cukup atau tidak"*, angka yang belum
memperhitungkan pembayaran tanggal 30 tidak dapat menjawabnya — dipnya baru
terlihat di sel berikutnya, dan pada hari terakhir bulan tidak terlihat sama
sekali.

> Angka "Saldo" karena itu **akan bergeser** dari yang biasa Anda lihat.
> Disengaja. Kalau Anda lebih suka yang lama, bilang — satu baris.

**3. Perbandingan tanggalnya diperbaiki (ini bug, bukan pilihan).**
Yang lama:

```ts
new Date(x.date).getTime() < new Date(tahun, bulan, hari).getTime()
```

Ruas kiri mengurai `"2026-09-15"` sebagai tengah malam **UTC**; ruas kanan
membangun tengah malam **waktu setempat**. Di Jakarta (UTC+7) transaksi hari
itu jatuh pukul 07:00 setempat sehingga **tidak ikut**; di zona barat UTC ia
**ikut**. Saldo yang sama memberi angka berbeda tergantung jam komputer yang
membukanya, tanpa satu pun galat. Sekarang dibandingkan sebagai teks
`'YYYY-MM-DD'`, yang tidak punya zona waktu untuk salah.

---

## Unduhan: ikut mode yang sedang dipilih (pilihan Anda)

Konsekuensinya yang harus diakui: **dua orang dapat mengunduh "kalender
September" dan mendapat angka berbeda.** Itu dapat diterima selama berkasnya
mengatakannya — yang tidak dapat diterima adalah dua angka berbeda yang
keduanya menyebut diri "saldo". Jadi modenya disebut di tiga tempat:

- **nama berkas** — `Kalender_Kas_September_2026_rencana.xlsx` vs `..._aktual.xlsx`
  (dua berkas berbeda tidak lagi saling menimpa di folder yang sama)
- **kop tiap lembar Excel**, di baris bawah judul
- **kop tiap halaman PDF** — jadi ikut terbawa pada lembar yang dicetak
  terpisah dari halaman pertamanya

Lembar "Rencana Kas" tetap ada di kedua mode: ia mendaftar rencana sebagai
rencana, tidak mengubah saldo mana pun.

---

## Penjaga

`scripts/pemeriksa/kalendersaldocek.py`. Dibuktikan menggigit:

```
gate `ikutRencana` dibekukan → "unduhan tidak lagi menurunkan `ikutRencana`
                                dari `viewMode` — berkas dan layar akan
                                melaporkan saldo berbeda"
kembali memakai `Date`       → "perbandingan tanggalnya jadi bergantung zona
                                waktu" (2 temuan)
`modeLabel` dicabut dari
  SATU lembar saja           → "`lembarHarian` tidak menerima `modeLabel`"
mode dilepas dari nama berkas→ "dua unduhan dengan angka berbeda akan bernama
                                sama persis"
```

Build frontend bersih; `terjemahcek` 0 kunci belum diterjemahkan.

---

## Yang belum

Panduan kalender belum menyebut mode barunya — itu bagian dari antrean panduan
yang sedang saya kerjakan (Tender → slip gaji → CoP → proyek & kalender).
