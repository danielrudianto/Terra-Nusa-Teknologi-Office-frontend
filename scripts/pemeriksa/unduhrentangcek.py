#!/usr/bin/env python3
"""
Unduh kalender per rentang tanggal: bentuk kode yang menjaga zona waktu.

KENAPA PEMERIKSA, BUKAN UJI

Karma di repo ini berjalan pada zona **UTC**. Seluruh kekeliruan zona waktu
di bawah menghasilkan jawaban yang BENAR di UTC dan salah di Jakarta — jadi
uji yang membandingkan hasilnya tidak dapat gagal, betapa pun telitinya
ditulis. Yang menjaga adalah bentuk kodenya, jadi bentuk kodenya yang
diperiksa di sini.

TIGA BENTUK YANG DILARANG

1. `toISOString()` pada jalur tanggal.
   Ia mengubah ke UTC lebih dulu. `Date` dari datepicker bertengger di tengah
   malam waktu setempat, jadi di UTC+7 tanggalnya SELALU mundur satu hari —
   bukan kadang-kadang. Yang memilih 1 September mengunduh mulai 31 Agustus,
   dan berkasnya tetap terbuka, tetap rapi, kurang satu hari di ujungnya.

2. `new Date('YYYY-MM-DD')` — konstruktor dari TEKS.
   Diurai sebagai tengah malam UTC. Dibandingkan dengan tanggal yang dibangun
   `new Date(y, b, h)` (waktu setempat), keduanya bergeser satu hari relatif
   terhadap satu sama lain.

3. `getUTCDate()`/`getUTCMonth()`/`getUTCFullYear()` pada jalur ini.
   Bercampur dengan pembacaan setempat, hasilnya bergeser pada separuh hari.

SATU LAGI YANG DIJAGA: batas rentangnya tidak boleh hanya ada di layar.
Dialog membatasi PILIHAN; ia tidak menghalangi siapa pun memanggil
`?start=...&end=...` sendiri. Karena itu pemanggilan unduhannya harus
meneruskan `start`/`end` ke server — yang menegakkan batasnya — dan alasan
penolakan server harus ditampilkan, bukan ditelan menjadi pesan generik.
"""

import re
import sys
from pathlib import Path

AKAR = Path(__file__).resolve().parents[2] / "src" / "app"

BERKAS_TANGGAL = [
    AKAR / "helpers" / "kalender-periode.ts",
    AKAR / "pages" / "calendar" / "unduh-kalender-dialog" / "unduh-kalender-dialog.component.ts",
]

TABEL = AKAR / "pages" / "calendar" / "calendar-table" / "calendar-table.component.ts"


def _tanpa_komentar(isi: str) -> str:
    """
    Membuang komentar, mempertahankan jumlah barisnya.

    Wajib: berkas-berkas ini MENJELASKAN kenapa `toISOString` dilarang, di
    dalam komentarnya. Pemeriksa yang membaca komentar akan selalu merah, dan
    pemeriksa yang selalu merah dimatikan orang.
    """
    keluar, i, n = [], 0, len(isi)
    while i < n:
        dua = isi[i : i + 2]
        if dua == "/*":
            j = isi.find("*/", i + 2)
            j = n if j == -1 else j + 2
            keluar.append("\n" * isi.count("\n", i, j))
            i = j
        elif dua == "//":
            j = isi.find("\n", i)
            i = n if j == -1 else j
        elif isi[i] in "'\"`":
            kutip = isi[i]
            keluar.append(isi[i])
            i += 1
            while i < n and isi[i] != kutip:
                if isi[i] == "\\" and i + 1 < n:
                    keluar.append(isi[i])
                    keluar.append(isi[i + 1])
                    i += 2
                    continue
                if isi[i] == "\n" and kutip != "`":
                    break
                keluar.append(isi[i])
                i += 1
            if i < n:
                keluar.append(isi[i])
                i += 1
        else:
            keluar.append(isi[i])
            i += 1
    return "".join(keluar)


def _baris(isi: str, pos: int) -> int:
    return isi.count("\n", 0, pos) + 1


TERLARANG = (
    (
        re.compile(r"\.toISOString\s*\("),
        "`toISOString()` mengubah ke UTC lebih dulu — tanggalnya mundur "
        "sehari di zona timur, SELALU, bukan kadang-kadang",
    ),
    (
        # `new Date('2026-09-15')` / `new Date(teks)` — satu argumen bertipe teks.
        re.compile(r"new\s+Date\s*\(\s*['\"]\d{4}-"),
        "`new Date('YYYY-MM-DD')` diurai sebagai tengah malam UTC; pakai "
        "`new Date(tahun, bulan - 1, hari)`",
    ),
    (
        re.compile(r"\.getUTC(?:Date|Month|FullYear)\s*\("),
        "pembacaan UTC bercampur dengan pembacaan setempat — hasilnya "
        "bergeser pada separuh hari",
    ),
)


def periksa() -> list[str]:
    temuan: list[str] = []

    for berkas in BERKAS_TANGGAL:
        if not berkas.exists():
            temuan.append(f"{berkas.name} tidak ditemukan")
            continue

        isi = _tanpa_komentar(berkas.read_text(encoding="utf-8"))
        rel = berkas.relative_to(AKAR)

        for pola, sebab in TERLARANG:
            for m in pola.finditer(isi):
                temuan.append(f"{rel}:{_baris(isi, m.start())}: {sebab}")

    # --- batas rentang ditegakkan di SERVER, bukan cuma di dialog ----------
    if not TABEL.exists():
        temuan.append("calendar-table.component.ts tidak ditemukan")
        return temuan

    tabel = _tanpa_komentar(TABEL.read_text(encoding="utf-8"))

    panggil = re.search(
        r"get\(\s*['\"]calendar/download['\"]\s*,\s*\{(.*?)\}", tabel, re.S
    )
    if not panggil:
        temuan.append(
            "calendar-table: pemanggilan `calendar/download` tidak ditemukan"
        )
    else:
        arg = panggil.group(1)
        for nama in ("start", "end"):
            if not re.search(rf"\b{nama}\s*:", arg):
                temuan.append(
                    f"calendar-table: `calendar/download` tidak lagi mengirim "
                    f"`{nama}` — rentangnya tidak sampai ke server, dan batas "
                    f"60 hari yang ditegakkan di sana tidak pernah berlaku"
                )

    # Rentang dipakai dari JAWABAN server, bukan dari yang dikirim peramban.
    if not re.search(r"data\??\.\s*start\s*\?\?", tabel):
        temuan.append(
            "calendar-table: rentang berkasnya tidak diambil dari "
            "`data.start`/`data.end` — kalau server memotongnya, berkasnya "
            "akan memuat baris kosong untuk hari yang datanya tidak pernah "
            "datang, dan barisnya terlihat seperti hari tanpa transaksi"
        )

    # Alasan penolakan server ditampilkan, bukan ditelan.
    if not re.search(r"err\??\.\s*status\s*===\s*400", tabel):
        temuan.append(
            "calendar-table: penolakan 400 dari server tidak lagi dibedakan — "
            "alasan yang menyebut batasnya tertelan menjadi pesan generik, "
            "dan dialognya yang akan terlihat rusak"
        )

    return temuan


def main() -> int:
    temuan = periksa()
    if temuan:
        print("Unduh kalender per rentang — temuan:\n")
        for t in temuan:
            print(f"  - {t}")
        return 1
    print("Unduh kalender per rentang: bentuk tanggal dan batas rentang utuh.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
