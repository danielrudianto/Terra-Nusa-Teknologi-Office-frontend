"""
Saldo kalender: satu dasar perhitungan, dan berkasnya menyebutkannya.

DUA HAL YANG PERNAH SALAH DI SINI, KEDUANYA TANPA GALAT

1. LAYAR DAN BERKAS MELAPORKAN SALDO BERBEDA.

   Berkas unduhan sudah menghitung rencana kas ke dalam saldo berjalan;
   layarnya tidak pernah. Jadi "Kalender September" di layar dan "Kalender
   September" di Excel menyebut dua angka berbeda, keduanya menyebut diri
   saldo, dan tidak ada yang menyebutkan bedanya. Yang menemukannya harus
   menebak mana yang dimaksud — dan tebakan itu tidak pernah dicatat
   di mana pun.

   Sekarang berkasnya MENGIKUTI mode yang sedang dibuka, dan mode itu dicetak
   pada kop tiap lembar serta pada nama berkasnya. Penjaga ini menuntut
   keduanya tetap terpasang.

2. PERBANDINGAN TANGGAL LEWAT `Date` — hasilnya bergantung zona waktu.

       new Date(x.date).getTime() < new Date(tahun, bulan, hari).getTime()

   Ruas kiri mengurai "2026-09-15" sebagai tengah malam UTC; ruas kanan
   membangun tengah malam waktu setempat. Di Jakarta (UTC+7) transaksi hari
   itu jatuh pukul 07:00 setempat sehingga TIDAK ikut dihitung; di zona barat
   UTC ia ikut. Saldo yang sama memberi angka berbeda tergantung jam komputer
   yang membukanya.

   Perbandingan 'YYYY-MM-DD' sebagai teks tidak punya zona waktu untuk salah.
"""

import os
import re
import sys

AKAR = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
TABEL = os.path.join(
    AKAR, 'src', 'app', 'pages', 'calendar', 'calendar-table',
    'calendar-table.component.ts',
)


def _tanpa_komentar(s: str) -> str:
    """Komentar dibuang: penjaga tidak boleh hijau karena penjelasan."""
    s = re.sub(r'/\*.*?\*/', '', s, flags=re.S)
    s = re.sub(r'(?m)//.*$', '', s)
    return s


def periksa():
    masalah = []
    if not os.path.exists(TABEL):
        return ['calendar-table.component.ts tidak ditemukan']

    s = _tanpa_komentar(open(TABEL, errors='ignore').read())

    # --- 1. saldo dibandingkan sebagai teks, bukan lewat Date -------------
    if not re.search(r"slice\(0,\s*10\)\s*<=", s):
        masalah.append(
            'calendar-table: saldo tidak lagi membandingkan tanggal sebagai '
            "teks ('YYYY-MM-DD' <= 'YYYY-MM-DD') — kalau kembali lewat "
            '`Date`, hasilnya bergantung zona waktu komputer yang membukanya'
        )

    saldo = re.search(r'private saldoSampai\([^)]*\)[^{]*\{(.*?)\n  \}', s, re.S)
    if not saldo:
        masalah.append('calendar-table: `saldoSampai` tidak ada')
    elif re.search(r'new Date\(', saldo.group(1)):
        masalah.append(
            'calendar-table: `saldoSampai` memakai `new Date(...)` — '
            'perbandingan tanggalnya jadi bergantung zona waktu'
        )

    # --- 2. berkas mengikuti mode ----------------------------------------
    if not re.search(r"const ikutRencana = this\.viewMode !== 'balance-actual'", s):
        masalah.append(
            'calendar-table: unduhan tidak lagi menurunkan `ikutRencana` dari '
            '`viewMode` — berkas dan layar akan melaporkan saldo berbeda tanpa '
            'ada yang menyebutkannya'
        )

    if not re.search(r'for \(const r of ikutRencana \? this\.rencanaMenunggu : \[\]\)', s):
        masalah.append(
            'calendar-table: rencana tidak lagi disaring oleh `ikutRencana` '
            'saat menyusun berkas — mode "aktual" akan tetap menghitung '
            'rencana ke dalam saldonya'
        )

    # --- 3. modenya DISEBUTKAN di berkasnya -------------------------------
    if 'modeLabel' not in s:
        masalah.append(
            'calendar-table: `modeLabel` hilang — berkasnya tidak lagi '
            'menyebut dasar perhitungannya, padahal dua orang dapat mengunduh '
            'bulan yang sama dan mendapat angka berbeda'
        )
    else:
        # setiap lembar + PDF harus menerimanya; satu yang tertinggal
        # menghasilkan berkas yang sebagian lembarnya diam soal modenya.
        kurang = [
            nama for nama, pola in (
                ('lembarHarian', r'lembarHarian\([^;]*modeLabel'),
                ('lembarRencana', r'lembarRencana\([^;]*modeLabel'),
                ('lembarKalender', r'lembarKalender\((?:[^;]|\n)*?modeLabel'),
                ('berkasKalenderPdf', r'berkasKalenderPdf\((?:[^;]|\n)*?modeLabel'),
            ) if not re.search(pola, s, re.S)
        ]
        for nama in kurang:
            masalah.append(
                f'calendar-table: `{nama}` tidak menerima `modeLabel` — '
                'lembar itu tidak menyebut dasar perhitungannya'
            )

    if not re.search(r"ikutRencana \? 'rencana' : 'aktual'", s):
        masalah.append(
            'calendar-table: mode tidak ikut ke NAMA BERKAS — dua unduhan '
            'dengan angka berbeda akan bernama sama persis, dan yang satu '
            'menimpa yang lain di folder yang sama tanpa ada yang sadar'
        )

    return masalah


if __name__ == '__main__':
    h = periksa()
    print(f'saldo kalender: {len(h)}')
    print()
    for x in h:
        print(f'  {x}')
    sys.exit(1 if h else 0)
