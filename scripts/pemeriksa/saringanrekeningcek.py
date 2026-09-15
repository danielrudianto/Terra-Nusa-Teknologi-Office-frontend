#!/usr/bin/env python3
"""
Dua sisi satu perhitungan harus memakai SARINGAN REKENING yang sama.

KEKELIRUAN YANG DIJAGA

Kartu proyeksi kas di kalender memakai dua angka:

  * SALDO  — `dashboard/cash-position`, disaring menurut rekening yang dicentang
  * RENCANA — `payment-plans`, yang dulu TIDAK disaring sama sekali

Jadi saldonya dari rekening yang dicentang, rencananya dari seluruh rekening —
termasuk yang sengaja dikecualikan dari kalender (deposito, escrow, penampung
uang muka). Hasilnya tetap berupa angka yang masuk akal: tidak ada galat,
tidak ada yang tampak ganjil, garisnya tetap mulus. Yang salah cuma garisnya.

Daniel menemukannya dari firasat, bukan dari satu pun pesan di layar. Kelas
kekeliruan seperti itulah yang pantas dijaga pemeriksa.

DAFTAR KOSONG BUKAN "TIDAK SATU PUN"

`HttpParams` MEMBUANG larik kosong, sehingga `bankAccounts: []` sampai ke
server sebagai parameter yang tidak ada — dan penyaring yang tidak ada berarti
SELURUH rekening. Mencentang nol rekening karena itu menghasilkan angka
TERBESAR yang mungkin, kebalikan dari yang dimaksud siapa pun, tanpa apa pun di
layar yang menunjukkannya. Komponennya harus berhenti lebih dulu.

KENAPA BUKAN UJI

Yang salah bukan nilai yang dihitung melainkan ARGUMEN yang diteruskan, dan
uji komponen yang menambal kedua layanannya akan hijau apa pun argumennya —
kecuali uji itu sendiri memeriksa argumennya, yang berarti menulis pemeriksa
ini dalam bentuk lain.
"""

import re
import sys
from pathlib import Path

AKAR = Path(__file__).resolve().parents[2] / "src" / "app"
BERKAS = AKAR / "pages" / "calendar" / "proyeksi-kas" / "proyeksi-kas.component.ts"


def _tanpa_komentar(isi: str) -> str:
    """
    Membuang komentar, mempertahankan jumlah barisnya.

    Wajib: berkas ini MENJELASKAN penyaring rekeningnya di dalam komentarnya.
    Pemeriksa yang membaca komentar selalu hijau, dan pemeriksa yang selalu
    hijau tidak menjaga apa pun.
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


def periksa() -> list[str]:
    if not BERKAS.exists():
        return ["proyeksi-kas.component.ts tidak ditemukan"]

    isi = _tanpa_komentar(BERKAS.read_text(encoding="utf-8"))
    temuan: list[str] = []

    # --- daftar rekening disusun dari yang DICENTANG -----------------------
    m = re.search(
        r"const\s+(\w+)\s*=\s*\(this\.bankAccounts\s*\?\?\s*\[\]\)\s*"
        r"\.filter\(\s*\(\s*\w+\s*\)\s*=>\s*\w+\??\.selected\s*\)",
        isi,
    )
    if not m:
        return [
            "proyeksi-kas: daftar rekening tidak lagi disusun dari "
            "`bankAccounts.filter(x => x.selected)` — pemeriksa ini tidak dapat "
            "memastikan kedua sisinya sepakat, jadi perbaiki pemeriksanya "
            "bersama kodenya."
        ]
    nama = m.group(1)

    # --- saldonya memakai daftar itu --------------------------------------
    saldo = re.search(
        r"get\(\s*['\"]dashboard/cash-position['\"]\s*,\s*\{([^}]*)\}", isi
    )
    if not saldo:
        temuan.append("proyeksi-kas: pemanggilan `dashboard/cash-position` tidak ditemukan")
    elif not re.search(rf"\b{nama}\b", saldo.group(1)):
        temuan.append(
            f"proyeksi-kas: `dashboard/cash-position` tidak menerima `{nama}` — "
            f"saldonya akan mencakup SELURUH rekening, termasuk yang sengaja "
            f"dikecualikan dari kalender"
        )

    # --- rencananya memakai daftar yang SAMA ------------------------------
    rencana = re.search(r"\.rentang\(([^;]*?)\)\s*\n?\s*\.pipe", isi, re.S)
    if not rencana:
        rencana = re.search(r"planService\s*\n?\s*\.rentang\(([^)]*)\)", isi, re.S)
    if not rencana:
        temuan.append("proyeksi-kas: pemanggilan `planService.rentang` tidak ditemukan")
    elif not re.search(rf"\b{nama}\b", rencana.group(1)):
        temuan.append(
            f"proyeksi-kas: `planService.rentang` tidak menerima `{nama}` — "
            f"saldonya dari rekening yang dicentang tetapi rencananya dari "
            f"SELURUH rekening. Dua sisi satu perhitungan memakai kumpulan "
            f"rekening yang berbeda, dan hasilnya tetap angka yang masuk akal."
        )

    # --- daftar kosong dihentikan, bukan diteruskan -----------------------
    if not re.search(rf"if\s*\(\s*!\s*{nama}\.length\s*\)", isi):
        temuan.append(
            f"proyeksi-kas: tidak ada penjaga `if (!{nama}.length)` — daftar "
            f"kosong dibuang `HttpParams`, sampai ke server sebagai penyaring "
            f"yang tidak ada, dan diperlakukan sebagai SELURUH rekening. "
            f"Mencentang nol rekening menghasilkan angka terbesar yang mungkin."
        )

    return temuan


def main() -> int:
    temuan = periksa()
    if temuan:
        print("Saringan rekening tidak sepakat:\n")
        for t in temuan:
            print(f"  - {t}")
        return 1
    print("Saringan rekening: saldo dan rencana memakai daftar yang sama.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
